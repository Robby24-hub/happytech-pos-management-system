import { useState } from "react";
import { accountAction } from "../lib/supabase";
export default function ChangePin({ onDone }) {
  const [pin,setPin] = useState(""); const [confirm,setConfirm] = useState(""); const [error,setError] = useState(""); const [busy,setBusy] = useState(false);
  async function submit(e) { e.preventDefault(); if(!/^\d{4}$/.test(pin) || pin!==confirm) { setError("Enter matching 4-digit PINs."); return; } setBusy(true); try { await accountAction({action:"change-pin",newPin:pin}); await onDone(); } catch(e){setError(e.message);} finally {setBusy(false);} }
  return <main className="pin-change-screen"><form className="pin-change-card card" onSubmit={submit}><h1>Set your personal PIN</h1><p className="helper">You must change your temporary PIN before accessing the system.</p><label>New 4-digit PIN<input type="password" inputMode="numeric" maxLength={4} value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g, ""))}/></label><label>Confirm PIN<input type="password" inputMode="numeric" maxLength={4} value={confirm} onChange={e=>setConfirm(e.target.value.replace(/\D/g, ""))}/></label>{error && <p className="error" role="alert">{error}</p>}<button className="btn btn-primary" disabled={busy}> {busy?"Saving...":"Save new PIN"}</button></form></main>;
}
