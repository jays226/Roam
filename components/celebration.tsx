'use client';

import {useEffect,useState} from 'react';
import {motion,useReducedMotion} from 'motion/react';

const pieces=Array.from({length:14},(_,index)=>index);
export default function Celebration({active}:{active:boolean}){
  const [visible,setVisible]=useState(false),reduce=useReducedMotion();
  useEffect(()=>{if(!active||reduce)return;setVisible(true);const timer=setTimeout(()=>setVisible(false),1500);return()=>clearTimeout(timer)},[active,reduce]);
  if(!visible)return null;
  return <div className="celebration" aria-hidden="true">{pieces.map(index=><motion.i key={index} initial={{opacity:1,y:0,x:0,rotate:0,scale:.7}} animate={{opacity:0,y:55+(index%5)*12,x:((index*37)%120)-60,rotate:index*47,scale:1}} transition={{duration:1+(index%4)*.08,ease:'easeOut'}}/>)}</div>;
}
