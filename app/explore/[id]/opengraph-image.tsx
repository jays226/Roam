import {ImageResponse} from 'next/og';
import {db} from '@/lib/supabase';
export const runtime='edge';
export const alt='A group trip plan shared on Roam';
export const size={width:1200,height:630};
export const contentType='image/png';
export default async function Image({params}:{params:Promise<{id:string}>}){const {id}=await params;let title='Explore getaways',places='Real trips · New ideas',cover='';try{const {data}=await db().from('templates').select('title,cities_json,days,cover_image').eq('id',id).eq('published',true).maybeSingle();if(data){title=data.title;places=`${data.days} days · ${(data.cities_json||[]).map((city:{city:string})=>city.city).join(' → ')}`;cover=data.cover_image||''}}catch{}return new ImageResponse(<div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',justifyContent:'flex-end',padding:72,color:'#f3ede3',backgroundColor:'#16181c',backgroundImage:cover?`linear-gradient(180deg,#16181c11,#16181cee),url(${cover})`:'linear-gradient(135deg,#214f61,#1a1d23 58%,#975a2d)'}}><div style={{fontSize:24,color:'#f59a3c',letterSpacing:5,textTransform:'uppercase'}}>Roam · Shared trip plan</div><div style={{fontSize:68,fontWeight:700,lineHeight:1.05,marginTop:24}}>{title}</div><div style={{fontSize:30,marginTop:20,color:'#e9e3d8'}}>{places}</div></div>,size)}
