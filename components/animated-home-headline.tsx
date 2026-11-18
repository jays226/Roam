'use client';

import {motion,useReducedMotion} from 'motion/react';

const lines=[['From','group'],['chat','to','getaway']];

export default function AnimatedHomeHeadline(){
  const reduce=useReducedMotion();
  return <h1 aria-label="From group chat to getaway.">
    {lines.map((line,lineIndex)=><span className="home-headline-line" aria-hidden="true" key={lineIndex}>
      {line.map((word,wordIndex)=><motion.span className="home-headline-word" key={word} initial={reduce?{opacity:0}:{opacity:0,y:32,filter:'blur(6px)'}} animate={{opacity:1,y:0,filter:'blur(0px)'}} transition={reduce?{duration:.12}:{duration:.62,delay:.12+lineIndex*.13+wordIndex*.07,ease:[.22,1,.36,1]}}>{word}</motion.span>)}
      {lineIndex===1&&<motion.span className="home-headline-word home-headline-period" aria-hidden="true" initial={reduce?{opacity:0}:{opacity:0,y:32,filter:'blur(6px)'}} animate={{opacity:1,y:0,filter:'blur(0px)'}} transition={reduce?{duration:.12}:{duration:.62,delay:.56,ease:[.22,1,.36,1]}}>.</motion.span>}
    </span>)}
  </h1>;
}
