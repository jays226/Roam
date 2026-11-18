import {NextResponse} from 'next/server';
import {randomBytes} from 'crypto';
import {authorize} from '@/lib/authorize';
import {currentUserId,startSession} from '@/lib/session';
import {ensureIdentity} from '@/lib/identity';
import {db} from '@/lib/supabase';

type PublicBlock={type:string;title:string;note:string;place:string;url:string|null;day_index:number;start_time:string|null;end_time:string|null;span_nights:number;photo_id:string|null};
const plusDays=(date:string,days:number)=>{const day=new Date(`${date}T12:00:00`);day.setDate(day.getDate()+days);return day.toISOString().slice(0,10)};

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const {id}=await params,x=await request.json(),priorUser=await currentUserId(),user=await ensureIdentity(x),s=db();
    const {data:template,error}=await s.from('templates').select('*').eq('id',id).eq('published',true).maybeSingle();if(error)throw error;if(!template)return NextResponse.json({error:'This shared trip is no longer available.'},{status:404});
    let tripId=String(x.existing_trip_id||''),inviteCode='';
    if(tripId){
      const {role}=await authorize(tripId);if(!['admin','planner'].includes(role))return NextResponse.json({error:'Choose a trip you organize.'},{status:403});
      const {data:trip}=await s.from('trips').select('start_date,end_date,invite_code').eq('id',tripId).maybeSingle();if(!trip)return NextResponse.json({error:'Trip not found.'},{status:404});inviteCode=trip.invite_code;
      const startDate=trip.start_date||String(x.start_date||'');if(!startDate)return NextResponse.json({error:'Set this trip’s dates before using a template.'},{status:400});
      await copyBlocks(s,tripId,startDate,(template.blocks_json||[]) as PublicBlock[],user.id);
      inviteCode=String(x.existing_invite_code||'');
    }else{
      const startDate=String(x.start_date||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(startDate))return NextResponse.json({error:'Choose the first day of your trip.'},{status:400});
      const endDate=plusDays(startDate,Math.max(0,Number(template.days||1)-1)),today=new Date().toISOString().slice(0,10),deadlineCandidate=plusDays(startDate,-14),deadline=deadlineCandidate>today?deadlineCandidate:plusDays(today,7);
      const cityList=(template.cities_json||[]) as {city:string;nights:number}[],destination=cityList.map(city=>city.city).join(' → ')||'Destination TBD';inviteCode=randomBytes(6).toString('base64url');
      const base={name:String(x.name||`${template.title} with friends`).trim().slice(0,100),destination,start_date:startDate,end_date:endDate,commit_deadline:deadline,deposit_amount:0,invite_code:inviteCode,created_by:user.id,cover_image:template.cover_image||null};
      let created=await s.from('trips').insert({...base,date_mode:'exact',planning_mode:'manual',cover_photo_id:template.cover_photo_id||null}).select('id').single();if(created.error&&/column|schema cache/i.test(created.error.message))created=await s.from('trips').insert(base).select('id').single();if(created.error)throw created.error;tripId=created.data.id;
      const member=await s.from('trip_members').insert({trip_id:tripId,user_id:user.id,role:'admin',status:'in',payment_status:'confirmed',responded_at:new Date().toISOString()});if(member.error)throw member.error;
      if(cityList.length){let startDay=1;const rows=cityList.map((city,index)=>{const nights=Math.max(1,Number(city.nights)||1),row={trip_id:tripId,city:city.city,position:index,start_day:startDay,nights};startDay+=nights;return row});const result=await s.from('trip_cities').insert(rows);if(result.error&&!['42P01','PGRST205'].includes(result.error.code||''))console.warn('Could not save copied trip city list:',result.error.message)}
      await copyBlocks(s,tripId,startDate,(template.blocks_json||[]) as PublicBlock[],user.id);
      await s.from('events').insert([{trip_id:tripId,user_id:user.id,event_type:'trip_created',metadata:{from_template:id}},{trip_id:tripId,user_id:user.id,event_type:'template_used',metadata:{template_id:id}}]);
    }
    const {data:priorUse}=await s.from('template_uses').select('id').eq('template_id',id).eq('user_id',user.id).maybeSingle();
    if(!priorUse){const {data:newUse,error:useError}=await s.from('template_uses').insert({template_id:id,user_id:user.id,new_trip_id:tripId}).select('id').single();if(useError&&useError.code!=='23505')throw useError;if(template.creator_user_id!==user.id&&newUse)await s.from('points_ledger').insert({user_id:template.creator_user_id,reason:'template_copy',amount:10,ref_id:newUse.id})}
    await s.from('template_events').insert({template_id:id,user_id:user.id,event_type:'signup_from_template',metadata:{trip_id:tripId}});
    await s.from('events').insert({trip_id:tripId,user_id:user.id,event_type:'template_applied',metadata:{template_id:id}});
    const response=NextResponse.json({ok:true,invite_code:inviteCode,trip_id:tripId,existing_trip:Boolean(x.existing_trip_id)});if(!priorUser)await startSession(response,user.id);return response;
  }catch(error){console.error('Template use failed:',error);return NextResponse.json({error:error instanceof Error?error.message:'Could not start this trip.'},{status:400})}
}

async function copyBlocks(s:ReturnType<typeof db>,tripId:string,startDate:string,blocks:PublicBlock[],userId:string){
  const rows=blocks.map((block,index)=>({trip_id:tripId,title:block.title,place:block.place||null,day:plusDays(startDate,Math.max(0,Number(block.day_index||1)-1)),time_label:block.start_time?new Date(`2000-01-01T${block.start_time}`).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}):null,note:block.note||null,url:block.url||null,cost:null,cost_type:'shared',created_by:userId,type:block.type||'activity',day_index:Number(block.day_index||1),position:index,span_nights:Number(block.span_nights)||null,status:'idea'}));
  if(!rows.length)return;let result=await s.from('itinerary_items').insert(rows);if(result.error&&/column|schema cache|day_index|span_nights/i.test(result.error.message)){const base=rows.map(row=>({trip_id:row.trip_id,title:row.title,place:row.place,day:row.day,time_label:row.time_label,note:row.note,url:row.url,cost:row.cost,cost_type:row.cost_type,created_by:row.created_by}));result=await s.from('itinerary_items').insert(base)}if(result.error)throw result.error;
}
