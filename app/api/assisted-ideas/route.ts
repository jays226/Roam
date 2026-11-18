import {NextResponse} from 'next/server';
import {authorize} from '@/lib/authorize';

type Idea={destination:string;why_fits:string;best_for:string;start_date:string;end_date:string};
const options=[
  {destination:'Montreal, Canada',why_fits:'Walkable neighborhoods, great food, and a lively weekend without a packed schedule.',best_for:'Food + city'},
  {destination:'San Juan, Puerto Rico',why_fits:'Beach time and colorful old-town exploring are close enough to keep travel simple.',best_for:'Beach + culture'},
  {destination:'Asheville, North Carolina',why_fits:'A cabin base, mountain views, and an easy downtown make a relaxed group getaway.',best_for:'Outdoors + food'},
  {destination:'New Orleans, Louisiana',why_fits:'Music, local food, and distinct neighborhoods make it easy to shape the trip around your crew.',best_for:'Food + music'},
  {destination:'Savannah, Georgia',why_fits:'A compact historic center and nearby beach options work well for a low-key long weekend.',best_for:'Relaxed + coastal'},
  {destination:'Mexico City, Mexico',why_fits:'Museums, neighborhoods, and memorable food give the group plenty to choose from.',best_for:'Food + culture'},
  {destination:'Denver, Colorado',why_fits:'An easy city base with the option to add a day outdoors if the crew wants it.',best_for:'City + adventure'},
  {destination:'Lisbon, Portugal',why_fits:'Scenic walks, shared meals, and easy day plans make a strong first international trip.',best_for:'Food + international'},
  {destination:'Miami Beach, Florida',why_fits:'Beach afternoons and late dinners make it simple to mix group time with downtime.',best_for:'Beach + nightlife'},
  {destination:'Lake Tahoe, California / Nevada',why_fits:'A shared cabin makes it easy to plan lake, trail, or snow days at your own pace.',best_for:'Cabin + outdoors'}
];
const dateKey=(date:Date)=>date.toISOString().slice(0,10);
function startingFriday(month:string|undefined,index:number){
  const today=new Date(),base=month&&/^\d{4}-\d{2}$/.test(month)?new Date(`${month}-01T12:00:00Z`):new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth()+1,1,12));
  base.setUTCMonth(base.getUTCMonth()+index);const start=new Date(base);start.setUTCDate(start.getUTCDate()+((5-start.getUTCDay()+7)%7)+7*Math.floor(index/3));
  const min=new Date();min.setUTCDate(min.getUTCDate()+14);min.setUTCHours(12,0,0,0);if(start<min){start.setTime(min.getTime());start.setUTCDate(start.getUTCDate()+((5-start.getUTCDay()+7)%7))}
  return start;
}
function withDates(option:typeof options[number],month:string|undefined,nights:number,index:number):Idea{
  const start=startingFriday(month,index),end=new Date(start);end.setUTCDate(end.getUTCDate()+nights);
  return {...option,start_date:dateKey(start),end_date:dateKey(end)};
}
function validDate(value:unknown){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(`${value}T12:00:00Z`))}

export async function POST(request:Request){
  try{
    const body=await request.json(),tripId=String(body.trip_id||'');if(!tripId)return NextResponse.json({error:'Trip ID is required.'},{status:400});
    const {uid,s}=await authorize(tripId,true),recent=await s.from('events').select('id',{count:'exact',head:true}).eq('trip_id',tripId).eq('event_type','assisted_ideas_requested').gte('created_at',new Date(Date.now()-24*60*60*1000).toISOString());
    if(recent.error)throw recent.error;if((recent.count||0)>=8)return NextResponse.json({error:'We’ve made plenty of ideas for today. Try again tomorrow.'},{status:429});
    const vibe=String(body.vibe||'').slice(0,50),origin=String(body.origin||'').slice(0,100),month=String(body.month||''),nights=Math.max(2,Math.min(14,Number(body.nights)||4));
    let ideas:Idea[]=options.slice(0,6).map((option,index)=>withDates(option,month||undefined,nights,index)),source='curated';
    if(process.env.OPENAI_API_KEY){
      try{
        const today=dateKey(new Date()),response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'content-type':'application/json'},signal:AbortSignal.timeout(20000),body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-4.1-mini',max_output_tokens:1800,input:[{role:'system',content:`Help a friend group pick a destination and a real future date range. Today is ${today}. Return 3 varied, realistic options. Keep every start date at least 14 days after today. Use the requested month if given, otherwise spread options across the next several months. Each end date must be after its start date by about the requested number of nights. Never claim live availability or prices.`},{role:'user',content:JSON.stringify({origin,vibe,preferred_month:month||'flexible',nights,group_size:Math.max(2,Math.min(40,Number(body.group_size)||6))})}],text:{format:{type:'json_schema',name:'destination_date_ideas',strict:true,schema:{type:'object',properties:{ideas:{type:'array',minItems:3,maxItems:3,items:{type:'object',properties:{destination:{type:'string'},why_fits:{type:'string'},best_for:{type:'string'},start_date:{type:'string'},end_date:{type:'string'}},required:['destination','why_fits','best_for','start_date','end_date'],additionalProperties:false}}},required:['ideas'],additionalProperties:false}}}})});
        if(response.ok){const payload=await response.json(),raw=payload.output_text||payload.output?.flatMap((item:{content?:{text?:string}[]})=>item.content||[]).find((item:{text?:string})=>item.text)?.text,parsed=JSON.parse(raw),candidate=(parsed.ideas||[]) as Idea[];const floor=new Date();floor.setDate(floor.getDate()+14);const valid=candidate.filter(idea=>idea.destination&&idea.destination.length<=100&&validDate(idea.start_date)&&validDate(idea.end_date)&&Date.parse(`${idea.start_date}T12:00:00Z`)>=floor.getTime()&&Date.parse(`${idea.end_date}T12:00:00Z`)>Date.parse(`${idea.start_date}T12:00:00Z`));if(valid.length>=3){ideas=valid.slice(0,3);source='ai'}}
      }catch{source='curated'}
    }
    await s.from('events').insert({trip_id:tripId,user_id:uid,event_type:'assisted_ideas_requested',metadata:{source,count:ideas.length}});
    return NextResponse.json({ideas,source});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Could not find trip ideas right now.'},{status:400})}
}
