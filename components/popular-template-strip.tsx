'use client';

import {useEffect,useState} from 'react';
import Link from 'next/link';
import {ArrowRight} from 'lucide-react';
import TemplateCover from '@/components/template-cover';
import type {ExploreTemplate} from '@/components/explore-feed';
export default function PopularTemplateStrip(){const [templates,setTemplates]=useState<ExploreTemplate[]>([]);useEffect(()=>{fetch('/api/templates?sort=trending').then(r=>r.ok?r.json():null).then(data=>setTemplates((data?.templates||[]).slice(0,6))).catch(()=>{})},[]);if(!templates.length)return null;return <section className="popular-template-section"><div className="row"><div><div className="eyebrow">CREW-TESTED PLANS</div><h2>Trips worth stealing.</h2></div><Link href="/explore" className="btn ghost">Explore all <ArrowRight size={15}/></Link></div><div className="popular-template-scroll">{templates.map(template=><Link key={template.id} href={`/explore/${template.id}`} className="popular-template-card"><TemplateCover title={template.title} cities={template.cities_json} photo={template.photo}/><b>{template.title}</b><small>{template.days} days · {template.cities_json.map(city=>city.city).join(' → ')}</small></Link>)}</div></section>}
