import "./Login/Login.css";
import { useEffect, useState } from "react";
import { ArrowLeft, Clock, Lightbulb, Delete, UserRound, Mail, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button, Icon } from "../components/UI";
import { supabase, listAccounts, listRecoveryAdmins, signInPin, accountAction } from "../lib/supabase";

const pinOnly = value => value.replace(/\D/g, "").slice(0,4);
const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export default function Login({ onLogin }) {
  const [accounts, setAccounts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [recovery, setRecovery] = useState(""); // email | cashier-verify | cashier-reset | cashier-done
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("");
  const [admins, setAdmins] = useState([]);
  const [adminId, setAdminId] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [grant, setGrant] = useState(null); // short-lived server grant; memory only
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  useEffect(() => {
    let alive = true;
    listAccounts().then(data => alive && setAccounts(data)).catch(() => alive && setError("Accounts could not be loaded. Please try again."));
    return () => { alive = false; };
  }, []);
  function startOver() {
    setSelected(null); setPin(""); setRecovery(""); setEmail(""); setNotice("");
    setAdminId("");setAdminPin("");setGrant(null);setNewPin("");setConfirmPin("");setError("");
    listAccounts().then(setAccounts).catch(()=>setError("Accounts could not be loaded. Please try again."));
  }
  function enterRecovery() {
    setError(""); setNotice(""); setPin("");setGrant(null);
    if (selected?.role === "Cashier") {
      // Login chooser returns no roles; ask the backend whether the selected account is a Cashier.
      // The backend never trusts a client-provided role.
      setRecovery("cashier-verify");
      listRecoveryAdmins().then(list=>{setAdmins(list);setAdminId(list[0]?.id || "");})
        .catch(()=>setError("Administrators are unavailable. Please ask an Admin for help."));
    } else {
      setRecovery("email");
    }
  }
  async function submit(e) {
    e.preventDefault();
    if (!selected || !/^\d{4}$/.test(pin)) return;
    setBusy(true);setError("");
    try { await signInPin(selected.id,pin); await onLogin(); }
    catch { setError("Unable to sign in. Check your PIN or contact your administrator.");setPin(""); }
    finally { setBusy(false); }
  }
  async function recoverEmail(e) {
    e.preventDefault(); setError("");setNotice("");
    if (!validEmail(email)) { setError("Enter a valid email address.");return; }
    setBusy(true);
    try {
      // The custom Supabase Recovery email template must include TokenHash.
      // Redirect to our dedicated Reset PIN screen (never to the normal dashboard).
      await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-pin` });
      setNotice("If an eligible account uses this email, a recovery link will arrive shortly.");
    } catch {
      setNotice("If an eligible account uses this email, a recovery link will arrive shortly.");
    } finally {setBusy(false);}
  }
  async function verifyAdmin(e) {
    e.preventDefault();setError("");
    if (!adminId || !/^\d{4}$/.test(adminPin)) {setError("Select an Admin and enter their four-digit PIN.");return;}
    setBusy(true);
    try {
      const result = await accountAction({action:"begin-cashier-recovery", cashierId:selected.id, adminId, adminPin});
      setGrant(result.grant);setAdminPin("");setRecovery("cashier-reset");
    } catch {setError("Admin verification failed or the account is temporarily locked. Check the PIN or ask an Admin for assistance.");setAdminPin("");}
    finally {setBusy(false);}
  }
  async function resetCashier(e) {
    e.preventDefault();setError("");
    if (!/^\d{4}$/.test(newPin)) {setError("Enter a four-digit PIN.");return;}
    if (newPin !== confirmPin) {setError("The PINs do not match.");return;}
    setBusy(true);
    try {
      await accountAction({action:"finish-cashier-recovery",grant,newPin});
      setGrant(null);setNewPin("");setConfirmPin("");setRecovery("cashier-done");
    } catch {setError("Unable to reset the PIN. Verification may have expired; please start again.");}
    finally {setBusy(false);}
  }

  return <div className="login-screen">
    <aside className="login-brand">
      <div className="flex items-center gap-3 text-2xl font-bold"><span className="brand"><Icon name="imgLucideLayoutDashboard" screen="45-7300" /></span>HappyTech POS</div>
      <div className="login-hero"><img src="/assets/0a319.png" alt="Cashier at a point of sale counter"/><h2>Ready to serve your customers</h2><p>Choose your account and enter your PIN to continue.</p></div>
      <div className="login-brand-tips"><div className="login-tip"><div><strong>{new Date().toLocaleDateString("en-PH",{weekday:"long",day:"numeric",month:"short",year:"numeric"})}</strong><p>{new Date().toLocaleTimeString("en-PH",{hour:"2-digit",minute:"2-digit"})}</p></div><Clock size={20}/></div><div className="login-tip mt-4"><Lightbulb size={19}/><p>Keep your PIN private and lock the terminal when stepping away.</p></div></div>
    </aside>
    <main className="login-main"><section className="login-card">
      {recovery ? <>
        <button type="button" className="text-button" onClick={startOver}><ArrowLeft size={16}/>Back to account selection</button>
        {recovery==="email" && <><div className="recovery-heading-icon"><Mail size={22}/></div><h1>Recover your PIN</h1><p className="helper text-center">Admin and Super Admin accounts use a secure email recovery link.</p><form onSubmit={recoverEmail} className="recovery-form"><label>Email address<input className="account-email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com"/></label><Button primary disabled={busy}><Mail size={16}/>{busy?"Sending...":"Send recovery link"}</Button></form>{notice&&<p className="helper mt-4" role="status">{notice}</p>}</>}
        {recovery==="cashier-verify" && <><div className="recovery-heading-icon"><ShieldCheck size={22}/></div><h1>Admin Verification</h1><p className="helper text-center">Ask an Admin to authorize resetting <strong>{selected?.name}</strong>'s PIN.</p><form onSubmit={verifyAdmin} className="recovery-form"><label>Administrator<select className="account-email" value={adminId} onChange={e=>{setAdminId(e.target.value);setError("");}} required><option value="">Select an Admin</option>{admins.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label><label>Admin's 4-digit PIN<input type="password" className="account-email" inputMode="numeric" autoComplete="off" maxLength={4} pattern="[0-9]{4}" value={adminPin} onChange={e=>{setAdminPin(pinOnly(e.target.value));setError("");}} required/></label><Button primary disabled={busy||adminPin.length!==4||!adminId}>{busy?"Verifying...":"Verify Admin"}</Button></form>{!admins.length&&!error&&<p className="helper mt-4">No eligible Admin accounts found. Ask an administrator for help.</p>}</>}
        {recovery==="cashier-reset" && <><div className="recovery-heading-icon"><ShieldCheck size={22}/></div><h1>Set Cashier PIN</h1><p className="helper text-center">Admin verified. Choose a new PIN for <strong>{selected?.name}</strong>. Authorization expires shortly.</p><form onSubmit={resetCashier} className="recovery-form"><label>New 4-digit PIN<input className="account-email" type="password" inputMode="numeric" autoComplete="new-password" maxLength={4} pattern="[0-9]{4}" required value={newPin} onChange={e=>{setNewPin(pinOnly(e.target.value));setError("");}}/></label><label>Confirm new PIN<input className="account-email" type="password" inputMode="numeric" autoComplete="new-password" maxLength={4} pattern="[0-9]{4}" required value={confirmPin} onChange={e=>{setConfirmPin(pinOnly(e.target.value));setError("");}}/></label><Button primary disabled={busy||newPin.length!==4||confirmPin.length!==4}>{busy?"Saving...":"Save new PIN"}</Button></form></>}
        {recovery==="cashier-done" && <div className="recovery-done"><CheckCircle2 color="#168555" size={34}/><h1>PIN reset successful</h1><p className="helper">The Cashier can now sign in using their new PIN.</p><Button primary onClick={startOver}>Return to account selection</Button></div>}
      </> : !selected ? <><h1>Select your account</h1><p className="helper text-center">Tap your profile to sign in</p><div className="account-grid">{accounts.map(a=><button key={a.id} className="account-choice" onClick={()=>{setSelected(a);setPin("");setError("");}}><span className="account-avatar">{a.avatar_url?<img src={a.avatar_url} alt=""/>:<UserRound/>}</span><strong>{a.name}</strong></button>)}</div>{!accounts.length&&<p className="helper text-center mt-6">{error||"No accounts yet. Your system administrator must set up the first account."}</p>}</> : <><button className="text-button" onClick={()=>{setSelected(null);setPin("");setError("");}}><ArrowLeft size={16}/>Change account</button><span className="account-avatar account-avatar-large">{selected.avatar_url?<img src={selected.avatar_url} alt=""/>:<UserRound/>}</span><h1>{selected.name}</h1><p className="helper text-center">Enter your 4-digit PIN</p><form onSubmit={submit}><input autoFocus className="pin-input" aria-label="4-digit PIN" type="password" inputMode="numeric" autoComplete="off" maxLength={4} value={pin} onChange={e=>{setPin(pinOnly(e.target.value));setError("");}} placeholder="••••"/><div className="keypad">{["1","2","3","4","5","6","7","8","9","Clear","0","⌫"].map(key=><button type="button" key={key} onClick={()=>setPin(p=>key==="Clear"?"":key==="⌫"?p.slice(0,-1):(p+key).slice(0,4))}>{key==="⌫"?<Delete size={20}/>:key}</button>)}</div><Button primary className="w-full mt-4" disabled={busy||pin.length!==4}>{busy?"Signing in...":"Continue"}</Button></form></>}
      {error&&<p className="error mt-3" role="alert">{error}</p>}
      {(selected || recovery) && recovery!=="cashier-done" && <button type="button" className="text-button mx-auto mt-4" onClick={recovery?startOver:enterRecovery}>{recovery?"Back to sign in":"Forgot PIN?"}</button>}
    </section><p className="login-footer">HappyTech POS &amp; Management System</p></main>
  </div>;
}
