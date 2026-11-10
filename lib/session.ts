import {createHash,randomBytes} from 'node:crypto';
import {cookies} from 'next/headers';
import {NextResponse} from 'next/server';
import {db} from './supabase';

const COOKIE='roam_session';
const hash=(token:string)=>createHash('sha256').update(token).digest('hex');

export async function currentUserId(){
  const token=(await cookies()).get(COOKIE)?.value;
  if(!token)return null;
  const {data}=await db().from('sessions').select('user_id').eq('token_hash',hash(token)).gt('expires_at',new Date().toISOString()).maybeSingle();
  return data?.user_id||null;
}

export async function startSession(response:NextResponse,userId:string){
  const token=randomBytes(32).toString('base64url');
  const expires=new Date(Date.now()+365*24*60*60*1000);
  const {error}=await db().from('sessions').insert({user_id:userId,token_hash:hash(token),expires_at:expires.toISOString()});
  if(error)throw error;
  response.cookies.set(COOKIE,token,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:365*24*60*60,path:'/'});
}

export async function endSession(response:NextResponse){
  const token=(await cookies()).get(COOKIE)?.value;
  if(token)await db().from('sessions').delete().eq('token_hash',hash(token));
  response.cookies.set(COOKIE,'',{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:0,path:'/'});
}
