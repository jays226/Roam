export type RoamPhoto={
  id:string;
  url:string;
  color:string|null;
  photographer:string;
  photographerUrl:string;
  sourceUrl:string;
  downloadUrl:string|null;
  provider:'unsplash'|'pexels';
};

const missingTable=(error:{code?:string}|null)=>!!error&&['42P01','PGRST205'].includes(error.code||'');
const normalizedQuery=(query:string)=>query.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').trim().replace(/\s+/g,' ').slice(0,100);

export async function searchRoamPhotos(query:string,count=6):Promise<RoamPhoto[]>{
  const key=normalizedQuery(query),limit=Math.max(1,Math.min(count,10));
  if(!key)return [];
  const {db}=await import('@/lib/supabase');
  const s=db();
  const cached=await s.from('photo_cache').select('photos,expires_at').eq('query_key',key).maybeSingle();
  if(!cached.error&&cached.data&&new Date(cached.data.expires_at).getTime()>Date.now())return (cached.data.photos as RoamPhoto[]).slice(0,limit);
  if(cached.error&&!missingTable(cached.error))throw cached.error;

  let provider:'unsplash'|'pexels'|null=null,photos:RoamPhoto[]=[];
  if(process.env.UNSPLASH_ACCESS_KEY){
    try{
      const url=new URL('https://api.unsplash.com/search/photos');url.searchParams.set('query',key);url.searchParams.set('per_page',String(limit));url.searchParams.set('orientation','landscape');
      const response=await fetch(url,{headers:{Authorization:`Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`},signal:AbortSignal.timeout(9000),next:{revalidate:0}});
      if(response.ok){const result=await response.json();photos=(result.results||[]).map((photo:{id:string;urls:{regular:string};color?:string;user:{name:string;links:{html:string}};links:{html:string;download_location:string}})=>({id:photo.id,url:photo.urls.regular,color:photo.color||null,photographer:photo.user.name,photographerUrl:photo.user.links.html,sourceUrl:photo.links.html,downloadUrl:photo.links.download_location,provider:'unsplash'}));provider='unsplash'}
    }catch(error){console.error('Unsplash photo search failed:',error)}
  }
  if(!photos.length&&process.env.PEXELS_API_KEY){
    try{
      const url=new URL('https://api.pexels.com/v1/search');url.searchParams.set('query',key);url.searchParams.set('per_page',String(limit));url.searchParams.set('orientation','landscape');
      const response=await fetch(url,{headers:{Authorization:process.env.PEXELS_API_KEY},signal:AbortSignal.timeout(9000),next:{revalidate:0}});
      if(response.ok){const result=await response.json();photos=(result.photos||[]).map((photo:{id:number;src:{large:string};avg_color?:string;photographer:string;photographer_url:string;url:string})=>({id:String(photo.id),url:photo.src.large,color:photo.avg_color||null,photographer:photo.photographer,photographerUrl:photo.photographer_url,sourceUrl:photo.url,downloadUrl:null,provider:'pexels'}));provider='pexels'}
    }catch(error){console.error('Pexels photo search failed:',error)}
  }
  if(provider&&photos.length){const {error}=await s.from('photo_cache').upsert({query_key:key,photos,provider,cached_at:new Date().toISOString(),expires_at:new Date(Date.now()+30*86400000).toISOString()},{onConflict:'query_key'});if(error&&!missingTable(error))console.error('Photo cache write failed:',error.message)}
  return photos;
}

export async function trackRoamPhotoSelection(id:string){
  const {db}=await import('@/lib/supabase');
  const {data,error}=await db().from('photo_cache').select('photos').limit(500);
  if(error){if(missingTable(error))return;throw error}
  const photo=(data||[]).flatMap(row=>row.photos as RoamPhoto[]).find(item=>item.id===id&&item.provider==='unsplash');
  if(!photo?.downloadUrl)return;
  const url=new URL(photo.downloadUrl);
  if(url.hostname!=='api.unsplash.com'||!url.pathname.includes('/photos/'))throw new Error('Invalid Unsplash download tracking URL.');
  const response=await fetch(url,{headers:{Authorization:`Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`},signal:AbortSignal.timeout(5000)});
  if(!response.ok)throw new Error('Could not track the selected Unsplash photo.');
}

export async function getRoamPhotoById(id:string):Promise<RoamPhoto|null>{
  if(!id)return null;
  const {db}=await import('@/lib/supabase');
  const {data,error}=await db().from('photo_cache').select('photos').limit(500);
  if(error){if(missingTable(error))return null;throw error}
  return (data||[]).flatMap(row=>row.photos as RoamPhoto[]).find(photo=>photo.id===id)||null;
}

export async function getRoamPhotosByIds(ids:string[]):Promise<Record<string,RoamPhoto>>{
  const wanted=new Set(ids.filter(Boolean));if(!wanted.size)return {};
  const {db}=await import('@/lib/supabase');const {data,error}=await db().from('photo_cache').select('photos').limit(500);
  if(error){if(missingTable(error))return {};throw error}
  return (data||[]).flatMap(row=>row.photos as RoamPhoto[]).filter(photo=>wanted.has(photo.id)).reduce((result,photo)=>{result[photo.id]=photo;return result},{} as Record<string,RoamPhoto>);
}
