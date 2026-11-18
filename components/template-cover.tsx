'use client';

import DestinationPhoto from '@/components/destination-photo';
import type {RoamPhoto} from '@/lib/photos';
export default function TemplateCover({title,cities,photo,compact=false}:{title:string;cities:{city:string;nights:number}[];photo?:RoamPhoto|null;compact?:boolean}){
  return <DestinationPhoto query={cities[0]?.city||title} photoOverride={photo||null} className={`template-cover ${compact?'compact':''}`} alt={`${title} trip cover`}><div className="template-cover-copy"><span>{cities.map(city=>city.city).join(' → ')||'Group getaway'}</span></div></DestinationPhoto>;
}
