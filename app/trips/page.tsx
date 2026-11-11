'use client';

import {useEffect,useState} from 'react';
import Link from 'next/link';
import {ArrowRight,CalendarDays,Compass,Mountain,Plus,Trash2,UserRound,Users} from 'lucide-react';

type Trip={id:string;name:string;destination:string|null;start_date:string|null;end_date:string|null;commit_deadline:string;invite_code:string;deposit_amount:number;cover_image:string|null};
type Row={trip:Trip;membership:{role:string;status:string;payment_status:string}};

export default function Trips(){
  const [rows,setRows]=useState<Row[]>([]);
  const [error,setError]=useState('');
  const [actionError,setActionError]=useState('');
  const [loading,setLoading]=useState(true);
  const [deletingId,setDeletingId]=useState('');

  useEffect(()=>{
    fetch('/api/trips')
      .then(async response=>{
        const data=await response.json();
        if(!response.ok)throw new Error(data.error);
        setRows(data);
      })
      .catch(cause=>setError(cause.message))
      .finally(()=>setLoading(false));
  },[]);

  async function deleteTrip(trip:Trip){
    const confirmed=window.confirm(`Delete “${trip.name}” and all its trip details for everyone? This cannot be undone.`);
    if(!confirmed)return;
    setActionError('');
    setDeletingId(trip.id);
    try{
      const response=await fetch('/api/trips',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({trip_id:trip.id})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||'Could not delete this trip.');
      setRows(current=>current.filter(row=>row.trip.id!==trip.id));
    }catch(cause){
      setActionError(cause instanceof Error?cause.message:'Could not delete this trip.');
    }finally{
      setDeletingId('');
    }
  }

  return <main className="shell">
    <header className="row" style={{padding:22}}>
      <Link href="/" className="row" style={{justifyContent:'flex-start',color:'inherit',textDecoration:'none'}}><Mountain color="#f59a3c"/><b style={{fontSize:22}}>roam</b></Link>
      <Link href="/profile" className="btn secondary" aria-label="Your profile"><UserRound size={18}/></Link>
    </header>
    <section className="section">
      <div className="row">
        <div><div className="eyebrow">YOUR CREW, YOUR GETAWAYS</div><h1 style={{fontSize:34,margin:'8px 0'}}>Your trips</h1></div>
        <Link href="/create" className="btn"><Plus size={18}/> Start trip</Link>
      </div>
      {loading&&<div className="card muted">Loading your trips…</div>}
      {error&&<div className="card"><h2>Sign in to see your trips</h2><p className="muted">Your trips are saved to your phone-number profile.</p><Link className="btn" href="/login">Sign in <ArrowRight size={16}/></Link></div>}
      {actionError&&<div className="card" role="alert" style={{color:'#e5484d'}}>{actionError}</div>}
      {!loading&&!error&&rows.length===0&&<div className="card"><div className="avatar"><Compass size={18}/></div><h2>No trips yet</h2><p className="muted">Start one, or join a friend from their invite link. Your trips will all show up here.</p><Link className="btn" href="/create">Start a trip <ArrowRight size={16}/></Link></div>}
      <div style={{display:'grid',gap:16}}>
        {rows.map(({trip,membership})=><article key={trip.id} className="card" style={{padding:0,overflow:'hidden'}}>
          <Link href={`/t/${trip.invite_code}`} style={{display:'block',textDecoration:'none',color:'inherit'}}>
            <div className="cover" style={{minHeight:185,background:trip.cover_image?`linear-gradient(180deg,#16181c10,#16181cdd),url(${trip.cover_image}) center/cover`:'linear-gradient(135deg,#2e6e8e,#22252b 68%,#f59a3c)'}}>
              <div><span className={`chip ${membership.payment_status==='confirmed'?'status-green':membership.status==='in'?'status-amber':'status-gray'}`}>{membership.payment_status==='confirmed'?'Locked in':membership.status==='in'?'In · deposit pending':'Trip member'}</span><h2 style={{fontSize:27,margin:'10px 0 4px'}}>{trip.name}</h2><span className="muted">{trip.destination||'Destination TBD'}</span></div>
            </div>
          </Link>
          <div className="row" style={{padding:'12px 16px'}}>
            <Link href={`/t/${trip.invite_code}`} className="row muted" style={{justifyContent:'flex-start',fontSize:13,textDecoration:'none',flex:1,minWidth:0}}>
              <CalendarDays size={15}/>{trip.start_date?new Date(trip.start_date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'Dates flexible'} · {membership.role}<ArrowRight size={17} color="#f59a3c"/>
            </Link>
            {membership.role==='admin'&&<button type="button" className="btn secondary" aria-label={`Delete ${trip.name}`} title="Delete trip" disabled={deletingId===trip.id} onClick={()=>deleteTrip(trip)} style={{color:'#e5484d',padding:'9px 11px',flexShrink:0}}>
              <Trash2 size={17}/><span>{deletingId===trip.id?'Deleting…':'Delete'}</span>
            </button>}
          </div>
        </article>)}
      </div>
    </section>
    <nav className="nav"><Link className="active" href="/trips"><Mountain size={19}/>Trips</Link><Link href="/trips"><Users size={19}/>Activity</Link><Link href="/explore"><Compass size={19}/>Explore</Link><Link href="/profile"><UserRound size={19}/>Profile</Link></nav>
  </main>;
}
