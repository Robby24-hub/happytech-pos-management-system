import { useEffect, useState } from "react";
import { ArrowLeft, Clock, Lightbulb, Delete, UserRound, Mail } from "lucide-react";
import { Button, Icon } from "../components/UI";
import { supabase, listAccounts, signInPin, accountAction } from "../lib/supabase";

export default function Login({ onLogin }) {
  const [accounts, setAccounts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [recovery, setRecovery] = useState(false);
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let alive = true;
    listAccounts().then(data => alive && setAccounts(data)).catch(e => alive && setError(e.message));
    return () => { alive = false; };
  }, []);
  async function submit(e) {
    e.preventDefault();
    if (!selected || pin.length !== 4) return;
    setBusy(true); setError("");
    try { await signInPin(selected.id, pin); await onLogin(); }
    catch (e) { setError(e.message); setPin(""); }
    finally { setBusy(false); }
  }
  async function recover(e) {
    e.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      // Does not disclose if email belongs to an account.
      await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
      setNotice("If the email is registered, a recovery link will arrive shortly. Contact your administrator if you are a cashier.");
    } catch { setNotice("If the email is registered, a recovery link will arrive shortly."); }
    finally { setBusy(false); }
  }
  return <div className="login-screen">
    <aside className="login-brand">
      <div className="flex items-center gap-3 text-2xl font-bold"><span className="brand"><Icon name="imgLucideLayoutDashboard" screen="45-7300" /></span>HappyTech POS</div>
      <div className="login-hero"><img src="/assets/0a319.png" alt="Cashier at a point of sale counter" /><h2>Ready to serve your customers</h2><p>Choose your account and enter your PIN to continue.</p></div>
      <div><div className="login-tip"><div><strong>{new Date().toLocaleDateString("en-PH", { weekday:"long", day:"numeric", month:"short", year:"numeric" })}</strong><p>{new Date().toLocaleTimeString("en-PH", { hour:"2-digit", minute:"2-digit" })}</p></div><Clock size={20}/></div><div className="login-tip mt-4"><Lightbulb size={19}/><p>Keep your PIN private and lock the terminal when stepping away.</p></div></div>
    </aside>
    <main className="login-main"><section className="login-card">
      {recovery ? <><button className="text-button" onClick={()=>{setRecovery(false);setError("");}}><ArrowLeft size={16}/>Back to login</button><h1>Recover Account</h1><p className="helper text-center">For Admin and Super Admin accounts, request an email recovery link. Cashiers should ask an Admin for help.</p><form onSubmit={recover} className="grid gap-4 mt-7"><label>Email address<input className="account-email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com" /></label><Button primary disabled={busy}><Mail size={16}/>Send recovery link</Button></form>{notice && <p className="helper mt-4" role="status">{notice}</p>}</> : !selected ? <><h1>Select your account</h1><p className="helper text-center">Tap your profile to sign in</p><div className="account-grid">{accounts.map(a=><button key={a.id} className="account-choice" onClick={()=>{setSelected(a);setPin("");setError("");}}><span className="account-avatar">{a.avatar_url?<img src={a.avatar_url} alt=""/>:<UserRound/>}</span><strong>{a.name}</strong></button>)}</div>{!accounts.length && <p className="helper text-center mt-6">{error || "No accounts yet. Your system administrator must set up the first account."}</p>}</> : <><button className="text-button" onClick={()=>{setSelected(null);setPin("");setError("");}}><ArrowLeft size={16}/>Change account</button><span className="account-avatar account-avatar-large">{selected.avatar_url?<img src={selected.avatar_url} alt=""/>:<UserRound/>}</span><h1>{selected.name}</h1><p className="helper text-center">Enter your 4-digit PIN</p><form onSubmit={submit}><input autoFocus className="pin-input" aria-label="4-digit PIN" type="password" inputMode="numeric" autoComplete="off" maxLength={4} value={pin} onChange={e=>{setPin(e.target.value.replace(/\D/g, "").slice(0,4));setError("");}} placeholder="••••"/><div className="keypad">{["1","2","3","4","5","6","7","8","9","Clear","0","⌫"].map(key=><button type="button" key={key} onClick={()=>setPin(p=>key==="Clear"?"":key==="⌫"?p.slice(0,-1):(p+key).slice(0,4))}>{key==="⌫"?<Delete size={20}/>:key}</button>)}</div>{error && <p className="error" role="alert">{error}</p>}<Button primary className="w-full mt-4" disabled={busy||pin.length!==4}>{busy?"Signing in...":"Continue"}</Button></form></>}
      <button className="text-button mx-auto mt-5" onClick={()=>{setRecovery(!recovery);setPin("");setError("");}}> {recovery?"Back to sign in":"Forgot PIN?"} </button>
    </section><p className="login-footer">HappyTech POS &amp; Management System</p></main>
  </div>;
}
