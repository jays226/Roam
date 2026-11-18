import {NextResponse} from 'next/server';
import {db} from '@/lib/supabase';
import {inAppNotificationProvider} from '@/lib/notification-provider';

const dayOffset=(date:string,offset:number)=>{const value=new Date(`${date}T12:00:00Z`);value.setUTCDate(value.getUTCDate()+offset);return value.toISOString().slice(0,10)};
const todayNY=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/New_York'});

export async function GET(req:Request){
  if(!process.env.CRON_SECRET||req.headers.get('authorization')!==`Bearer ${process.env.CRON_SECRET}`)return NextResponse.json({error:'Unauthorized'},{status:401});
  const s=db(),today=todayNY();
  try{
    const {data:trips,error}=await s.from('trips').select('id,name,invite_code,created_by,start_date,end_date,commit_deadline,deposit_amount');if(error)throw error;
    let reminderCount=0,autoOutCount=0;
    for(const trip of trips||[]){
      if(trip.commit_deadline<today){const {data:pending}=await s.from('trip_members').select('user_id').eq('trip_id',trip.id).eq('status','pending');if(pending?.length){await s.from('trip_members').update({status:'auto_out',responded_at:new Date().toISOString()}).eq('trip_id',trip.id).eq('status','pending');await s.from('events').insert(pending.map(member=>({trip_id:trip.id,user_id:member.user_id,event_type:'auto_out'})));autoOutCount+=pending.length}}
      const {data:members}=await s.from('trip_members').select('user_id,status,payment_status,role').eq('trip_id',trip.id);
      const allMembers=members||[];if(!allMembers.length)continue;
      const due:Array<{type:string;users:string[];title:string;body:string;href:string}>=[];
      for(const offset of [3,1])if(dayOffset(trip.commit_deadline,-offset)===today){const people=allMembers.filter(member=>member.status==='pending'||member.status==='in'&&trip.deposit_amount>0&&member.payment_status!=='confirmed').map(member=>member.user_id);if(people.length)due.push({type:`commit_${offset}d`,users:people,title:'Trip commitment coming up',body:offset===1?'Your crew’s commit deadline is tomorrow. Check in and let them know if you’re in.':'Your crew’s commit deadline is in 3 days.',href:'/trips'})}
      if(trip.start_date){for(const offset of [30,14])if(dayOffset(trip.start_date,-offset)===today){const {data:travel,error:travelError}=await s.from('member_travel').select('user_id,booked').eq('trip_id',trip.id);const hasTravelTable=!travelError;if(travelError&&!['42P01','PGRST205'].includes(travelError.code||''))throw travelError;const booked=new Set((travel||[]).filter(row=>row.booked).map(row=>row.user_id)),people=allMembers.filter(member=>!booked.has(member.user_id)).map(member=>member.user_id);if(hasTravelTable&&people.length)due.push({type:`travel_${offset}d`,users:people,title:'Time to sort out travel',body:`${trip.name} is ${offset} days away. Add your travel details so your crew can coordinate arrivals.`,href:`/t/${trip.invite_code}/crew`})}}
      if(trip.start_date){for(const offset of [7,1])if(dayOffset(trip.start_date,-offset)===today)due.push({type:`trip_${offset}d`,users:allMembers.map(member=>member.user_id),title:offset===1?'Your trip starts tomorrow':'Your trip is one week away',body:`Open ${trip.name} and check your plan, travel and crew details.`,href:'/trips'})}
      for(const reminder of due){for(const userId of reminder.users){const scheduledFor=new Date(`${today}T12:00:00.000Z`).toISOString(),created=await inAppNotificationProvider.schedule({user_id:userId,trip_id:trip.id,type:reminder.type,payload:{title:reminder.title,body:reminder.body,href:reminder.href,trip_name:trip.name},scheduled_for:scheduledFor});if(!created)continue;reminderCount++;await s.from('pokes').insert({trip_id:trip.id,from_user:trip.created_by,to_user:userId,channel:'sms'});await s.from('events').insert({trip_id:trip.id,user_id:userId,event_type:'reminder_queued',metadata:{type:reminder.type}})}}
    }
    return NextResponse.json({ok:true,today,reminders_queued:reminderCount,auto_out: autoOutCount});
  }catch(error){console.error('Daily trip reminders failed:',error);return NextResponse.json({error:error instanceof Error?error.message:'Reminder queue failed.'},{status:500})}
}
