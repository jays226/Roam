import type {Metadata} from 'next';
import {db} from '@/lib/supabase';
import {getRoamPhotosByIds,type RoamPhoto} from '@/lib/photos';
import ExploreFeed,{type ExploreTemplate} from '@/components/explore-feed';

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Explore trip plans · Roam',description:'Browse real group trips and make a shared plan your own.'};

export default async function ExplorePage(){
  let templates:ExploreTemplate[]=[],migrationMissing=false;
  try{
    const {data,error}=await db().from('templates').select('id,title,description,tags,season,days,cities_json,blocks_json,price_level,cover_image,cover_photo_id,creator_display_name,creator_user_id,view_count,created_at,template_uses(count),template_saves(count),template_ratings(rating)').eq('published',true).order('view_count',{ascending:false}).limit(30);
    if(error){if(['42P01','PGRST205'].includes(error.code||''))migrationMissing=true;else throw error}
    else{
      const ids=(data||[]).map(row=>row.cover_photo_id).filter((id):id is string=>!!id),photos:Record<string,RoamPhoto>=await getRoamPhotosByIds(ids).catch(()=>({} as Record<string,RoamPhoto>));
      templates=(data||[]).map(row=>{const ratings=(row.template_ratings||[]).map((value:{rating:number})=>value.rating),cities=(row.cities_json||[]) as {city:string;nights:number}[];return {...row,cities_json:cities,uses:row.template_uses?.[0]?.count||0,saves:row.template_saves?.[0]?.count||0,rating:ratings.length?ratings.reduce((sum:number,value:number)=>sum+value,0)/ratings.length:null,rating_count:ratings.length,multi_city:cities.length>1,photo:row.cover_photo_id?photos[row.cover_photo_id]||null:null}});
    }
  }catch(error){console.error('Explore templates failed:',error)}
  return <ExploreFeed initial={templates} migrationMissing={migrationMissing}/>;
}
