import {NextResponse} from 'next/server';
import {searchRoamPhotos,trackRoamPhotoSelection} from '@/lib/photos';

export async function GET(request:Request){
  const query=new URL(request.url).searchParams.get('q')||'';
  if(query.length>100)return NextResponse.json({error:'Search up to 100 characters.'},{status:400});
  try{return NextResponse.json({photos:await searchRoamPhotos(query,6)},{headers:{'Cache-Control':'public, max-age=300, stale-while-revalidate=86400'}})}
  catch(error){console.error('Photo lookup failed:',error);return NextResponse.json({photos:[]})}
}

export async function POST(request:Request){
  try{const body=await request.json(),id=String(body.photo_id||'');if(!id)return NextResponse.json({error:'Choose a photo first.'},{status:400});await trackRoamPhotoSelection(id);return NextResponse.json({ok:true})}
  catch(error){console.error('Photo selection tracking failed:',error);return NextResponse.json({error:'Could not save that photo selection.'},{status:502})}
}
