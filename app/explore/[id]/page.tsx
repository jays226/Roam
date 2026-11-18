import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {currentUserId} from '@/lib/session';
import {db} from '@/lib/supabase';
import {getRoamPhotosByIds,type RoamPhoto} from '@/lib/photos';
import TemplateDetail,{type TemplateDetailData} from '@/components/template-detail';

export const dynamic='force-dynamic';
type Params={params:Promise<{id:string}>};
async function load(id:string){const {data,error}=await db().from('templates').select('*,template_uses(count),template_saves(count),template_ratings(rating)').eq('id',id).eq('published',true).maybeSingle();if(error||!data)return null;const ratings=(data.template_ratings||[]).map((item:{rating:number})=>item.rating),cities=(data.cities_json||[]) as {city:string;nights:number}[],photos:Record<string,RoamPhoto>=await getRoamPhotosByIds(data.cover_photo_id?[data.cover_photo_id]:[]).catch(()=>({} as Record<string,RoamPhoto>));return {...data,cities_json:cities,uses:data.template_uses?.[0]?.count||0,saves:data.template_saves?.[0]?.count||0,rating:ratings.length?ratings.reduce((a:number,b:number)=>a+b,0)/ratings.length:null,rating_count:ratings.length,multi_city:cities.length>1,photo:data.cover_photo_id?photos[data.cover_photo_id]||null:null} as TemplateDetailData}

export async function generateMetadata({params}:Params):Promise<Metadata>{const {id}=await params,template=await load(id);if(!template)return {title:'Trip not found · Roam'};const places=template.cities_json.map(city=>city.city).join(' → '),description=`${template.days} days · ${places}. Browse the plan and use it for your own crew.`;return {title:`${template.title} · Roam`,description,openGraph:{title:template.title,description,images:[{url:`/explore/${id}/opengraph-image`,width:1200,height:630}]},twitter:{card:'summary_large_image',title:template.title,description,images:[`/explore/${id}/opengraph-image`]}}}

export default async function PublicTemplatePage({params}:Params){
  const {id}=await params,template=await load(id);if(!template)notFound();const userId=await currentUserId(),isCreator=userId===template.creator_user_id;
  let alreadySaved=false,canRate=false;
  if(userId){const s=db(),[save,use]=await Promise.all([s.from('template_saves').select('template_id').eq('template_id',id).eq('user_id',userId).maybeSingle(),s.from('template_uses').select('new_trip_id').eq('template_id',id).eq('user_id',userId).maybeSingle()]);alreadySaved=Boolean(save.data);if(use.data){const {data:trip}=await s.from('trips').select('end_date').eq('id',use.data.new_trip_id).maybeSingle();canRate=Boolean(trip?.end_date&&trip.end_date<new Date().toISOString().slice(0,10))}}
  const safe={...template,creator_user_id:'',source_trip_id:isCreator?template.source_trip_id:'',cover_photo_id:null};
  return <TemplateDetail template={safe} loggedIn={Boolean(userId)} isCreator={isCreator} canRate={canRate} alreadySaved={alreadySaved}/>;
}
