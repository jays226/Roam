import AppNav from '@/components/app-nav';
import TripHeader from '@/components/trip-header';
import TripCrew from '@/components/trip-crew';
import CrewTravel from '@/components/crew-travel';
import {loadTripPage} from '@/lib/trip-page';

export default async function CrewPage({params}:{params:Promise<{code:string}>}){
  const {code}=await params,{s,trip,userId,me,members}=await loadTripPage(code);
  const {data:originRows}=await s.from('trip_origins').select('user_id,airport,users(first_name)').eq('trip_id',trip.id);
  const origins=(originRows||[]).map(origin=>({...origin,users:Array.isArray(origin.users)?origin.users[0]||null:origin.users}));
  const {data:travelRows,error:travelError}=await s.from('member_travel').select('*,users(first_name,last_name)').eq('trip_id',trip.id);
  const travel=travelError&&['42P01','PGRST205'].includes(travelError.code||'')?[]:(travelRows||[]).map(item=>({...item,users:Array.isArray(item.users)?item.users[0]||null:item.users}));
  const organizers=members.filter(member=>member.role==='admin'||member.role==='planner').length;
  return <main className="shell"><TripHeader trip={trip} members={members} active="crew"/><section className="section trip-main-content"><div className="page-title-row"><div><div className="eyebrow">YOUR TRIP PEOPLE</div><h1 className="page-title">Crew</h1><p className="muted">{members.length} members · {organizers} organizers</p></div></div><div className="crew-legend card"><span><i className="status-dot status-dot-green"/>Locked in</span><span><i className="status-dot status-dot-amber"/>In, deposit pending</span><span><i className="status-dot status-dot-gray"/>Waiting</span></div><TripCrew tripId={trip.id} createdBy={trip.created_by} currentUserId={userId} currentRole={me.role} members={members} origins={origins}/><CrewTravel tripId={trip.id} members={members} travel={travel} currentUserId={userId} destination={trip.destination||''} startDate={trip.start_date} endDate={trip.end_date}/>{travelError&&!['42P01','PGRST205'].includes(travelError.code||'')&&<p className="form-error">Could not load saved travel status.</p>}</section><AppNav active="trips"/></main>;
}
