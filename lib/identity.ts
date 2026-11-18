import {db} from '@/lib/supabase';
import {currentUserId} from '@/lib/session';
import {isPlaceholderPhone} from '@/lib/placeholders';

export async function ensureIdentity(input:{first_name?:string;last_name?:string;phone?:string}){
  const existingId=await currentUserId(),s=db();
  if(existingId){const {data,error}=await s.from('users').select('id,first_name,last_name,phone').eq('id',existingId).maybeSingle();if(error)throw error;if(data)return data}
  const first=String(input.first_name||'').trim(),last=String(input.last_name||'').trim(),digits=String(input.phone||'').replace(/\D/g,'');
  const phone=digits.length===10?`+1${digits}`:digits.length===11&&digits.startsWith('1')?`+${digits}`:'';
  if(!first||!last||!phone)throw new Error('Enter your first name, last name, and a valid 10-digit US phone number.');
  if(isPlaceholderPhone(phone))throw new Error('That reserved number belongs to a placeholder account. Use your real phone number.');
  const {data:user,error}=await s.from('users').select('id,first_name,last_name,phone').eq('phone',phone).maybeSingle();if(error)throw error;let resolved=user;
  if(!resolved){const created=await s.from('users').insert({first_name:first,last_name:last,phone}).select('id,first_name,last_name,phone').single();if(created.error)throw created.error;resolved=created.data}else{const updated=await s.from('users').update({first_name:first,last_name:last}).eq('id',resolved.id).select('id,first_name,last_name,phone').single();if(updated.error)throw updated.error;resolved=updated.data}
  return resolved;
}
