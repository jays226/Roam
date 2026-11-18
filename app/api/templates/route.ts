import {NextResponse} from 'next/server';
import {authorize} from '@/lib/authorize';
import {currentUserId} from '@/lib/session';
import {db} from '@/lib/supabase';
import {privacySafeBlocks,sanitizeTemplateText,sanitizeTemplateUrl} from '@/lib/template-privacy.mjs';

const tagsAllowed=new Set(['Spring break','Beach','City','Budget','Nightlife','Multi-city','Food','Ski','Adventure','Weekend','Road trip','International']);
const safeError=(error:unknown)=>error instanceof Error?error.message:'Could not load shared trips.';

export async function GET(request:Request){
  try{
    const params=new URL(request.url).searchParams,s=db();let query=s.from('templates').select('id,title,description,tags,season,days,cities_json,price_level,cover_image,cover_photo_id,creator_display_name,view_count,created_at,template_uses(count),template_saves(count),template_ratings(rating)').eq('published',true);
    const tag=params.get('tag');if(tag&&tagsAllowed.has(tag))query=query.contains('tags',[tag]);
    const length=params.get('length');if(length==='short')query=query.lte('days',4);else if(length==='week')query=query.gte('days',5).lte('days',9);else if(length==='long')query=query.gte('days',10);
    const {data,error}=await query.limit(60);if(error)throw error;
    let rows=(data||[]).map(row=>{const ratings=(row.template_ratings||[]).map((x:{rating:number})=>x.rating),uses=row.template_uses?.[0]?.count||0,saves=row.template_saves?.[0]?.count||0;return {...row,uses,saves,rating:ratings.length?ratings.reduce((a:number,b:number)=>a+b,0)/ratings.length:null,rating_count:ratings.length,multi_city:(row.cities_json||[]).length>1}});
    const multi=params.get('cities');if(multi==='multi')rows=rows.filter(row=>row.multi_city);if(multi==='single')rows=rows.filter(row=>!row.multi_city);
    const sort=params.get('sort')||'trending';if(sort==='new')rows.sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at));else if(sort==='rated')rows.sort((a,b)=>(b.rating||0)-(a.rating||0));else rows.sort((a,b)=>(b.uses*10+b.view_count+b.saves*2)-(a.uses*10+a.view_count+a.saves*2));
    return NextResponse.json({templates:rows});
  }catch(error){return NextResponse.json({error:safeError(error)},{status:500})}
}

