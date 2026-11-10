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
    const ids=(trips||[]).map(t=>t.id);if(!ids.length)return NextResponse.json({trips:[],events:[],pokes:[],bookings:[],pulses:[]});
    const [events,pokes,bookings,pulses]=await Promise.all([
      s.from('events').select('id,trip_id,user_id,event_type,created_at,metadata,trips(name)').in('trip_id',ids).order('created_at',{ascending:false}).limit(1000),
      s.from('pokes').select('id,trip_id,created_at,completed_at,channel,to_user:users!pokes_to_user_fkey(first_name),trips(name)').in('trip_id',ids).eq('channel','concierge').is('completed_at',null).order('created_at',{ascending:false}),
      s.from('booking_requests').select('id,trip_id,what_to_book,budget,preferences,status,created_at,users(first_name),trips(name)').in('trip_id',ids).neq('status','done').order('created_at',{ascending:false}),
      s.from('pulse_responses').select('id,trip_id,user_id,disappointment,organizer_wtp,comment,created_at,trips(name)').in('trip_id',ids).order('created_at',{ascending:false})
    ]);
    for(const r of [events,pokes,bookings,pulses])if(r.error)throw r.error;
    return NextResponse.json({trips:trips||[],events:events.data||[],pokes:pokes.data||[],bookings:bookings.data||[],pulses:pulses.data||[]});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Dashboard unavailable.'},{status:500})}
}
