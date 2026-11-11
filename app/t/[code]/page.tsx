import {db} from '@/lib/supabase';
import {currentUserId} from '@/lib/session';
import Invite from './view';
import type {Metadata} from 'next';

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
    const {data:trip}=await s.from('trips').select('id,name,destination,start_date,end_date,commit_deadline,deposit_amount,venmo_username,cashtag,invite_code,created_by').eq('invite_code',code).maybeSingle();
    if(!trip)return <main className="shell section"><h1>Invite not found</h1><p className="muted">Ask your friend for a fresh link.</p></main>;
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
    return <Invite trip={trip} members={members} me={me||null}/>;
  }catch(e){return <main className="shell section"><h1>Roam needs its database</h1><p className="muted">{e instanceof Error?e.message:'Could not load this trip.'}</p></main>}
}
