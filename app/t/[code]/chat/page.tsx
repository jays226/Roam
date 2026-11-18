import AppNav from '@/components/app-nav';
import TripHeader from '@/components/trip-header';
import TripChat from '@/components/trip-chat';
import {loadTripPage} from '@/lib/trip-page';

export default async function ChatPage({params}:{params:Promise<{code:string}>}){
  const {code}=await params,{s,trip,members}=await loadTripPage(code);
  const {data:messages,error}=await s.from('chat_messages').select('id,body,user_id,created_at,users(first_name)').eq('trip_id',trip.id).order('created_at').limit(100);
  if(error)throw error;
  const rows=(messages||[]).map(message=>({...message,users:Array.isArray(message.users)?message.users[0]||null:message.users}));
  return <main className="shell"><TripHeader trip={trip} members={members} active="chat"/><section className="section trip-main-content"><div className="page-title-row"><div><div className="eyebrow">MESSAGES ACROSS THE CREW</div><h1 className="page-title">Chat</h1><p className="muted">Keep the planning thread with the trip.</p></div></div><TripChat tripId={trip.id} initialMessages={rows}/></section><AppNav active="trips"/></main>;
}
