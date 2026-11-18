'use client';

import Link from 'next/link';
import {ArrowLeft,CalendarDays,Mountain} from 'lucide-react';
import Image from 'next/image';
import DestinationPhoto from '@/components/destination-photo';

export type TripTab='overview'|'plan'|'crew'|'money'|'chat';
type Member={user_id:string;role:string;users:{first_name:string}|null};
type Trip={name:string;destination:string|null;start_date:string|null;end_date:string|null;invite_code:string;cover_image?:string|null;date_mode?:string;window_start?:string|null;window_end?:string|null;nights?:number|null};
const tabs:[TripTab,string,string][]=[['overview','Overview',''],['plan','Plan','/plan'],['crew','Crew','/crew'],['money','Money','/money'],['chat','Chat','/chat']];

export default function TripHeader({trip,members=[],active}:{trip:Trip;members?:Member[];active:TripTab}){
  const dates=trip.date_mode==='window'&&trip.window_start?`Around ${new Date(`${trip.window_start}T12:00:00`).toLocaleDateString('en-US',{month:'short',day:'numeric'})}${trip.window_end?`–${new Date(`${trip.window_end}T12:00:00`).toLocaleDateString('en-US',{month:'short',day:'numeric'})}`:''}${trip.nights?` · ${trip.nights} nights`:''}`:trip.start_date?`${new Date(`${trip.start_date}T12:00:00`).toLocaleDateString('en-US',{month:'short',day:'numeric'})}${trip.end_date?`–${new Date(`${trip.end_date}T12:00:00`).toLocaleDateString('en-US',{month:'short',day:'numeric'})}`:''}`:'Dates flexible';
  return <div className="trip-navigation">
    <header className="trip-header">
      {trip.cover_image?<Link href={`/t/${trip.invite_code}`} className="trip-cover-thumb" aria-label="Back to trip overview"><Image src={trip.cover_image} alt={`${trip.name} cover`} fill sizes="58px"/></Link>:<DestinationPhoto query={trip.destination||trip.name} className="trip-cover-thumb" alt={`${trip.destination||trip.name} trip cover`}><Mountain size={18}/></DestinationPhoto>}
      <div className="trip-header-copy"><Link href="/trips" className="trip-back"><ArrowLeft size={14}/> Trips</Link><h1>{trip.name}</h1><div className="trip-header-meta"><span>{trip.destination||'Destination TBD'}</span><span>·</span><span><CalendarDays size={13}/>{dates}</span></div></div>
      {members.length>0&&<div className="trip-header-avatars" aria-label={`${members.length} trip members`}>{members.slice(0,5).map(m=><span className="avatar" key={m.user_id} title={m.users?.first_name||'Member'}>{m.users?.first_name?.[0]||'?'}</span>)}{members.length>5&&<span className="avatar avatar-more">+{members.length-5}</span>}</div>}
    </header>
    <nav className="trip-tabs" aria-label="Trip sections">{tabs.map(([id,label,suffix])=><Link key={id} href={`/t/${trip.invite_code}${suffix}`} className={active===id?'active':''} aria-current={active===id?'page':undefined}>{label}</Link>)}</nav>
  </div>;
}
