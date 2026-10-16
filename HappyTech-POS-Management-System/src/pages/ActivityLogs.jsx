import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Search, ShieldCheck } from "lucide-react";
import { Card, Button, Badge, Empty } from "../components/UI";
import { accountAction } from "../lib/supabase";

const names = {
  login_success: "Successful login", login_failed: "Failed PIN login", logout: "Signed out",
  pin_changed: "PIN changed", cashier_pin_reset: "Cashier PIN reset",
  account_created: "Account created", admin_activated: "Admin activated",
  admin_deactivated: "Admin deactivated", cashier_activated: "Cashier activated",
  cashier_deactivated: "Cashier deactivated", admin_deleted: "Admin permanently deleted",
  cashier_deleted: "Cashier permanently deleted",
};
export function ActivityList({ limit, compact = false }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result = await accountAction({action: "list-activity", limit: limit ?? 100});
      setLogs(result.logs ?? []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [limit]);
  useEffect(() => { void refresh(); }, [refresh]);
  const rows = logs.filter(x => [names[x.action] || x.action, x.actor_name, x.target_name, x.reason].join(" ").toLowerCase().includes(search.toLowerCase()));
  return <Card className="overflow-hidden mt-5">
    <div className="account-toolbar">
      <div><h2>{compact ? "Recent Security Activity" : "Security & Account Activity"}</h2><p className="helper">Audit events recorded in Supabase, not browser storage</p></div>
      <div className="account-toolbar-actions">
        {!compact && <label className="account-log-search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} aria-label="Search activity" placeholder="Search logs"/></label>}
        <Button disabled={loading} onClick={refresh}><RefreshCw size={16}/> Refresh</Button>
      </div>
    </div>
    {error && <div className="account-notice error-text" role="alert">{error}</div>}
    {loading ? <p className="helper p-5">Loading cloud activity...</p> : !rows.length ? <Empty>No recorded activity found.</Empty> :
      <div className="table-scroll"><table><thead><tr><th>Date & time</th><th>Performed by</th><th>Action</th><th>Account affected</th>{!compact && <th>Reason</th>}</tr></thead>
      <tbody>{rows.map(log => <tr key={log.id}>
        <td className="text-nowrap">{new Date(log.created_at).toLocaleString("en-PH")}</td>
        <td>{log.actor_name || (log.action === "login_failed" ? "Unverified login" : "Unknown / deleted user")}{log.actor_role ? <div className="helper">{log.actor_role}</div> : null}</td>
        <td><Badge tone={log.action.includes("deleted") || log.action === "login_failed" ? "red" : "gray"}>{names[log.action] || log.action}</Badge></td>
        <td>{log.target_name || "—"}{log.target_role && <div className="helper">{log.target_role}</div>}</td>
        {!compact && <td className="account-reason">{log.reason || "—"}</td>}
      </tr>)}</tbody></table></div>}
  </Card>;
}
export default function ActivityLogs({ user }) {
  return <main className="main"><p className="eyebrow">{user?.role === "Super Admin" ? "SUPER ADMIN" : "ADMIN"}</p><div className="flex items-center gap-3"><ShieldCheck size={24}/><h2 className="text-2xl">Activity Logs</h2></div><p className="helper mt-2">Logins, account changes, PIN changes, resets and deletions. Only authorized activity is shown.</p><ActivityList/></main>;
}
