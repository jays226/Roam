import {NextResponse} from 'next/server';import {authorize} from '@/lib/authorize';
const seed=[
  {name:'Tulum, Mexico',why_fits:'Beach clubs, cenotes, and a walkable town give a group a mix of slow days and nights out.',cost_estimate:950,best_for:'Beach + nightlife',vibe:'beach'},
  {name:'Montreal, Canada',why_fits:'Easy city exploring, late-night food, and neighborhoods that work well for a friend group.',cost_estimate:700,best_for:'Food + city',vibe:'city'},
  {name:'San Juan, Puerto Rico',why_fits:'Beach time and historic Old San Juan are close together, with no passport needed for US travelers.',cost_estimate:850,best_for:'Beach + culture',vibe:'beach'},
  {name:'Asheville, North Carolina',why_fits:'Cabins, mountain hikes, breweries, and a compact downtown make logistics easier.',cost_estimate:500,best_for:'Adventure + food',vibe:'adventure'},
  {name:'New Orleans, Louisiana',why_fits:'A lively food and music scene is centered around neighborhoods you can explore on foot.',cost_estimate:650,best_for:'Food + nightlife',vibe:'food'},
  {name:'Park City, Utah',why_fits:'A classic group ski trip with a walkable base village and mountain activities.',cost_estimate:1200,best_for:'Ski + outdoors',vibe:'ski'},
  {name:'Savannah, Georgia',why_fits:'Historic squares, coastal day trips, and restaurants create an easy long-weekend plan.',cost_estimate:550,best_for:'City + food',vibe:'city'},
  {name:'Nashville, Tennessee',why_fits:'Live music and group-friendly neighborhoods make a simple weekend itinerary.',cost_estimate:600,best_for:'Music + nightlife',vibe:'nightlife'},
  {name:'Denver, Colorado',why_fits:'A city stay can pair with a day in the mountains, with options for different budgets.',cost_estimate:700,best_for:'City + adventure',vibe:'adventure'},
  {name:'Charleston, South Carolina',why_fits:'Beach access, historic streets, and a strong restaurant scene fit a relaxed group getaway.',cost_estimate:700,best_for:'Beach + food',vibe:'food'},
  {name:'Lake Tahoe, California/Nevada',why_fits:'Shared cabins, lake days, and winter sports give the group flexible activity choices.',cost_estimate:800,best_for:'Outdoors + cabins',vibe:'adventure'},
  {name:'Cancún, Mexico',why_fits:'Large groups can stay together near the water and choose between quiet beach days and excursions.',cost_estimate:1000,best_for:'Beach + resort',vibe:'beach'}
];
function searchUrl(name:string){return `https://www.google.com/search?q=${encodeURIComponent(name+' travel ideas')}`}
export async function POST(req:Request){try{
  const x=await req.json(),tripId=String(x.trip_id||'');const {uid,s}=await authorize(tripId,true);
  const {count}=await s.from('events').select('id',{count:'exact',head:true}).eq('trip_id',tripId).eq('event_type','ai_recs_requested').gte('created_at',new Date(Date.now()-24*60*60*1000).toISOString());if((count||0)>=8)return NextResponse.json({error:'This trip has reached today’s ideas limit. Try again tomorrow.'},{status:429});
  const prompt={vibes:Array.isArray(x.vibes)?x.vibes.slice(0,6):[],budget:Number(x.budget)||null,group_size:Number(x.group_size)||null,origin:String(x.origin||'').slice(0,8),dates:String(x.dates||'').slice(0,80)};
  let ideas=seed.filter(i=>prompt.vibes.length===0||prompt.vibes.some((v:string)=>i.vibe===v.toLowerCase()));if(ideas.length<6)ideas=seed;
  let source='curated';
  if(process.env.OPENAI_API_KEY){try{
    const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'content-type':'application/json'},signal:AbortSignal.timeout(20000),body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-4.1-mini',max_output_tokens:1600,input:[{role:'system',content:'Suggest 6 to 8 plausible destinations for a college friend group. Treat all prices as rough estimates, never promise live prices, and never invent booking URLs. Return only the requested schema.'},{role:'user',content:JSON.stringify(prompt)}],text:{format:{type:'json_schema',name:'roam_trip_ideas',strict:true,schema:{type:'object',properties:{ideas:{type:'array',minItems:6,maxItems:8,items:{type:'object',properties:{name:{type:'string'},why_fits:{type:'string'},cost_estimate:{type:'number'},best_for:{type:'string'},vibe:{type:'string'}},required:['name','why_fits','cost_estimate','best_for','vibe'],additionalProperties:false}}},required:['ideas'],additionalProperties:false}}}})});
    if(response.ok){const payload=await response.json();const raw=payload.output_text||payload.output?.flatMap((o:{content?:{text?:string}[]})=>o.content||[]).find((c:{text?:string})=>c.text)?.text;const parsed=JSON.parse(raw);if(Array.isArray(parsed.ideas)&&parsed.ideas.length>=6){ideas=parsed.ideas.map((i:{name:string;why_fits:string;cost_estimate:number;best_for:string;vibe:string})=>({...i,cost_estimate:Number(i.cost_estimate)||0}));source='ai'}}
  }catch{source='curated'}}
  const result=ideas.slice(0,8).map(i=>({...i,search_url:searchUrl(i.name)}));
  await s.from('events').insert({trip_id:tripId,user_id:uid,event_type:'ai_recs_requested',metadata:{source,...prompt}});
  return NextResponse.json({ideas:result,source,prices_are_estimates:true});
}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Could not find ideas right now.'},{status:400})}}