export async function POST(request:Request){
  try{
    const x=await request.json(),action=String(x.action||'publish'),tripId=String(x.trip_id||'');
    if(action==='report'){
      const id=String(x.template_id||'');if(!id)return NextResponse.json({error:'Choose a trip template to report.'},{status:400});
      const userId=await currentUserId(),s=db();const {error}=await s.from('template_reports').insert({template_id:id,user_id:userId,reason:String(x.reason||'').slice(0,300)||null});if(error)throw error;
      await s.from('template_events').insert({template_id:id,user_id:userId,event_type:'explore_reported',metadata:{reason:String(x.reason||'').slice(0,100)}});return NextResponse.json({ok:true});
    }
    if(!tripId)return NextResponse.json({error:'Trip ID is required.'},{status:400});
    const {uid,role,s}=await authorize(tripId);if(role!=='admin')return NextResponse.json({error:'Only trip organizers can share a template.'},{status:403});
    if(action==='unpublish'){
      const {data:template,error}=await s.from('templates').update({published:false,updated_at:new Date().toISOString()}).eq('source_trip_id',tripId).select('id').maybeSingle();if(error)throw error;if(!template)return NextResponse.json({error:'No published template was found.'},{status:404});
      await s.from('trips').update({is_template_source:false}).eq('id',tripId);await s.from('template_events').insert({template_id:template.id,user_id:uid,event_type:'template_unpublished'});return NextResponse.json({ok:true});
    }
    const {data:trip,error:tripError}=await s.from('trips').select('id,name,destination,start_date,end_date,date_mode,window_start,window_end,nights,cover_image,cover_photo_id').eq('id',tripId).maybeSingle();
    if(tripError){if(/column|schema cache/i.test(tripError.message))return NextResponse.json({error:'Apply supabase/migrations/0004_journey_foundation.sql and 0005_explore_templates.sql before publishing.'},{status:503});throw tripError}if(!trip)return NextResponse.json({error:'Trip not found.'},{status:404});
    const [memberResult,blockResult,cityResult,creatorResult]=await Promise.all([
      s.from('trip_members').select('users(first_name,last_name,phone)').eq('trip_id',tripId),
      s.from('itinerary_items').select('*').eq('trip_id',tripId).order('day').order('time_label'),
      s.from('trip_cities').select('city,nights,position').eq('trip_id',tripId).order('position'),
      s.from('users').select('first_name,last_name,template_display_name').eq('id',uid).maybeSingle()
    ]);
    if(memberResult.error)throw memberResult.error;if(blockResult.error)throw blockResult.error;if(cityResult.error&&!['42P01','PGRST205'].includes(cityResult.error.code||''))throw cityResult.error;if(creatorResult.error)throw creatorResult.error;
    const names=(memberResult.data||[]).flatMap(member=>{const u=Array.isArray(member.users)?member.users[0]:member.users;return u?[`${u.first_name||''} ${u.last_name||''}`.trim(),u.first_name,u.last_name].filter(Boolean) as string[]:[]});
    const title=sanitizeTemplateText(String(x.title||trip.name),names).slice(0,100)||'A trip with friends';
    const description=sanitizeTemplateText(String(x.description||''),names).slice(0,500);
    const validTags=Array.isArray(x.tags)?x.tags.map(String).filter((tag:string)=>tagsAllowed.has(tag)).slice(0,8):[];
    const cityData=(cityResult.data||[]).map(row=>({city:sanitizeTemplateText(row.city,names),nights:Number(row.nights)||1})).filter(row=>row.city);
    const fallbackCity=String(trip.destination||'').split(/\s*(?:→|>|\|)\s*|\s+(?:&|and)\s+|\/|,\s*/i).filter(Boolean);
    const cities=cityData.length?cityData:fallbackCity.map(city=>({city:sanitizeTemplateText(city,names),nights:1}));
    const start=trip.start_date?new Date(`${trip.start_date}T12:00:00`):trip.window_start?new Date(`${trip.window_start}T12:00:00`):null;
    let days=Number(trip.nights)||0;if(trip.start_date&&trip.end_date)days=Math.round((Date.parse(trip.end_date)-Date.parse(trip.start_date))/86400000)+1;if(!days)days=cities.reduce((sum,city)=>sum+city.nights,0);days=Math.max(1,Math.min(60,days));
    const blocks=privacySafeBlocks((blockResult.data||[]).map(block=>({...block,day_index:block.day_index||(block.day&&start?Math.max(1,Math.round((Date.parse(block.day)-Date.parse(start.toISOString()))/86400000)+1):1)})),names);
    const costs=(blockResult.data||[]).map(block=>Number(block.cost)).filter(value=>Number.isFinite(value)&&value>0),average=costs.length?costs.reduce((a,b)=>a+b,0)/costs.length:0,priceLevel=average?average<150?'$':average<500?'$$':'$$$':null;
    const month=start?.getMonth()??(trip.window_start?new Date(`${trip.window_start}T12:00:00`).getMonth():null),season=month===null?null:month<=1||month===11?'Winter':month<=4?'Spring':month<=7?'Summer':'Fall';
    const creator=creatorResult.data,displayName=sanitizeTemplateText(String(x.creator_display_name||creator?.template_display_name||`${creator?.first_name||'Roam'}${creator?.last_name?` ${creator.last_name[0]}.`:''}`),names).slice(0,50)||'Roam traveler';
    const payload={source_trip_id:tripId,creator_user_id:uid,creator_display_name:displayName,title,description,tags:validTags,season,days,cities_json:cities,blocks_json:blocks,price_level:priceLevel,cover_image:sanitizeTemplateUrl(trip.cover_image),cover_photo_id:trip.cover_photo_id,published:true,updated_at:new Date().toISOString()};
    const {data:template,error}=await s.from('templates').upsert(payload,{onConflict:'source_trip_id'}).select('id').single();if(error)throw error;
    await s.from('trips').update({is_template_source:true}).eq('id',tripId);await s.from('template_events').insert({template_id:template.id,user_id:uid,event_type:'template_published',metadata:{blocks:blocks.length,tags:validTags}});
    await s.from('events').insert({trip_id:tripId,user_id:uid,event_type:'template_published',metadata:{template_id:template.id,blocks:blocks.length}});
    return NextResponse.json({ok:true,id:template.id,blocks:blocks.length});
  }catch(error){return NextResponse.json({error:safeError(error)},{status:400})}
}
