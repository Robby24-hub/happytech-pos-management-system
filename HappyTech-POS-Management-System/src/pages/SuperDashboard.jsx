import { Activity, ShieldCheck, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { accountAction } from "../lib/supabase";
import { ActivityList } from "./ActivityLogs";

export default function SuperDashboard() {
  const [summary, setSummary] = useState({total:0,active:0});
  const [error, setError] = useState("");
  useEffect(() => {
    let active=true;
    accountAction({action:"list-admins"})
      .then(({admins=[]}) => {if(active)setSummary({total:admins.length,active:admins.filter(a=>a.active).length});})
      .catch(e=>{if(active)setError(e.message);});
    return ()=>{active=false;};
  }, []);
  return <main className="main">
    <p className="eyebrow">SUPER ADMIN</p>
    <h2 className="text-2xl">System Overview</h2>
    <p className="helper mt-2">Live administration overview and security audit activity from Supabase.</p>
    {error && <p className="account-notice error-text" role="alert">{error}</p>}
    <div className="super-stats mt-5">
      <section className="card"><ShieldCheck/><strong>{summary.total}</strong><span>Admin accounts</span></section>
      <section className="card"><Users/><strong>{summary.active}</strong><span>Active Admins</span></section>
      <section className="card"><Activity/><strong>Cloud</strong><span>Security activity recorded</span></section>
    </div>
    <ActivityList compact limit={12}/>
  </main>;
}
