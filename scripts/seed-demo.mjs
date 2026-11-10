import {createClient} from '@supabase/supabase-js';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key){console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY first.');process.exit(1)}
const supabase=createClient(url,key,{auth:{persistSession:false}});
const seedUsers=[
  {first_name:'Demo Organizer',last_name:'Roam',phone:'+15550100001'},
  {first_name:'Avery',last_name:'Demo',phone:'+15550100002'},
  {first_name:'Jordan',last_name:'Demo',phone:'+15550100003'},
  {first_name:'Sam',last_name:'Demo',phone:'+15550100004'},
  {first_name:'Riley',last_name:'Demo',phone:'+15550100005'}
];
const users=[];
for(const person of seedUsers){const {data,error}=await supabase.from('users').upsert(person,{onConflict:'phone'}).select('id').single();if(error)throw error;users.push(data.id)}
const {data:trip,error:tripError}=await supabase.from('trips').upsert({name:'Demo – Tulum Spring Break',destination:'Tulum, Mexico',start_date:'2027-03-07',end_date:'2027-03-14',commit_deadline:'2027-02-01',deposit_amount:150,venmo_username:'roam-demo',invite_code:'demo-tulum-2027',created_by:users[0],is_demo:true},{onConflict:'invite_code'}).select('id').single();if(tripError)throw tripError;
const members=users.map((user_id,i)=>({trip_id:trip.id,user_id,role:i===0?'admin':'traveler',status:i<3?'in':'pending',payment_status:i===0||i===1?'confirmed':'none',joined_at:new Date(Date.now()-(i+1)*86400000).toISOString()}));
const {error:memberError}=await supabase.from('trip_members').upsert(members,{onConflict:'trip_id,user_id'});if(memberError)throw memberError;
await supabase.from('events').insert([{trip_id:trip.id,user_id:users[0],event_type:'trip_created',metadata:{seed:'demo'}},{trip_id:trip.id,user_id:users[1],event_type:'responded_in',metadata:{seed:'demo'}}]);
console.log('Demo trip ready: /t/demo-tulum-2027');
