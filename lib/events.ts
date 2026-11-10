import { db } from './supabase';
export async function logEvent(tripId:string,userId:string|null,type:string,metadata:Record<string,unknown>={}){await db().from('events').insert({trip_id:tripId,user_id:userId,event_type:type,metadata})}
