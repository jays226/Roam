import {NextResponse} from 'next/server';
import {currentUserId} from '@/lib/session';
import {db} from '@/lib/supabase';

export async function GET(){
  try{
    const userId=await currentUserId();
    if(!userId)return NextResponse.json({error:'Sign in to see your activity.'},{status:401});
    const s=db();
    const {data:members,error:memberError}=await s.from('trip_members').select('trip_id').eq('user_id',userId);
    if(memberError)throw memberError;
    const tripIds=Array.from(new Set((members||[]).map(member=>member.trip_id)));
    const eventQuery=tripIds.length?s.from('events').select('id,trip_id,user_id,event_type,metadata,created_at,users(first_name),trips(name,invite_code)').in('trip_id',tripIds).order('created_at',{ascending:false}).limit(100):Promise.resolve({data:[],error:null});
    const [eventResult,notificationResult]=await Promise.all([eventQuery,s.from('notifications').select('id,trip_id,type,payload,scheduled_for,created_at,read_at,trips(name,invite_code)').eq('user_id',userId).lte('scheduled_for',new Date().toISOString()).order('scheduled_for',{ascending:false}).limit(100)]);
    if(eventResult.error)throw eventResult.error;
    if(notificationResult.error&&!['42P01','PGRST205'].includes(notificationResult.error.code||''))throw notificationResult.error;
    const events=(eventResult.data||[]).map(event=>({...event,users:Array.isArray(event.users)?event.users[0]||null:event.users,trips:Array.isArray(event.trips)?event.trips[0]||null:event.trips,is_notification:false,read_at:null}));
    const notifications=(notificationResult.data||[]).map(item=>({id:`notification-${item.id}`,trip_id:item.trip_id,user_id:userId,event_type:`reminder_${item.type}`,metadata:item.payload,created_at:item.scheduled_for,users:null,trips:Array.isArray(item.trips)?item.trips[0]||null:item.trips,is_notification:true,read_at:item.read_at}));
    return NextResponse.json([...events,...notifications].sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at)).slice(0,100));
  }catch(error){
    console.error('Load activity failed:',error);
    return NextResponse.json({error:error instanceof Error?error.message:'Could not load activity.'},{status:500});
  }
}

export async function PATCH(request:Request){
  try{const userId=await currentUserId();if(!userId)return NextResponse.json({error:'Sign in to update activity.'},{status:401});const body=await request.json(),s=db();let query=s.from('notifications').update({read_at:new Date().toISOString()}).eq('user_id',userId).is('read_at',null);if(Array.isArray(body.ids)&&body.ids.length)query=query.in('id',body.ids.map(String));const {error}=await query;if(error&&!['42P01','PGRST205'].includes(error.code||''))throw error;return NextResponse.json({ok:true})}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Could not update activity.'},{status:400})}
}
