import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, KeyRound, ShieldCheck } from "lucide-react";
import { accountAction } from "../lib/supabase";

const pinFilter = value => value.replace(/\D/g, "").slice(0,4);

// Email recovery is initiated by a one-use Supabase "recovery" OTP.
// The token is exchanged on the server, then immediately removed from the URL.
// The resulting grant exists ONLY in this component's memory.
export default function ResetPin({ onBack, onComplete }) {
  const [phase,setPhase] = useState("verifying");
  const [grant,setGrant] = useState(null);
  const [pin,setPin] = useState("");
  const [confirm,setConfirm] = useState("");
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const url = new URL(window.location.href);
    const hash = url.searchParams.get("token_hash");
    const type = url.searchParams.get("type");
    // Never keep the email recovery token in the URL after reading it.
    window.history.replaceState({}, "", window.location.pathname);
    if (type !== "recovery" || !hash || !/^[a-zA-Z0-9_-]{8,512}$/.test(hash)) {
      setPhase("invalid");
      return;
    }
    accountAction({ action:"begin-email-recovery", tokenHash:hash }).then(result => {
      setGrant(result.grant); setPhase("ready");
    }).catch(() => {
      setPhase("invalid");
    });
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (!/^\d{4}$/.test(pin)) { setMessage("Enter a four-digit PIN."); return; }
    if (pin !== confirm) { setMessage("The PINs do not match."); return; }
    if (!grant) { setMessage("This recovery link is no longer valid."); return; }
    setBusy(true); setMessage("");
    try {
      await accountAction({ action:"finish-email-recovery", grant, newPin:pin });
      setGrant(null); setPin(""); setConfirm(""); setPhase("success");
    } catch { setMessage("Unable to reset PIN. Your recovery link may have expired. Request a new email."); }
    finally { setBusy(false); }
  }

  return <div className="recovery-screen"><section className="recovery-card" aria-live="polite">
    <div className="recovery-symbol"><KeyRound size={26}/></div>
    {phase === "verifying" && <><h1>Verifying recovery link</h1><p className="helper">Please wait while we confirm your email recovery request.</p></>}
    {phase === "invalid" && <><h1>Link expired or invalid</h1><p className="helper">This link cannot be used. Request a new recovery email from the login screen.</p><button className="btn btn-primary" onClick={onBack}><ArrowLeft size={16}/>Back to login</button></>}
    {phase === "ready" && <><h1>Reset your PIN</h1><p className="helper">Email verified. Choose a new four-digit PIN for your account.</p>
      <form onSubmit={submit} className="recovery-form">
        <label>New 4-digit PIN<input autoFocus type="password" inputMode="numeric" autoComplete="new-password" maxLength={4} pattern="[0-9]{4}" value={pin} onChange={e=>{setPin(pinFilter(e.target.value));setMessage("");}} required/></label>
        <label>Confirm new PIN<input type="password" inputMode="numeric" autoComplete="new-password" maxLength={4} pattern="[0-9]{4}" value={confirm} onChange={e=>{setConfirm(pinFilter(e.target.value));setMessage("");}} required/></label>
        {message && <p className="error" role="alert">{message}</p>}
        <button className="btn btn-primary" disabled={busy || pin.length!==4 || confirm.length!==4}>{busy ? "Resetting..." : "Save new PIN"}</button>
        <button type="button" className="text-button" disabled={busy} onClick={onBack}>Cancel and return to login</button>
      </form></>}
    {phase === "success" && <><CheckCircle2 color="#168555" size={32}/><h1>PIN reset successful</h1><p className="helper">Your new PIN is ready. Sign in using your account and new PIN.</p><button className="btn btn-primary" onClick={onComplete}><ShieldCheck size={16}/>Return to account selection</button></>}
  </section></div>;
}
