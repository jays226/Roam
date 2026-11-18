'use client';

import Image from 'next/image';
import {useEffect,useRef,useState} from 'react';
import {AnimatePresence,motion,useReducedMotion,useScroll,useTransform} from 'motion/react';
import type {RoamPhoto} from '@/lib/photos';

export default function DestinationPhoto({query,children,className='',imageIndex=0,alt='',priority=false,rotating=false,photoOverride=null}:{query:string;children?:React.ReactNode;className?:string;imageIndex?:number;alt?:string;priority?:boolean;rotating?:boolean;photoOverride?:RoamPhoto|null}){
  const [photos,setPhotos]=useState<RoamPhoto[]>([]);
  const [rotation,setRotation]=useState(0),target=useRef<HTMLDivElement>(null),reduceMotion=useReducedMotion();
  const {scrollYProgress}=useScroll({target,offset:['start end','end start']});
  const scale=useTransform(scrollYProgress,[0,1],reduceMotion?[1,1]:[1.08,1]);
  const parallaxY=useTransform(scrollYProgress,[0,1],reduceMotion?[0,0]:[22,-22]);
  useEffect(()=>{if(photoOverride)return;let active=true;fetch(`/api/photos?q=${encodeURIComponent(query)}`,{cache:'force-cache'}).then(r=>r.json()).then(result=>{if(active)setPhotos(result.photos||[])}).catch(()=>{});return()=>{active=false}},[query,photoOverride]);
  useEffect(()=>{if(!rotating||photos.length<2||reduceMotion)return;const timer=setInterval(()=>setRotation(value=>(value+1)%photos.length),8500);return()=>clearInterval(timer)},[rotating,photos.length,reduceMotion]);
  const photo=photoOverride||(photos.length?photos[(imageIndex+rotation)%photos.length]:null);
  const blur=photo?.color?`data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 20"><rect width="32" height="20" fill="${photo.color}"/></svg>`)}`:undefined;
  return <div ref={target} className={`destination-photo ${photo?'has-photo':''} ${className}`} style={photo?.color?{'--photo-color':photo.color} as React.CSSProperties:undefined}>
    {photo&&<motion.div className="destination-photo-parallax" style={priority?{scale,y:parallaxY}:undefined}><AnimatePresence initial={false} mode="sync"><motion.div key={photo.id} className="destination-photo-image-wrap" initial={reduceMotion?{opacity:0}:{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:reduceMotion ? 0.12 : 0.7,ease:'easeInOut'}}><Image src={photo.url} alt={alt||query} fill sizes="(max-width: 700px) 100vw, 1100px" className="destination-photo-image" priority={priority} placeholder={blur?'blur':'empty'} blurDataURL={blur}/></motion.div></AnimatePresence></motion.div>}
    <div className="destination-photo-overlay"/>{children}
    {photo&&<a className="photo-credit" href={photo.sourceUrl} target="_blank" rel="noreferrer">Photo by {photo.photographer} on {photo.provider==='unsplash'?'Unsplash':'Pexels'}</a>}
  </div>;
}
