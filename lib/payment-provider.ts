import {db} from './supabase';
export type PaymentState='none'|'sent'|'confirmed';
type RoamDb=ReturnType<typeof db>;
export interface PaymentProvider {
  requestPayment(input:{tripId:string;userId:string;amount:number}):Promise<{url:string|null}>;
  confirmPayment(input:{tripId:string;userId:string;confirmedBy:string}):Promise<void>;
  getStatus(input:{tripId:string;userId:string}):Promise<PaymentState>;
}
export class ManualPaymentProvider implements PaymentProvider {
  constructor(private readonly client:RoamDb=db()){}
  async requestPayment(input:{tripId:string;userId:string;amount:number}){const {data,error}=await this.client.from('trips').select('name,venmo_username,cashtag').eq('id',input.tripId).single();if(error)throw error;const amount=input.amount;if(data.venmo_username)return {url:`https://venmo.com/?txn=pay&recipients=${encodeURIComponent(data.venmo_username)}&amount=${amount}&note=${encodeURIComponent(data.name+' deposit')}`};if(data.cashtag)return {url:`https://cash.app/$${data.cashtag}/${amount}`};return {url:null}}
  async confirmPayment(input:{tripId:string;userId:string;confirmedBy:string}){const {error}=await this.client.from('trip_members').update({payment_status:'confirmed'}).eq('trip_id',input.tripId).eq('user_id',input.userId);if(error)throw error}
  async getStatus(input:{tripId:string;userId:string}):Promise<PaymentState>{const {data,error}=await this.client.from('trip_members').select('payment_status').eq('trip_id',input.tripId).eq('user_id',input.userId).single();if(error)throw error;return data.payment_status as PaymentState}
  // TODO: replace this manual implementation with Stripe Connect after the trip-fund flow is approved.
}
