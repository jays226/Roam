'use client';

import {useEffect,useState} from 'react';
import Link from 'next/link';
import {ArrowRight,Bell,Check,Mountain,Users} from 'lucide-react';
import AppNav from '@/components/app-nav';
import {Skeleton} from '@/components/skeleton';

type Event={id:string;trip_id:string;user_id:string|null;event_type:string;created_at:string;metadata:Record<string,unknown>;users:{first_name:string}|null;trips:{name:string;invite_code:string}|null;is_notification?:boolean;read_at?:string|null};
const labels:Record<string,(name:string)=>string>={
  trip_created:name=>`${name} started a trip`,joined:name=>`${name} joined the trip`,
  responded_in:name=>`${name} is in`,responded_out:name=>`${name} can’t make it`,
  payment_marked_sent:name=>`${name} marked their deposit as sent`,payment_confirmed:name=>`${name}’s deposit was confirmed`,
  vote_opened:name=>`${name} opened a group vote`,vote_cast:name=>`${name} voted`,decision_locked:name=>`${name} locked in a decision`,
  chat_message:name=>`${name} sent a trip message`,suggestion_made:name=>`${name} suggested an idea`,
  itinerary_item_added:name=>`${name} added to the itinerary`,itinerary_ai_generated:name=>`${name} generated an itinerary`,
  booking_requested:name=>`${name} asked Roam for booking help`,booking_status_updated:name=>`${name} updated a booking`,
  expense_added:name=>`${name} added a shared expense`,activity_joined:name=>`${name} joined an activity`,
  auto_out:name=>`${name} was marked out after the deadline`,poke_sent:name=>`${name} sent a trip nudge`,
  trip_day_cities_saved:name=>`${name} updated the city plan`,template_published:name=>`${name} shared a trip to Explore`,
  template_used:name=>`${name} used an Explore trip`,travel_details_saved:name=>`${name} added travel details`,reminder_queued:name=>`${name} has a new trip reminder`
};
function describe(event:Event){if(event.is_notification)return String(event.metadata.title||'Trip reminder');const who=event.users?.first_name||'Someone';return (labels[event.event_type]||((name:string)=>`${name} updated the trip`))(who)}

export default function Activity(){
  const [events,setEvents]=useState<Event[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
  async function markAllRead(){await fetch('/api/activity',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({all:true})});setEvents(current=>current.map(event=>event.is_notification?{...event,read_at:new Date().toISOString()}:event))}
  useEffect(()=>{fetch('/api/activity',{cache:'no-store'}).then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.error||'Could not load activity.');setEvents(data)}).catch(e=>setError(e instanceof Error?e.message:'Could not load activity.')).finally(()=>setLoading(false))},[]);
  return <main className="shell"><header className="row page-header"><Link className="brand" href="/trips"><Mountain color="var(--roam-orange)"/><b>roam</b></Link><span className="eyebrow">YOUR CREW, IN MOTION</span></header><section className="section"><div className="page-title-row"><div><div className="eyebrow">ACROSS ALL YOUR TRIPS</div><h1 className="page-title">Activity</h1><p className="muted">The latest from the trips you’re part of.</p></div><div className="activity-header-actions"><Bell color="var(--roam-orange)"/>{events.some(event=>event.is_notification&&!event.read_at)&&<button className="btn ghost" onClick={()=>void markAllRead()}>Mark all read</button>}</div></div>
    {loading&&<div className="skeleton-stack"><Skeleton className="skeleton-card"/><Skeleton className="skeleton-card"/><Skeleton className="skeleton-card"/></div>}
    {error&&<div className="card" role="alert"><h2>Activity didn’t load</h2><p className="muted">{error}</p><button className="btn secondary" onClick={()=>location.reload()}>Try again</button></div>}
    {!loading&&!error&&events.length===0&&<div className="empty-state"><div className="avatar"><Check size={18}/></div><h2>You’re all caught up</h2><p className="muted">Trip decisions and updates will show up here.</p><Link href="/trips" className="btn">See your trips <ArrowRight size={16}/></Link></div>}
    <div className="activity-list">{events.map(event=><Link className={`activity-item ${event.is_notification&&!event.read_at?'unread':''}`} href={event.is_notification&&typeof event.metadata.href==='string'?event.metadata.href:event.trips?`/t/${event.trips.invite_code}`:'/trips'} onClick={()=>{if(event.is_notification)void fetch('/api/activity',{method:'PATCH',keepalive:true,headers:{'content-type':'application/json'},body:JSON.stringify({ids:[event.id.replace('notification-','')]})})}} key={event.id}><span className="activity-icon"><Users size={17}/></span><span className="activity-copy"><b>{describe(event)}</b><small className="muted">{event.metadata.body?`${event.metadata.body} · `:''}{event.trips?.name||'Roam'} · {new Date(event.created_at).toLocaleString()}</small></span><ArrowRight size={16} className="muted"/></Link>)}</div>
  </section><AppNav active="activity"/></main>;
}
