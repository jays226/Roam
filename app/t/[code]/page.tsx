import {db} from '@/lib/supabase';
import {currentUserId} from '@/lib/session';
import Invite from './view';
import type {OverviewData} from './view';
import type {Metadata} from 'next';
import {getRoamPhotoById} from '@/lib/photos';

type Params={params:Promise<{code:string}>};
export async function generateMetadata({params}:Params):Promise<Metadata>{
  try{
    const {code}=await params;
    const {data}=await db().from('trips').select('name,destination,created_by').eq('invite_code',code).maybeSingle();
    if(!data)return {title:'Trip invite · Roam'};
    const {data:creator}=await db().from('users').select('first_name').eq('id',data.created_by).maybeSingle();
    const title=`${data.name} · Roam`;
    const description=`${creator?.first_name||'Your friend'} invited you to plan ${data.destination?`a trip to ${data.destination}`:'a group trip'}. Join your crew on Roam.`;
    return {title,description,openGraph:{title,description,images:[{url:`/t/${code}/opengraph-image`,width:1200,height:630}]},twitter:{card:'summary_large_image',title,description,images:[`/t/${code}/opengraph-image`]}};
  }catch{return {title:'Trip invite · Roam'}}
}
export default async function TripPage({params}:Params){
  try{
    const {code}=await params,userId=await currentUserId(),s=db();
    const {data:trip}=await s.from('trips').select('id,name,destination,start_date,end_date,commit_deadline,deposit_amount,venmo_username,cashtag,invite_code,created_by,cover_image').eq('invite_code',code).maybeSingle();
    if(!trip)return <main className="shell section"><h1>Invite not found</h1><p className="muted">Ask your friend for a fresh link.</p></main>;
    const {data:journey,error:journeyError}=await s.from('trips').select('date_mode,window_start,window_end,nights,planning_mode,cover_photo_id').eq('id',trip.id).maybeSingle();
    if(journeyError&&!['PGRST204','42703'].includes(journeyError.code||''))throw journeyError;
    const tripWithJourney={...trip,...(journey||{date_mode:'exact',window_start:null,window_end:null,nights:null,planning_mode:'manual',cover_photo_id:null})};
    const coverPhoto=tripWithJourney.cover_photo_id?await getRoamPhotoById(tripWithJourney.cover_photo_id):null;
    const today=new Date().toLocaleDateString('en-CA',{timeZone:'America/New_York'});
    if(trip.commit_deadline<today){
      const {data:pending}=await s.from('trip_members').select('user_id').eq('trip_id',trip.id).eq('status','pending');
      if(pending?.length){
        await s.from('trip_members').update({status:'auto_out',responded_at:new Date().toISOString()}).eq('trip_id',trip.id).eq('status','pending');
        await s.from('events').insert(pending.map(m=>({trip_id:trip.id,user_id:m.user_id,event_type:'auto_out'})));
      }
    }
    const [{data:rawMembers},{data:me}]=await Promise.all([
      s.from('trip_members').select('user_id,role,status,payment_status,users(first_name,last_name,phone)').eq('trip_id',trip.id),
      userId?s.from('trip_members').select('role,status,payment_status').eq('trip_id',trip.id).eq('user_id',userId).maybeSingle():Promise.resolve({data:null})
    ]);
    const members=(rawMembers||[]).map(m=>({...m,users:Array.isArray(m.users)?m.users[0]||null:m.users}));
    await s.from('events').insert({trip_id:trip.id,user_id:userId,event_type:'invite_opened'});
    let overviewData:OverviewData|null=null,afterTripTemplateId='',pulseCompleted=false;
    if(me){
      const [daysResult,blocksResult,votesResult,travelResult,citiesResult]=await Promise.all([s.from('trip_days').select('day,city').eq('trip_id',trip.id).order('day'),s.from('itinerary_items').select('*,activity_signups(user_id,users(first_name))').eq('trip_id',trip.id).order('day').order('time_label'),s.from('polls').select('id,status').eq('trip_id',trip.id),s.from('member_travel').select('user_id,booked,arrive_at,depart_at,users(first_name)').eq('trip_id',trip.id),s.from('trip_cities').select('city,start_day,nights').eq('trip_id',trip.id).order('position')]);
      const safe=(result:{data:unknown[]|null;error:{code?:string;message?:string}|null})=>{if(result.error&&!['42P01','PGRST205'].includes(result.error.code||''))throw new Error(result.error.message||'Could not load trip overview.');return result.data||[]};
      const blocks=safe(blocksResult) as Array<Record<string,unknown>>,travel=safe(travelResult) as Array<Record<string,unknown>>;overviewData={days:safe(daysResult) as OverviewData['days'],cities:safe(citiesResult) as OverviewData['cities'],blocks:blocks.map(block=>({...block,activity_signups:Array.isArray(block.activity_signups)?(block.activity_signups as Array<Record<string,unknown>>).map(signup=>({...signup,users:Array.isArray(signup.users)?signup.users[0]||null:signup.users})):[]})) as OverviewData['blocks'],votes:safe(votesResult) as OverviewData['votes'],travel:travel.map(item=>({...item,users:Array.isArray(item.users)?item.users[0]||null:item.users})) as OverviewData['travel'],members};const pulse=await s.from('pulse_responses').select('user_id').eq('trip_id',trip.id).eq('user_id',userId).maybeSingle();pulseCompleted=Boolean(pulse.data);
      if(trip.end_date&&trip.end_date<today){const used=await s.from('template_uses').select('template_id').eq('user_id',userId).eq('new_trip_id',trip.id).maybeSingle();if(!used.error)afterTripTemplateId=used.data?.template_id||''}
    }
    return <Invite trip={tripWithJourney} members={members} me={me||null} coverPhoto={coverPhoto} overviewData={overviewData} afterTripTemplateId={afterTripTemplateId} pulseCompleted={pulseCompleted} todayDate={today}/>;
  }catch(e){return <main className="shell section"><h1>Roam needs its database</h1><p className="muted">{e instanceof Error?e.message:'Could not load this trip.'}</p></main>}
}
