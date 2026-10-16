import { useCallback, useEffect, useState } from "react";
import { accountAction } from "../lib/supabase";

const readAvatar = (file) => new Promise((resolve, reject) => {
  if (!file) return resolve(null);
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return reject(new Error('Choose a PNG, JPG, or WebP image.'));
  if (file.size > 400000) return reject(new Error('Image must be under 400 KB.'));
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error('Unable to read the image.'));
  reader.readAsDataURL(file);
});

export default function AdminManagement() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [tempPin, setTempPin] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const response = await accountAction({ action: 'list-admins' });
      setAdmins(response.admins || []);
      setError('');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const submit = async (event) => {
    event.preventDefault();
    setError(''); setResult(''); setBusy(true);
    try {
      if (!/^\d{4}$/.test(tempPin)) throw new Error('Temporary PIN must contain exactly four digits.');
      const avatarDataUrl = await readAvatar(avatar);
      await accountAction({ action:'create-account', role:'Admin', name:name.trim(), email:email.trim(), tempPin, avatarDataUrl });
      setName(''); setEmail(''); setTempPin(''); setAvatar(null);
      setResult('Admin account created. Give the temporary PIN to the Admin privately; a PIN change is required on first login.');
      await reload();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const changeStatus = async (admin) => {
    const active = !admin.active;
    if (!window.confirm(`${active ? 'Reactivate' : 'Deactivate'} ${admin.name}?`)) return;
    setEditingId(admin.id); setError(''); setResult('');
    try {
      await accountAction({ action: 'set-admin-status', accountId: admin.id, active });
      setResult(`${admin.name} ${active ? 'reactivated' : 'deactivated'}.`);
      await reload();
    } catch (err) { setError(err.message); }
    finally { setEditingId(null); }
  };

  return <main className="main">
    <p className="eyebrow">SUPER ADMIN</p>
    <h2>Admin Management</h2>
    <p className="helper mt-2">Create Admin accounts and control their access using Supabase.</p>
    {error && <div role="alert" className="card p-4 mt-4" style={{color:'#b42318'}}>{error}</div>}
    {result && <div role="status" className="card p-4 mt-4" style={{color:'#16754f'}}>{result}</div>}
    <div className="card p-6 mt-6">
      <h2>Create Admin</h2>
      <form onSubmit={submit} className="grid gap-3 mt-4" style={{maxWidth:480}}>
        <label>Full Name<input className="account-email" required maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label>
        <label>Email address<input className="account-email" type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
        <label>Profile picture (optional, PNG/JPG/WebP, under 400 KB)<input className="account-email" type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setAvatar(e.target.files?.[0]||null)}/></label>
        <label>Temporary 4-digit PIN<input className="account-email" type="password" autoComplete="new-password" inputMode="numeric" maxLength={4} pattern="[0-9]{4}" required value={tempPin} onChange={e=>setTempPin(e.target.value.replace(/\D/g,'').slice(0,4))}/></label>
        <button disabled={busy} className="btn btn-primary">{busy?'Creating...':'Create Admin'}</button>
      </form>
      <p className="helper mt-3">The Admin will have to change this PIN on first sign-in. Share it privately, never by public screenshot.</p>
    </div>
    <div className="card p-6 mt-6">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}><h2>Admin Accounts</h2><button className="btn" onClick={reload} disabled={loading}>Refresh</button></div>
      {loading && <p className="helper mt-3">Loading accounts...</p>}
      {!loading && !admins.length && <p className="helper mt-3">No Admin accounts found.</p>}
      {admins.map(admin=><div className="system-event" key={admin.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          {admin.avatar_url ? <img src={admin.avatar_url} alt="" style={{width:42,height:42,borderRadius:'50%',objectFit:'cover'}}/> : <span aria-hidden="true" style={{width:42,height:42,borderRadius:'50%',background:'#eaf7f1',display:'grid',placeItems:'center',fontWeight:700}}>{admin.name?.[0]?.toUpperCase()}</span>}
          <div><strong>{admin.name}</strong><div className="helper">{admin.email || 'No email'}</div></div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12}}><span>{admin.active?'Active':'Inactive'}</span><button className="btn" disabled={editingId===admin.id} onClick={()=>changeStatus(admin)}>{editingId===admin.id?'Saving...':admin.active?'Deactivate':'Reactivate'}</button></div>
      </div>)}
    </div>
  </main>;
}
