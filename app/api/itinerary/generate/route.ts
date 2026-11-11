import {NextResponse} from 'next/server';
import {authorize} from '@/lib/authorize';

// AI requests may take longer than Vercel's default function duration.
export const maxDuration=60;

type DayCity={day:string;city:string};
type GeneratedItem={day:string;time_label:string;city:string;title:string;details:string;estimated_cost:number;cost_type:'shared'|'per_signup'};

const fail=(error:string,status=400)=>NextResponse.json({error},{status});

export async function POST(req:Request){
  try{
    const body=await req.json(),tripId=String(body.trip_id||'');
    if(!tripId)return fail('Trip ID is required.');
    const {uid,s}=await authorize(tripId,true);
    if(!process.env.OPENAI_API_KEY)return fail('AI itinerary generation needs OPENAI_API_KEY in the app environment. You can still add activities manually.',503);

    const supplied=Array.isArray(body.days)?body.days as DayCity[]:[];
    const days=supplied.slice(0,31).map(x=>({day:String(x.day||''),city:String(x.city||'').trim()}));
    if(!days.length||days.some(x=>!/^\d{4}-\d{2}-\d{2}$/.test(x.day)||!x.city||x.city.length>100))return fail('Save a city for every trip day before generating an itinerary.');
    const {data:trip,error:tripError}=await s.from('trips').select('name,destination,start_date,end_date').eq('id',tripId).maybeSingle();
    if(tripError)throw tripError;if(!trip)return fail('Trip not found.',404);
    if(days.some(x=>(trip.start_date&&x.day<trip.start_date)||(trip.end_date&&x.day>trip.end_date)))return fail('A selected day is outside this trip.');

    const {count}=await s.from('events').select('id',{count:'exact',head:true}).eq('trip_id',tripId).eq('event_type','itinerary_ai_generated').gte('created_at',new Date(Date.now()-24*60*60*1000).toISOString());
    if((count||0)>=4)return fail('This trip has reached today’s AI itinerary limit. Try again tomorrow.',429);

    const response=await fetch('https://api.openai.com/v1/responses',{
      method:'POST',
      headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'content-type':'application/json'},
      signal:AbortSignal.timeout(30000),
      body:JSON.stringify({
        model:process.env.OPENAI_MODEL||'gpt-4.1-mini',
        max_output_tokens:4500,
        input:[
          {role:'system',content:'Build a practical, fun itinerary for a group trip. Use only the supplied trip dates and assigned cities. Return 2 or 3 activities per day, spread across morning, afternoon, and evening when practical. Include a short useful detail for each activity. Do not invent reservations, live availability, opening hours, booking links, or exact prices. Use an estimated_cost of 0 when a reliable rough estimate is not appropriate. Consider the city transition when consecutive dates have different cities.'},
          {role:'user',content:JSON.stringify({trip_name:trip.name,destination:trip.destination,day_cities:days})}
        ],
        text:{format:{type:'json_schema',name:'roam_itinerary',strict:true,schema:{type:'object',properties:{items:{type:'array',items:{type:'object',properties:{day:{type:'string'},time_label:{type:'string'},city:{type:'string'},title:{type:'string'},details:{type:'string'},estimated_cost:{type:'number'},cost_type:{type:'string',enum:['shared','per_signup']}},required:['day','time_label','city','title','details','estimated_cost','cost_type'],additionalProperties:false}}},required:['items'],additionalProperties:false}}}
      })
    });
    if(!response.ok){
      const providerError=await response.text();
      console.error('OpenAI itinerary request failed:',response.status,providerError.slice(0,1200));
      if(response.status===401)return fail('OpenAI rejected the API key. Check OPENAI_API_KEY in your local or Vercel environment.',503);
      if(response.status===429)return fail('OpenAI is rate-limiting this request or the API account has no available quota. Try later or check its billing.',503);
      if(response.status===400)return fail('OpenAI rejected the itinerary request. Check OPENAI_MODEL and the provider response in the server logs.',502);
      return fail('The AI itinerary service is unavailable right now. Try again in a moment.',502);
    }
    const payload=await response.json();
    const text=payload.output_text||payload.output?.flatMap((item:{content?:{text?:string}[]})=>item.content||[]).find((part:{text?:string})=>part.text)?.text;
    if(!text)return fail('The AI did not return an itinerary. Try again.',502);
    const parsed=JSON.parse(text) as {items:GeneratedItem[]};
    const allowedDays=new Map(days.map(x=>[x.day,x.city]));
    const items=(Array.isArray(parsed.items)?parsed.items:[]).filter(item=>allowedDays.has(item.day)).slice(0,30).map(item=>({
      trip_id:tripId,
      day:item.day,
      time_label:String(item.time_label||'').slice(0,40)||null,
      place:allowedDays.get(item.day)||item.city,
      title:String(item.title||'').trim().slice(0,160),
      note:String(item.details||'').trim().slice(0,1000)||null,
      cost:Number(item.estimated_cost)>0?Number(item.estimated_cost):null,
      cost_type:item.cost_type==='per_signup'?'per_signup':'shared',
      created_by:uid
    })).filter(item=>item.title);
    if(!items.length)return fail('The AI did not return activities for these dates. Try again.',502);
    const {data:saved,error}=await s.from('itinerary_items').insert(items).select();
    if(error)throw error;
    const {error:eventError}=await s.from('events').insert({trip_id:tripId,user_id:uid,event_type:'itinerary_ai_generated',metadata:{items:saved.length}});
    if(eventError)console.error('Could not record itinerary activity:',eventError.message);
    return NextResponse.json({ok:true,items:saved});
  }catch(error){
    console.error('AI itinerary generation failed:',error);
    return fail(error instanceof Error?error.message:'Could not generate an itinerary.',500);
  }
}
