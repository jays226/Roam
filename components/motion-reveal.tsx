'use client';

import type {ReactNode} from 'react';
import {motion,useReducedMotion} from 'motion/react';

export default function MotionReveal({children,className='',delay=0}:{children:ReactNode;className?:string;delay?:number}){
  const reduce=useReducedMotion();
  return <motion.div className={className} initial={reduce?false:{opacity:0,y:14,scale:.99}} whileInView={{opacity:1,y:0,scale:1}} viewport={{once:true,amount:.12}} transition={{duration:reduce ? 0.16 : 0.24,delay:reduce?0:delay,ease:'easeOut'}}>{children}</motion.div>;
}
