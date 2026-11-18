import {redirect,notFound} from 'next/navigation';
import {db} from '@/lib/supabase';
import {currentUserId} from '@/lib/session';

export async function loadTripPage(code:string){
  const userId=await currentUserId();
  if(!userId)redirect('/login');
  const s=db();
  const {data:trip}=await s.from('trips').select('id,name,destination,start_date,end_date,commit_deadline,deposit_amount,venmo_username,cashtag,estimated_total,invite_code,created_by,cover_image,created_at').eq('invite_code',code).maybeSingle();
  if(!trip)notFound();
  const {data:journey,error:journeyError}=await s.from('trips').select('date_mode,window_start,window_end,nights,planning_mode,cover_photo_id').eq('id',trip.id).maybeSingle();
  if(journeyError&&!['PGRST204','42703'].includes(journeyError.code||''))throw journeyError;
  const journeyData=journeyError&&['PGRST204','42703'].includes(journeyError.code||'')?null:journey;
  const [membershipResult,membersResult]=await Promise.all([
    s.from('trip_members').select('user_id,role,status,payment_status').eq('trip_id',trip.id).eq('user_id',userId).maybeSingle(),
    s.from('trip_members').select('user_id,role,status,payment_status,users(first_name,last_name,phone)').eq('trip_id',trip.id).order('joined_at')
  ]);
  if(!membershipResult.data)redirect(`/t/${code}`);
  const members=(membersResult.data||[]).map(member=>({...member,users:Array.isArray(member.users)?member.users[0]||null:member.users}));
  return {s,trip:{...trip,...(journeyData||{date_mode:'exact',window_start:null,window_end:null,nights:null,planning_mode:'manual',cover_photo_id:null})},userId,me:membershipResult.data,members};
}
