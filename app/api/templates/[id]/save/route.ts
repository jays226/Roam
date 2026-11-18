import {NextResponse} from 'next/server';
import {currentUserId,startSession} from '@/lib/session';
import {ensureIdentity} from '@/lib/identity';
import {db} from '@/lib/supabase';

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const {id}=await params,x=await request.json(),priorUser=await currentUserId(),user=await ensureIdentity(x),s=db();
    const {data:template}=await s.from('templates').select('id,creator_user_id').eq('id',id).eq('published',true).maybeSingle();if(!template)return NextResponse.json({error:'Template not found.'},{status:404});
    const {data:existing}=await s.from('template_saves').select('template_id').eq('template_id',id).eq('user_id',user.id).maybeSingle();
    if(!existing){const {error}=await s.from('template_saves').insert({template_id:id,user_id:user.id});if(error)throw error;if(template.creator_user_id!==user.id)await s.from('points_ledger').insert({user_id:template.creator_user_id,reason:'template_save',amount:1,ref_id:user.id});await s.from('template_events').insert({template_id:id,user_id:user.id,event_type:'template_saved'})}
    const response=NextResponse.json({ok:true,saved:true});if(!priorUser)await startSession(response,user.id);return response;
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Could not save this trip.'},{status:400})}
}
