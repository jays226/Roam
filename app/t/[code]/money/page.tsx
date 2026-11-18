import AppNav from '@/components/app-nav';
import TripHeader from '@/components/trip-header';
import TripMoney from '@/components/trip-money';
import {loadTripPage} from '@/lib/trip-page';

export default async function MoneyPage({params}:{params:Promise<{code:string}>}){
  const {code}=await params,{s,trip,userId,me,members}=await loadTripPage(code);
  const {data:expenses,error}=await s.from('expenses').select('id,title,amount,expense_date,paid_by,expense_shares(user_id,share_amount,settled,users(first_name))').eq('trip_id',trip.id).order('expense_date',{ascending:false});
  if(error)throw error;
  const rows=(expenses||[]).map(expense=>({...expense,expense_shares:(expense.expense_shares||[]).map(share=>({...share,users:Array.isArray(share.users)?share.users[0]||null:share.users}))}));
  return <main className="shell"><TripHeader trip={trip} members={members} active="money"/><section className="section trip-main-content"><div className="page-title-row"><div><div className="eyebrow">DEPOSITS AND SHARED COSTS</div><h1 className="page-title">Money</h1><p className="muted">Clear totals help the whole crew commit.</p></div></div><TripMoney trip={trip} members={members} expenses={rows} currentUserId={userId} currentRole={me.role}/></section><AppNav active="trips"/></main>;
}
