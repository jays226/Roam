import {NextResponse} from 'next/server';
import {startSession} from '@/lib/session';
import {PhoneNameAuthProvider} from '@/lib/auth-provider';

function normalizePhone(value:string){const d=value.replace(/\D/g,'');return d.length===10?`+1${d}`:d.length===11&&d.startsWith('1')?`+${d}`:null}
export async function POST(req:Request){
  try{
    const body=await req.json(),phone=normalizePhone(String(body.phone||'')),firstName=String(body.first_name||'').trim();
    if(!phone||!firstName)return NextResponse.json({error:'Enter the phone number and first name on your Roam profile.'},{status:400});
    const user=await new PhoneNameAuthProvider().signIn({phone,firstName});
    if(!user)return NextResponse.json({error:'We could not find a profile matching that phone and first name.'},{status:401});
    const response=NextResponse.json({ok:true});await startSession(response,user.userId);return response;
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Sign-in failed.'},{status:500})}
}
