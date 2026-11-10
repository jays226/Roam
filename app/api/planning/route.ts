import {NextResponse} from 'next/server';
import {authorize} from '@/lib/authorize';
import {db} from '@/lib/supabase';

const fail=(message:string,status=400)=>NextResponse.json({error:message},{status});
const emit=(s:ReturnType<typeof db>,trip_id:string,user_id:string,event_type:string,metadata:Record<string,unknown>={})=>s.from('events').insert({trip_id,user_id,event_type,metadata});
type Choice={title?:string;note?:string;price_estimate?:number|string;option_id?:string|null};

export async function GET(req:Request){
  try{
    const tripId=new URL(req.url).searchParams.get('trip_id');if(!tripId)return fail('Trip ID is required.');
    const {uid,s}=await authorize(tripId);
    const [options,polls,availability,itinerary,comments,chat,members,expenses,requests,pulses,origins,events]=await Promise.all([
      s.from('options').select('*').eq('trip_id',tripId).order('sort_order'),
      s.from('polls').select('*,poll_options(*),ballots(poll_option_id,user_id,users(first_name,last_name))').eq('trip_id',tripId).order('created_at',{ascending:false}),
      s.from('availability').select('user_id,date,is_available').eq('trip_id',tripId),
      s.from('itinerary_items').select('*,activity_signups(user_id,users(first_name,last_name))').eq('trip_id',tripId).order('day').order('time_label'),
      s.from('comments').select('*,users(first_name,last_name)').eq('trip_id',tripId).order('created_at'),
      s.from('chat_messages').select('*,users(first_name,last_name)').eq('trip_id',tripId).order('created_at').limit(100),
      s.from('trip_members').select('user_id,role,status,payment_status,users(first_name,last_name,phone)').eq('trip_id',tripId),
      s.from('expenses').select('*,expense_shares(user_id,share_amount,settled,users(first_name,last_name))').eq('trip_id',tripId).order('expense_date',{ascending:false}),
      s.from('booking_requests').select('*,users(first_name,last_name)').eq('trip_id',tripId).order('created_at',{ascending:false}),
      s.from('pulse_responses').select('user_id,disappointment,organizer_wtp,comment,created_at').eq('trip_id',tripId),
      s.from('trip_origins').select('user_id,airport,users(first_name,last_name)').eq('trip_id',tripId),
      s.from('events').select('id,user_id,event_type,created_at,metadata,users(first_name)').eq('trip_id',tripId).order('created_at',{ascending:false}).limit(100)
    ]);
    for(const result of [options,polls,availability,itinerary,comments,chat,members,expenses,requests,pulses,origins,events])if(result.error)throw result.error;
    return NextResponse.json({user_id:uid,options:options.data||[],polls:polls.data||[],availability:availability.data||[],itinerary:itinerary.data||[],comments:comments.data||[],chat:chat.data||[],members:members.data||[],expenses:expenses.data||[],requests:requests.data||[],pulses:pulses.data||[],origins:origins.data||[],events:events.data||[]});
  }catch(e){return fail(e instanceof Error?e.message:'Could not load the plan.',401)}
}

