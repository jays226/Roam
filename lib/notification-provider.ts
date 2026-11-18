import {db} from '@/lib/supabase';

export type NotificationInput={user_id:string;trip_id:string;type:string;payload:Record<string,unknown>;scheduled_for:string};
export interface NotificationProvider { schedule(input:NotificationInput):Promise<boolean> }

export const inAppNotificationProvider:NotificationProvider={async schedule(input){const {data,error}=await db().from('notifications').upsert(input,{onConflict:'user_id,trip_id,type,scheduled_for',ignoreDuplicates:true}).select('id').maybeSingle();if(error)throw error;return Boolean(data)}};
