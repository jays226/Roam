'use client';

import Link from 'next/link';
import {Bell,Compass,Mountain,UserRound} from 'lucide-react';

const items=[
  {id:'trips',label:'Trips',href:'/trips',Icon:Mountain},
  {id:'activity',label:'Activity',href:'/activity',Icon:Bell},
  {id:'explore',label:'Explore',href:'/explore',Icon:Compass},
  {id:'profile',label:'Profile',href:'/profile',Icon:UserRound}
] as const;

export type AppNavItem=typeof items[number]['id'];

export default function AppNav({active}:{active:AppNavItem}){
  return <nav className="nav" aria-label="Main navigation">
    {items.map(({id,label,href,Icon})=><Link key={id} href={href} className={active===id?'active':''} aria-current={active===id?'page':undefined}>
      <Icon size={19}/><span>{label}</span>
    </Link>)}
  </nav>;
}
