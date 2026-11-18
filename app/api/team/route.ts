import {NextResponse} from 'next/server';import {db} from '@/lib/supabase';
export async function POST(req:Request){
  try{
    const x=await req.json();if(!process.env.TEAM_DASHBOARD_PASSWORD||x.password!==process.env.TEAM_DASHBOARD_PASSWORD)return NextResponse.json({error:'Incorrect password.'},{status:401});
    const s=db();
    if(x.action==='complete_poke'){
      const {data:poke,error}=await s.from('pokes').update({completed_at:new Date().toISOString()}).eq('id',x.id).is('completed_at',null).select('trip_id').single();if(error)throw error;
      await s.from('events').insert({trip_id:poke.trip_id,event_type:'concierge_poke_completed',metadata:{poke_id:x.id}});return NextResponse.json({ok:true});
    }
    if(x.action==='complete_booking'){
      const {data:booking,error}=await s.from('booking_requests').update({status:'done',completed_at:new Date().toISOString()}).eq('id',x.id).neq('status','done').select('trip_id').single();if(error)throw error;
      await s.from('events').insert({trip_id:booking.trip_id,event_type:'booking_request_completed',metadata:{booking_id:x.id}});return NextResponse.json({ok:true});
    }
    const {data:trips,error}=await s.from('trips').select('id,name,created_at,trip_members(status,payment_status,joined_at,responded_at)').eq('is_demo',false).order('created_at',{ascending:false});if(error)throw error;
    const ids=(trips||[]).map(t=>t.id);let explore={published:0,copies:0,views:0,signups:0,conversion:0,tripsWithFiveBlocks:0,travelBookedRate:0};
    if(ids.length){try{const {data:templates,error:templateError}=await s.from('templates').select('id').eq('published',true).in('source_trip_id',ids);if(!templateError&&templates?.length){const templateIds=templates.map(t=>t.id),[uses,views,signups,blocks,travel,travelMembers]=await Promise.all([s.from('template_uses').select('id',{count:'exact',head:true}).in('template_id',templateIds),s.from('template_views').select('template_id',{count:'exact',head:true}).in('template_id',templateIds),s.from('template_events').select('id',{count:'exact',head:true}).in('template_id',templateIds).eq('event_type','signup_from_template'),s.from('itinerary_items').select('trip_id').in('trip_id',ids),s.from('member_travel').select('booked').in('trip_id',ids),s.from('trip_members').select('user_id',{count:'exact',head:true}).in('trip_id',ids)]);const counts=new Map<string,number>();for(const row of blocks.data||[])counts.set(row.trip_id,(counts.get(row.trip_id)||0)+1);const travelRows=travel.error?[]:travel.data||[],viewsCount=views.count||0,signupCount=signups.count||0,travelTotal=travelMembers.error?0:travelMembers.count||0;explore={published:templates.length,copies:uses.count||0,views:viewsCount,signups:signupCount,conversion:viewsCount?Math.round(100*signupCount/viewsCount):0,tripsWithFiveBlocks:ids.length?Math.round(100*Array.from(counts.values()).filter(count=>count>=5).length/ids.length):0,travelBookedRate:travelTotal?Math.round(100*travelRows.filter(row=>row.booked).length/travelTotal):0}}}catch(error){console.warn('Optional Explore team metrics unavailable:',error)}}
    if(!ids.length)return NextResponse.json({trips:[],events:[],pokes:[],bookings:[],pulses:[],explore});
    const [events,pokes,bookings,pulses]=await Promise.all([
      s.from('events').select('id,trip_id,user_id,event_type,created_at,metadata,trips(name)').in('trip_id',ids).order('created_at',{ascending:false}).limit(1000),
      s.from('pokes').select('id,trip_id,created_at,completed_at,channel,to_user:users!pokes_to_user_fkey(first_name),trips(name)').in('trip_id',ids).is('completed_at',null).order('created_at',{ascending:false}),
      s.from('booking_requests').select('id,trip_id,what_to_book,budget,preferences,status,created_at,users(first_name),trips(name)').in('trip_id',ids).neq('status','done').order('created_at',{ascending:false}),
      s.from('pulse_responses').select('id,trip_id,user_id,disappointment,organizer_wtp,comment,created_at,trips(name)').in('trip_id',ids).order('created_at',{ascending:false})
    ]);
    for(const r of [events,pokes,bookings,pulses])if(r.error)throw r.error;
    return NextResponse.json({trips:trips||[],events:events.data||[],pokes:pokes.data||[],bookings:bookings.data||[],pulses:pulses.data||[],explore});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Dashboard unavailable.'},{status:500})}
}