export async function POST(req:Request){
  try{
    const x=await req.json(),tripId=String(x.trip_id||''),action=String(x.action||'');if(!tripId)return fail('Trip ID is required.');
    const {uid,role,s}=await authorize(tripId);
    const planner=['admin','planner'].includes(role),admin=role==='admin';
    if(action==='option_add'||action==='suggest'){
      const title=String(x.title||'').trim();if(!title)return fail('Add a name or a link.');
      if(action==='option_add'&&!planner)return fail('Only planners can add shortlist options.',403);
      const {data,error}=await s.from('options').insert({trip_id:tripId,title,category:String(x.category||'activity'),note:String(x.note||'').trim()||null,url:String(x.url||'').trim()||null,price_estimate:Number(x.price_estimate)||null,source:action==='suggest'?'suggestion':'planner',status:action==='option_add'?'shortlisted':'idea',created_by:uid}).select().single();
      if(error)throw error;await emit(s,tripId,uid,action==='suggest'?'suggestion_made':'shortlist_add',{option_id:data.id});return NextResponse.json({ok:true,data});
    }
    if(action==='option_status'){
      if(!planner)return fail('Only planners can manage the shortlist.',403);
      const status=String(x.status);if(!['idea','shortlisted','dismissed','locked'].includes(status))return fail('Invalid option status.');if(status==='locked'&&!admin)return fail('Only admins can lock a decision.',403);
      const {data:option}=await s.from('options').select('title,category,note,url,price_estimate').eq('trip_id',tripId).eq('id',x.option_id).maybeSingle();if(!option)return fail('Option not found.');
      const {error}=await s.from('options').update({status}).eq('trip_id',tripId).eq('id',x.option_id);if(error)throw error;
      if(status==='locked'){const {data:existing}=await s.from('itinerary_items').select('id').eq('trip_id',tripId).eq('option_id',x.option_id).maybeSingle();if(!existing){const {error:itemError}=await s.from('itinerary_items').insert({trip_id:tripId,option_id:x.option_id,title:option.title,place:option.category==='destination'||option.category==='stay'?option.title:null,note:option.note,url:option.url,cost:option.price_estimate,created_by:uid});if(itemError)throw itemError}}
      await emit(s,tripId,uid,status==='locked'?'decision_locked':status==='shortlisted'?'suggestion_approved':'suggestion_dismissed',{option_id:x.option_id,title:option.title});return NextResponse.json({ok:true});
    }
    if(action==='poll_create'){
      if(!planner)return fail('Only planners can open a group vote.',403);
      const choices=(Array.isArray(x.options)?x.options:[]) as Choice[];if(choices.length<2)return fail('A vote needs at least two choices.');
      const {data:poll,error}=await s.from('polls').insert({trip_id:tripId,category:String(x.category||'custom'),title:String(x.title||'Choose together'),multi_select:Boolean(x.multi_select),deadline:x.deadline||null,created_by:uid}).select().single();if(error)throw error;
      const {error:optionError}=await s.from('poll_options').insert(choices.map((o,i)=>({poll_id:poll.id,option_id:o.option_id||null,title:String(o.title||'').trim(),note:o.note||null,price_estimate:Number(o.price_estimate)||null,sort_order:i})));if(optionError)throw optionError;
      for(const o of choices)if(o.option_id)await s.from('options').update({status:'in_vote'}).eq('trip_id',tripId).eq('id',o.option_id);
      await emit(s,tripId,uid,'vote_opened',{poll_id:poll.id});return NextResponse.json({ok:true,poll_id:poll.id});
    }
    if(action==='vote'){
      const {data:poll,error}=await s.from('polls').select('id,multi_select,status,deadline').eq('trip_id',tripId).eq('id',x.poll_id).maybeSingle();if(error)throw error;if(!poll||poll.status!=='open')return fail('This vote is closed.');
      if(poll.deadline&&new Date(poll.deadline).getTime()<Date.now())return fail('The voting deadline has passed.');
      const chosen=Array.isArray(x.option_ids)?Array.from(new Set<string>(x.option_ids.map(String) as string[])):[];if(!chosen.length)return fail('Choose at least one option.');if(!poll.multi_select&&chosen.length>1)return fail('Choose one option.');
      const {data:valid}=await s.from('poll_options').select('id').eq('poll_id',poll.id).in('id',chosen);if((valid||[]).length!==chosen.length)return fail('A selected option does not belong to this vote.');
      await s.from('ballots').delete().eq('poll_id',poll.id).eq('user_id',uid);const {error:ballotError}=await s.from('ballots').insert(chosen.map((poll_option_id:string)=>({poll_id:poll.id,poll_option_id,user_id:uid})));if(ballotError)throw ballotError;
      await emit(s,tripId,uid,'vote_cast',{poll_id:poll.id});return NextResponse.json({ok:true});
    }
    if(action==='poll_close'||action==='poll_lock'){
      if(!admin)return fail('Only admins can close and lock a decision.',403);
      if(action==='poll_close'){const {error}=await s.from('polls').update({status:'closed'}).eq('trip_id',tripId).eq('id',x.poll_id);if(error)throw error;await emit(s,tripId,uid,'vote_closed',{poll_id:x.poll_id});return NextResponse.json({ok:true})}
      const {data:poll}=await s.from('polls').select('id,category,status').eq('trip_id',tripId).eq('id',x.poll_id).maybeSingle();if(!poll)return fail('Vote not found.');if(poll.status==='locked')return fail('This decision is already locked.');
      const {data:choice}=await s.from('poll_options').select('id,title,note,price_estimate,option_id').eq('poll_id',poll.id).eq('id',x.option_id).maybeSingle();if(!choice)return fail('Choose a valid winning option.');
      let optionId=choice.option_id as string|null;
      if(optionId)await s.from('options').update({status:'locked'}).eq('trip_id',tripId).eq('id',optionId);
      else{const {data:created,error}=await s.from('options').insert({trip_id:tripId,category:poll.category,title:choice.title,note:choice.note,price_estimate:choice.price_estimate,source:'planner',status:'locked',created_by:uid}).select('id').single();if(error)throw error;optionId=created.id}
      const {error}=await s.from('polls').update({status:'locked',locked_option_id:choice.id}).eq('id',poll.id);if(error)throw error;
      const {data:existingItem}=await s.from('itinerary_items').select('id').eq('trip_id',tripId).eq('option_id',optionId).maybeSingle();if(!existingItem){const {error:itemError}=await s.from('itinerary_items').insert({trip_id:tripId,option_id:optionId,title:choice.title,place:poll.category==='destination'||poll.category==='stay'?choice.title:null,note:choice.note,cost:choice.price_estimate,created_by:uid});if(itemError)throw itemError}
      await emit(s,tripId,uid,'decision_locked',{poll_id:poll.id,option_id:optionId,title:choice.title});return NextResponse.json({ok:true,title:choice.title});
    }
    if(action==='availability_save'){
      const dates=Array.isArray(x.dates)?Array.from(new Set<string>(x.dates.map(String) as string[])):[];
      await s.from('availability').delete().eq('trip_id',tripId).eq('user_id',uid);
      if(dates.length){const {error}=await s.from('availability').insert(dates.map((date:string)=>({trip_id:tripId,user_id:uid,date,is_available:true})));if(error)throw error}
      await emit(s,tripId,uid,'availability_saved',{dates:dates.length});return NextResponse.json({ok:true});
    }
    if(action==='itinerary_add'){
      if(!planner)return fail('Only planners can edit the itinerary.',403);const title=String(x.title||'').trim();if(!title)return fail('Add an activity name.');
      const {data,error}=await s.from('itinerary_items').insert({trip_id:tripId,title,place:x.place||null,day:x.day||null,time_label:x.time_label||null,note:x.note||null,url:x.url||null,cost:Number(x.cost)||null,cost_type:x.cost_type==='per_signup'?'per_signup':'shared',capacity:Number(x.capacity)||null,created_by:uid}).select().single();if(error)throw error;await emit(s,tripId,uid,'itinerary_item_added',{item_id:data.id});return NextResponse.json({ok:true,data});
    }
    if(action==='activity_signup'){
      const {data:item}=await s.from('itinerary_items').select('id,capacity').eq('trip_id',tripId).eq('id',x.item_id).maybeSingle();if(!item)return fail('Activity not found.');
      const {data:existing}=await s.from('activity_signups').select('user_id').eq('item_id',item.id).eq('user_id',uid).maybeSingle();
      if(existing){const {error}=await s.from('activity_signups').delete().eq('item_id',item.id).eq('user_id',uid);if(error)throw error}
      else{if(item.capacity){const {count}=await s.from('activity_signups').select('user_id',{count:'exact',head:true}).eq('item_id',item.id);if((count||0)>=item.capacity)return fail('This activity is full.')}const {error}=await s.from('activity_signups').insert({item_id:item.id,user_id:uid});if(error)throw error;await emit(s,tripId,uid,'activity_joined',{item_id:item.id})}
      return NextResponse.json({ok:true});
    }
    if(action==='booking_status'){
      if(!planner)return fail('Only planners can update booking status.',403);const {error}=await s.from('itinerary_items').update({booking_status:x.booked?'booked':'not_booked',booked_by:x.booked?uid:null,confirmation_note:String(x.confirmation_note||'').trim()||null}).eq('trip_id',tripId).eq('id',x.item_id);if(error)throw error;await emit(s,tripId,uid,'booking_status_updated',{item_id:x.item_id,booked:Boolean(x.booked)});return NextResponse.json({ok:true});
    }
    if(action==='comment'||action==='chat'){
      const body=String(x.body||'').trim();if(!body||body.length>2000)return fail('Write a message under 2,000 characters.');
      if(action==='chat'){const {error}=await s.from('chat_messages').insert({trip_id:tripId,user_id:uid,body});if(error)throw error;await emit(s,tripId,uid,'chat_message');}
      else{const {error}=await s.from('comments').insert({trip_id:tripId,user_id:uid,entity_type:String(x.entity_type||'trip'),entity_id:x.entity_id||tripId,body});if(error)throw error;}
      return NextResponse.json({ok:true});
    }
    if(action==='booking_request'){
      const {data,error}=await s.from('booking_requests').insert({trip_id:tripId,user_id:uid,what_to_book:String(x.what_to_book||'').trim(),budget:Number(x.budget)||null,preferences:String(x.preferences||'').trim()||null}).select().single();if(error)throw error;await emit(s,tripId,uid,'booking_requested',{request_id:data.id});return NextResponse.json({ok:true});
    }
    if(action==='promote'){
      if(!admin)return fail('Only admins can change trip roles.',403);if(!['planner','traveler','admin'].includes(x.role))return fail('Choose a valid role.');
      const {data:target}=await s.from('trip_members').select('user_id').eq('trip_id',tripId).eq('user_id',x.user_id).maybeSingle();if(!target)return fail('That traveler is not in this trip.');
      if(x.role!=='admin'){const {count}=await s.from('trip_members').select('user_id',{count:'exact',head:true}).eq('trip_id',tripId).eq('role','admin');if(count===1){const {data:targetRole}=await s.from('trip_members').select('role').eq('trip_id',tripId).eq('user_id',x.user_id).single();const {data:self}=await s.from('trip_members').select('role').eq('trip_id',tripId).eq('user_id',uid).single();if(targetRole?.role==='admin'&&self?.role==='admin')return fail('Promote another admin before changing your own role.')}}
      const {error}=await s.from('trip_members').update({role:x.role}).eq('trip_id',tripId).eq('user_id',x.user_id);if(error)throw error;await emit(s,tripId,uid,'member_role_changed',{target_user:x.user_id,role:x.role});return NextResponse.json({ok:true});
    }
    if(action==='remove_member'){
      if(!admin)return fail('Only admins can remove a traveler.',403);if(x.user_id===uid)return fail('You cannot remove yourself from your own trip.');
      const {data:target}=await s.from('trip_members').select('role').eq('trip_id',tripId).eq('user_id',x.user_id).maybeSingle();if(!target)return fail('That traveler is not in this trip.');
      if(target.role==='admin'){const {count}=await s.from('trip_members').select('user_id',{count:'exact',head:true}).eq('trip_id',tripId).eq('role','admin');if((count||0)<=1)return fail('Promote another admin before removing the only admin.')}
      const {error}=await s.from('trip_members').delete().eq('trip_id',tripId).eq('user_id',x.user_id);if(error)throw error;await emit(s,tripId,uid,'member_removed',{target_user:x.user_id});return NextResponse.json({ok:true});
    }
    if(action==='trip_settings'){
      if(!admin)return fail('Only admins can edit trip settings.',403);const patch:Record<string,unknown>={};if(x.commit_deadline)patch.commit_deadline=x.commit_deadline;if(x.deposit_amount!==undefined&&x.deposit_amount!=='')patch.deposit_amount=Number(x.deposit_amount)||0;if(x.estimated_total!==undefined&&x.estimated_total!=='')patch.estimated_total=Number(x.estimated_total)||null;if(x.destination!==undefined)patch.destination=String(x.destination||'').trim()||null;if(x.venmo_username!==undefined)patch.venmo_username=String(x.venmo_username||'').replace(/^@/,'')||null;if(x.cashtag!==undefined)patch.cashtag=String(x.cashtag||'').replace(/^\$/,'')||null;const {error}=await s.from('trips').update(patch).eq('id',tripId);if(error)throw error;await emit(s,tripId,uid,'trip_details_updated',patch);return NextResponse.json({ok:true});
    }
    if(action==='readd_member'){
      if(!admin)return fail('Only admins can re-add a traveler.',403);const {error}=await s.from('trip_members').update({status:'pending',responded_at:null,payment_status:'none'}).eq('trip_id',tripId).eq('user_id',x.user_id);if(error)throw error;await emit(s,tripId,uid,'member_readded',{target_user:x.user_id});return NextResponse.json({ok:true});
    }
    if(action==='booking_complete'){
      if(!admin)return fail('Only trip admins can confirm this request.',403);const {error}=await s.from('booking_requests').update({status:'done',completed_at:new Date().toISOString()}).eq('trip_id',tripId).eq('id',x.request_id);if(error)throw error;return NextResponse.json({ok:true});
    }
    if(action==='pulse'){
      const {error}=await s.from('pulse_responses').upsert({trip_id:tripId,user_id:uid,disappointment:x.disappointment,organizer_wtp:x.organizer_wtp||null,comment:String(x.comment||'').trim()||null},{onConflict:'trip_id,user_id'});if(error)throw error;await emit(s,tripId,uid,'pulse_answered');return NextResponse.json({ok:true});
    }
    if(action==='expense_add'){
      const amount=Number(x.amount);if(!Number.isFinite(amount)||amount<=0)return fail('Enter a positive amount.');const {data:expense,error}=await s.from('expenses').insert({trip_id:tripId,paid_by:uid,title:String(x.title||'').trim(),amount,expense_date:x.expense_date||new Date().toISOString().slice(0,10)}).select().single();if(error)throw error;
      const members=Array.isArray(x.user_ids)&&x.user_ids.length?x.user_ids.map(String):[];const {data:inMembers}=members.length?{data:null}:await s.from('trip_members').select('user_id').eq('trip_id',tripId).eq('status','in');const ids=Array.from(new Set<string>((members.length?members:(inMembers||[]).map(m=>m.user_id)) as string[]));const {data:tripMembers}=await s.from('trip_members').select('user_id').eq('trip_id',tripId);const allowed=new Set((tripMembers||[]).map(m=>m.user_id));if(ids.some(id=>!allowed.has(id)))return fail('Expense splits can only include trip members.');if(!ids.includes(uid))ids.push(uid);const share=Math.round(amount*100/ids.length)/100;const shares=ids.map((user_id:string,i:number)=>({expense_id:expense.id,user_id,share_amount:i===ids.length-1?Math.round((amount-share*(ids.length-1))*100)/100:share}));const {error:shareError}=await s.from('expense_shares').insert(shares);if(shareError)throw shareError;await emit(s,tripId,uid,'expense_added',{expense_id:expense.id,amount});return NextResponse.json({ok:true});
    }
    if(action==='expense_settle'){
      const {data:expense}=await s.from('expenses').select('id').eq('trip_id',tripId).eq('id',x.expense_id).maybeSingle();if(!expense)return fail('Expense not found in this trip.');const {error}=await s.from('expense_shares').update({settled:true,settled_at:new Date().toISOString()}).eq('expense_id',x.expense_id).eq('user_id',uid);if(error)throw error;await emit(s,tripId,uid,'expense_settled',{expense_id:x.expense_id});return NextResponse.json({ok:true});
    }
    if(action==='origin_add'){
      const airport=String(x.airport||'').trim().toUpperCase();if(!airport)return fail('Enter an airport code.');const {error}=await s.from('trip_origins').upsert({trip_id:tripId,user_id:uid,airport},{onConflict:'trip_id,user_id,airport'});if(error)throw error;await emit(s,tripId,uid,'origin_added',{airport});return NextResponse.json({ok:true});
    }
    return fail('Unknown planning action.');
  }catch(e){return fail(e instanceof Error?e.message:'Could not save that update.',500)}
}
