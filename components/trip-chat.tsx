'use client';

import {useState} from 'react';
import {Send,Users} from 'lucide-react';

type Message={id:string;body:string;user_id:string;created_at:string;users:{first_name:string}|null};
export default function TripChat({tripId,initialMessages}:{tripId:string;initialMessages:Message[]}){
  const [messages,setMessages]=useState(initialMessages),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  async function send(event:React.FormEvent<HTMLFormElement>){event.preventDefault();const form=event.currentTarget,body=new FormData(form).get('body');if(typeof body!=='string'||!body.trim())return;setBusy(true);setError('');try{const r=await fetch('/api/planning',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({trip_id:tripId,action:'chat',body})}),data=await r.json();if(!r.ok)throw new Error(data.error||'Message could not be sent.');form.reset();const refresh=await fetch(`/api/planning?trip_id=${tripId}`,{cache:'no-store'}),plan=await refresh.json();if(refresh.ok)setMessages(plan.chat||[])}catch(e){setError(e instanceof Error?e.message:'Message could not be sent.')}finally{setBusy(false)}}
  return <div className="card"><div className="row"><div><div className="eyebrow">THE CREW THREAD</div><h2 style={{margin:'6px 0'}}>Trip chat</h2></div><Users color="var(--roam-orange)"/></div><div className="trip-chat-messages">{messages.length?messages.map(m=><article className="trip-chat-message" key={m.id}><b>{m.users?.first_name||'Crew'}</b><p>{m.body}</p><small className="muted">{new Date(m.created_at).toLocaleString()}</small></article>):<div className="empty-state"><p className="muted">Start the trip thread. The crew’s messages live here.</p></div>}</div><form className="row" onSubmit={send}><input className="input" name="body" placeholder="Message the trip" required/><button className="btn" aria-label="Send message" disabled={busy}><Send size={17}/></button></form>{error&&<p role="alert" className="form-error">{error}</p>}</div>;
}
