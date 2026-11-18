'use client';

import type {ReactNode} from 'react';
import {motion,useReducedMotion} from 'motion/react';

type RevealDirection='up'|'left'|'right'|'scale';

export default function MotionReveal({children,className='',delay=0,direction='up'}:{children:ReactNode;className?:string;delay?:number;direction?:RevealDirection}){
  const reduce=useReducedMotion();
  const offsets={up:{y:24,x:0,scale:.98},left:{y:0,x:-28,scale:1},right:{y:0,x:28,scale:1},scale:{y:0,x:0,scale:.94}};
  const offset=offsets[direction];
  return <motion.div className={className} initial={reduce?{opacity:0}:{opacity:0,...offset}} whileInView={{opacity:1,x:0,y:0,scale:1}} viewport={{once:true,amount:.16,margin:'0px 0px -36px 0px'}} transition={reduce?{duration:.16}:{type:'spring',stiffness:115,damping:20,delay}}>{children}</motion.div>;
}
