import {NextResponse} from 'next/server';
import {db} from '@/lib/supabase';
import {startSession} from '@/lib/session';
import {isPlaceholderPhone} from '@/lib/placeholders';

function normalizePhone(value:string){const digits=value.replace(/\D/g,'');return digits.length===10?`+1${digits}`:digits.length===11&&digits.startsWith('1')?`+${digits}`:null}
export async function POST(req:Request){
  try{
    const body=await req.json(),phone=normalizePhone(String(body.phone||'')),firstName=String(body.first_name||'').trim(),lastName=String(body.last_name||'').trim();
    if(!phone||!firstName||!lastName)return NextResponse.json({error:'Add your name and a valid US phone number.'},{status:400});
    if(isPlaceholderPhone(phone))return NextResponse.json({error:'Placeholder profiles cannot sign in. Use your real phone number to join.'},{status:400});
    const s=db(),{data:trip}=await s.from('trips').select('id').eq('invite_code',body.code).maybeSingle();
    if(!trip)return NextResponse.json({error:'This invite link is no longer valid.'},{status:404});
    let {data:user}=await s.from('users').select('id,first_name').eq('phone',phone).maybeSingle();
    if(user&&user.first_name.trim().toLowerCase()!==firstName.toLowerCase())return NextResponse.json({error:'That phone number is already linked to a different first name. Sign in with the matching name.'},{status:409});
    if(!user){const created=await s.from('users').insert({first_name:firstName,last_name:lastName,phone}).select('id,first_name').single();if(created.error)throw created.error;user=created.data}
    const {data:existing}=await s.from('trip_members').select('user_id').eq('trip_id',trip.id).eq('user_id',user.id).maybeSingle();
    if(!existing){const joined=await s.from('trip_members').insert({trip_id:trip.id,user_id:user.id,role:'traveler'});if(joined.error)throw joined.error;await s.from('events').insert({trip_id:trip.id,user_id:user.id,event_type:'joined'})}
    const response=NextResponse.json({ok:true});await startSession(response,user.id);return response;
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Could not join.'},{status:500})}
}
