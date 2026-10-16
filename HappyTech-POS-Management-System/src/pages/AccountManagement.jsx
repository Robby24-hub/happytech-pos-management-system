import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, Trash2, KeyRound, ShieldAlert } from "lucide-react";
import { Card, Button, Modal, Field, Badge, Empty } from "../components/UI";
import { accountAction } from "../lib/supabase";

const imageAsDataUrl = file => new Promise((resolve, reject) => {
  if (!file) return resolve(null);
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return reject(new Error("Use PNG, JPG or WebP."));
  if (file.size > 400000) return reject(new Error("The profile photo must be under 400 KB."));
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error("Unable to open the selected photo."));
  reader.readAsDataURL(file);
});

export default function AccountManagement({ type = "Admin" }) {
  const isAdmin = type === "Admin";
  const listAction = isAdmin ? "list-admins" : "list-cashiers";
  const statusAction = isAdmin ? "set-admin-status" : "set-cashier-status";
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dialog, setDialog] = useState(null);
  const [target, setTarget] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [tempPin, setTempPin] = useState("");
  const [managerPin, setManagerPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [reason, setReason] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [search, setSearch] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const result = await accountAction({ action: listAction });
      setAccounts(result[isAdmin ? "admins" : "cashiers"] ?? []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [isAdmin, listAction]);
  useEffect(() => { void reload(); }, [reload]);

  const clearForm = useCallback(() => {
    setName(""); setEmail(""); setAvatar(null); setTempPin("");
    setManagerPin(""); setNewPin(""); setConfirmPin("");
    setReason(""); setAcknowledged(false);
  }, []);
  const open = (kind, account = null) => {
    clearForm(); setError(""); setNotice(""); setTarget(account); setDialog(kind);
  };
  const close = useCallback(() => { if (!busy) { setDialog(null); clearForm(); } }, [busy, clearForm]);
  const run = async (fn, message) => {
    setBusy(true); setError(""); setNotice("");
    try {
      await fn();
      setDialog(null); clearForm();
      await reload();
      setNotice(message);
    } catch (e) { setError(e.message || "Something went wrong."); }
    finally { setBusy(false); }
  };
  const createAccount = e => {
    e.preventDefault();
    void run(async () => {
      if (name.trim().length < 2) throw new Error("Enter the account holder's full name.");
      if (!/^\d{4}$/.test(tempPin)) throw new Error("Temporary PIN must have four digits.");
      const avatarDataUrl = await imageAsDataUrl(avatar);
      await accountAction({ action: "create-account", role: type, name: name.trim(), ...(isAdmin ? {email: email.trim()} : {}), tempPin, avatarDataUrl });
    }, `${type} account created. Share the temporary PIN privately; it must be changed on first login.`);
  };
  const changeStatus = account => {
    if (!window.confirm(`${account.active ? "Deactivate" : "Activate"} ${account.name}?`)) return;
    void run(() => accountAction({ action: statusAction, accountId: account.id, active: !account.active }), `${account.name} ${account.active ? "deactivated" : "activated"}.`);
  };
  const removeAccount = e => {
    e.preventDefault();
    void run(async () => {
      if (reason.trim().length < 10) throw new Error("Provide a reason of at least 10 characters.");
      if (!/^\d{4}$/.test(managerPin)) throw new Error("Enter your own four-digit PIN.");
      if (!acknowledged) throw new Error("Confirm that you understand this deletion is permanent.");
      await accountAction({ action: "delete-account", accountId: target.id, managerPin, reason: reason.trim() });
    }, `${target.name} was permanently deleted. The deletion reason remains in the audit log.`);
  };
  const resetCashierPin = e => {
    e.preventDefault();
    void run(async () => {
      if (!/^\d{4}$/.test(managerPin)) throw new Error("Enter your own four-digit PIN.");
      if (!/^\d{4}$/.test(newPin) || newPin !== confirmPin) throw new Error("New PIN must be four digits and both entries must match.");
      await accountAction({ action: "reset-cashier-pin", accountId: target.id, managerPin, newPin });
    }, `PIN for ${target.name} was reset. They must change it on their next login.`);
  };
  const displayed = accounts.filter(a => `${a.name} ${a.email ?? ""}`.toLowerCase().includes(search.toLowerCase()));

  return <main className={isAdmin ? "main" : "cashier-management"}>
    {isAdmin && <p className="eyebrow">SUPER ADMIN</p>}
    {isAdmin && <h2 className="text-2xl">Admin Management</h2>}
    <p className="helper mt-2">Manage {type.toLowerCase()} access securely through Supabase. Account changes are recorded in Activity Logs.</p>
    {notice && <div role="status" className="account-notice success">{notice}</div>}
    {error && <div role="alert" className="account-notice error-text">{error}</div>}
    <Card className="mt-5 overflow-hidden">
      <div className="account-toolbar">
        <div><h2>{type} Accounts</h2><p className="helper">{loading ? "Loading..." : `${accounts.length} total accounts`}</p></div>
        <div className="account-toolbar-actions">
          <input aria-label={`Search ${type} accounts`} className="account-email account-search" placeholder="Search accounts" value={search} onChange={e=>setSearch(e.target.value)}/>
          <Button disabled={loading || busy} onClick={reload} title="Refresh accounts"><RefreshCw size={17}/> Refresh</Button>
          <Button primary onClick={()=>open("create")}><Plus size={18}/> Create {type}</Button>
        </div>
      </div>
      <div className="table-scroll">
        <table><thead><tr><th>Account</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>{displayed.map(account => <tr key={account.id}>
            <td><div className="account-cell">
              {account.avatar_url ? <img className="account-photo" src={account.avatar_url} alt=""/> : <span className="account-photo account-initial">{account.name?.[0]?.toUpperCase()}</span>}
              <div><strong>{account.name}</strong>{isAdmin && <div className="helper">{account.email || "No email"}</div>}</div>
            </div></td>
            <td><Badge tone={account.active ? "green" : "gray"}>{account.active ? "Active" : "Inactive"}</Badge></td>
            <td><div className="account-row-actions">
              {!isAdmin && <Button disabled={busy} onClick={()=>open("reset", account)}><KeyRound size={16}/> Reset PIN</Button>}
              <Button disabled={busy} onClick={()=>changeStatus(account)}>{account.active ? "Deactivate" : "Activate"}</Button>
              <Button danger disabled={busy} onClick={()=>open("delete", account)}><Trash2 size={16}/> Delete</Button>
            </div></td>
          </tr>)}</tbody></table>
        {!loading && !displayed.length && <Empty>No {type.toLowerCase()} accounts match your search.</Empty>}
      </div>
    </Card>

    {dialog === "create" && <Modal title={`Create ${type} Account`} onClose={close}>
      <form onSubmit={createAccount} className="account-form">
        <p className="helper">The new {type.toLowerCase()} will be asked to change their temporary PIN at first login.</p>
        <Field label="Full name" required maxLength={120} value={name} onChange={e=>setName(e.target.value)}/>
        {isAdmin && <Field label="Email address" required type="email" value={email} onChange={e=>setEmail(e.target.value)}/>}
        <Field label="Profile picture (optional)"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setAvatar(e.target.files?.[0] || null)}/><small className="helper">PNG, JPG or WebP; maximum 400 KB</small></Field>
        <Field label="Temporary 4-digit PIN" required type="password" inputMode="numeric" autoComplete="new-password" maxLength={4} pattern="[0-9]{4}" value={tempPin} onChange={e=>setTempPin(e.target.value.replace(/\D/g, "").slice(0,4))}/>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="modal-actions"><Button type="button" disabled={busy} onClick={close}>Cancel</Button><Button primary disabled={busy}><Plus size={17}/>{busy ? "Creating..." : `Create ${type}`}</Button></div>
      </form>
    </Modal>}

    {dialog === "delete" && target && <Modal title={`Permanently Delete ${type}`} onClose={close}>
      <form onSubmit={removeAccount} className="account-form">
        <div className="account-delete-warning"><ShieldAlert size={24}/><p><strong>Are you sure you want to permanently delete {target.name}?</strong><span>This will remove their login account and cannot be undone. Their security audit history will remain.</span></p></div>
        <Field label="Reason for deletion (required)"><textarea required minLength={10} maxLength={500} rows={3} placeholder="Explain why this account is being deleted" value={reason} onChange={e=>setReason(e.target.value)}/></Field>
        <Field label="Enter your own 4-digit PIN to verify" required type="password" inputMode="numeric" autoComplete="off" maxLength={4} pattern="[0-9]{4}" value={managerPin} onChange={e=>setManagerPin(e.target.value.replace(/\D/g, "").slice(0,4))}/>
        <label className="account-check"><input type="checkbox" required checked={acknowledged} onChange={e=>setAcknowledged(e.target.checked)}/> I understand that deleting this account is permanent.</label>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="modal-actions"><Button type="button" disabled={busy} onClick={close}>Cancel</Button><Button danger disabled={busy || !acknowledged}><Trash2 size={17}/>{busy ? "Deleting..." : "Confirm Delete"}</Button></div>
      </form>
    </Modal>}

    {dialog === "reset" && target && <Modal title={`Reset ${target.name}'s PIN`} onClose={close}>
      <form onSubmit={resetCashierPin} className="account-form">
        <p className="helper">An Admin must verify their own PIN before resetting a Cashier's PIN. The Cashier must change it again on their next login.</p>
        <Field label="Your Admin PIN" required type="password" inputMode="numeric" autoComplete="off" maxLength={4} pattern="[0-9]{4}" value={managerPin} onChange={e=>setManagerPin(e.target.value.replace(/\D/g, "").slice(0,4))}/>
        <Field label="New temporary PIN" required type="password" inputMode="numeric" maxLength={4} pattern="[0-9]{4}" value={newPin} onChange={e=>setNewPin(e.target.value.replace(/\D/g, "").slice(0,4))}/>
        <Field label="Confirm temporary PIN" required type="password" inputMode="numeric" maxLength={4} pattern="[0-9]{4}" value={confirmPin} onChange={e=>setConfirmPin(e.target.value.replace(/\D/g, "").slice(0,4))}/>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="modal-actions"><Button type="button" disabled={busy} onClick={close}>Cancel</Button><Button primary disabled={busy}>{busy ? "Resetting..." : "Reset Cashier PIN"}</Button></div>
      </form>
    </Modal>}
  </main>;
}
