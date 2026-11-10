import {db} from './supabase';

export type SignInInput={phone:string;firstName:string};
export interface AuthProvider {
  signIn(input:SignInInput):Promise<{userId:string}|null>;
  // TODO: replace with SMS OTP (Twilio Verify / Supabase phone auth) once A2P 10DLC registration is approved.
}
export class PhoneNameAuthProvider implements AuthProvider {
  async signIn(input:SignInInput){
    const {data,error}=await db().from('users').select('id,first_name').eq('phone',input.phone).maybeSingle();
    if(error)throw error;
    if(!data||data.first_name.trim().toLowerCase()!==input.firstName.trim().toLowerCase())return null;
    return {userId:data.id};
  }
}
