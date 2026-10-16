import { useState } from "react";
import {
  Pencil,
  Plus,
  Download,
  Upload,
  LogOut,
  Store,
  Users,
  Wallet,
  ReceiptText,
  SlidersHorizontal,
  Shield,
  HardDriveDownload,
} from "lucide-react";
import {
  Card,
  Button,
  Icon,
  Field,
  Modal,
  Badge,
  Empty,
} from "../components/UI";
import { dateTime } from "../data/mock";
import CashierManagement from "./CashierManagement";
import { accountAction } from "../lib/supabase";
const sections = [
  ["Store Information", "imgStore"],
  ["Cashier Accounts", "imgUsersRound"],
  ["Payments", "imgBanknote"],
  ["Receipt", "imgReceiptText"],
  ["Sales & Inventory", "imgSlidersHorizontal"],
  ["My Account & Security", "imgShield"],
  ["Data & Backup", "imgHardDriveDownload"],
];
export function downloadJSON(name, data) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function Settings({
  state,
  update,
  user,
  notify,
  tab,
  setTab,
  onLogout,
}) {
  const [edit, setEdit] = useState(null),
    [draft, setDraft] = useState({}),
    [error, setError] = useState(""),
    [restore, setRestore] = useState(null);
  const settings = state.settings;
  const open = (type, data = {}) => {
    setEdit(type);
    setDraft({ ...data });
    setError("");
  };
  const save = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (edit === "account") {
        if (!draft.pin) throw new Error("Enter a new four-digit PIN. Updating account names will be added with cloud profile editing.");
        if (!/^\d{4}$/.test(draft.pin)) throw new Error("Enter exactly four digits for your new PIN.");
        await accountAction({ action: "change-pin", newPin: draft.pin });
        notify("Your account PIN was updated in Supabase.");
      } else {
        update(
          (s) => ({ ...s, settings: { ...s.settings, ...draft } }),
          `Updated ${tab} (local demo data)`,
        );
        notify("Demo settings saved");
      }
      setEdit(null);
    } catch (err) { setError(err.message); }
  };
  const backup = () => {
    const record = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      status: "Demo export",
    };
    downloadJSON("happytech-demo-backup.json", {
      format: "happytech-demo-v1",
      exportedAt: record.date,
      data: state,
    });
    update(
      (s) => ({ ...s, backups: [record, ...s.backups] }),
      "Downloaded local demo backup",
    );
    notify("Demo backup downloaded");
  };
  const loadBackup = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const json = JSON.parse(await f.text());
      const d = json.data;
      if (
        json.format !== "happytech-demo-v1" ||
        !Array.isArray(d.products) ||
        !Array.isArray(d.sales) ||
        !Array.isArray(d.users) ||
        !Array.isArray(d.groups) ||
        !d.settings ||
        !d.users.some(
          (u) => u.id === user.id && u.active && u.role === "Super Admin",
        ) ||
        d.products.some(
          (p) =>
            !p.id ||
            !p.name ||
            !Number.isFinite(p.price) ||
            p.price < 0 ||
            !Number.isFinite(p.stock) ||
            p.stock < 0 ||
            !Number.isFinite(p.wholesale) ||
            p.wholesale < 0,
        ) ||
        d.sales.some(
          (s) =>
            !s.uuid || !Array.isArray(s.items) || !Number.isFinite(s.total),
        )
      ) {
        throw Error("Invalid");
      }
      setRestore(d);
      setError("");
    } catch {
      notify("Invalid or incompatible HappyTech demo backup.");
    }
    e.target.value = "";
  };
  const fields = (entries) => (
    <div className="settings-fields">
      {entries.map(([label, value]) => (
        <Field key={label} label={label}>
          <div className="readonly-field">{value || "Not configured"}</div>
        </Field>
      ))}
    </div>
  );
  return (
    <div className="settings-layout">
      <aside className="settings-nav no-print">
        <p className="eyebrow text-muted mb-5">SETTINGS</p>
        <nav>
          {sections
            .filter(
              ([s]) => s !== "Data & Backup" || user.role === "Super Admin",
            )
            .map(([s, icon]) => (
              <button
                key={s}
                className={tab === s ? "active" : ""}
                onClick={() => setTab(s)}
              >
                <Icon screen="4-42" name={icon} />
                {s}
              </button>
            ))}
        </nav>
        <Button className="mt-auto" onClick={onLogout}>
          <LogOut size={16} />
          Log Out
        </Button>
      </aside>
      <main className="settings-main">
        <div className="settings-heading">
          <span className="section-icon">
            <Icon
              screen="4-42"
              name={sections.find(([s]) => s === tab)?.[1] || "imgStore"}
            />
          </span>
          <div>
            <h2>{tab}</h2>
            <p className="helper mt-1">
              {
                {
                  "Store Information":
                    "These details appear on receipts and reports.",
                  "Cashier Accounts": "Manage cashier access to your store.",
                  Payments: "Configure your accepted payment methods.",
                  Receipt: "Customize the details shown on your receipt.",
                  "Sales & Inventory":
                    "Set your stock alerts and sales targets.",
                  "My Account & Security":
                    "Manage your account and recovery options.",
                  "Data & Backup":
                    "Export and restore the local frontend demo data.",
                }[tab]
              }
            </p>
          </div>
        </div>
        {tab === "Store Information" && (
          <Card className="p-6">
            {fields([
              ["Store Name", settings.storeName],
              ["Business Address", settings.address],
              ["Contact Number", settings.contact],
            ])}
            <div className="settings-footer">
              <Button
                onClick={() =>
                  open("store", {
                    storeName: settings.storeName,
                    address: settings.address,
                    contact: settings.contact,
                  })
                }
              >
                <Pencil size={16} />
                Edit
              </Button>
            </div>
          </Card>
        )}
        {tab === "Cashier Accounts" && <CashierManagement />}
        {tab === "Payments" && (
          <Card className="p-6">
            <div className="flex justify-between mb-6">
              <h2>Cash</h2>
              <Badge>Enabled</Badge>
            </div>
            <hr className="mb-6" />
            <h2 className="mb-5">GCash · Static QR</h2>
            {fields([
              ["Account Name", settings.gcashName],
              ["Account Number", settings.gcashNumber],
            ])}
            {settings.gcashQR && (
              <img
                className="settings-qr"
                src={settings.gcashQR}
                alt="Configured GCash QR"
              />
            )}
            <p className="helper mt-4">
              Payments are verified manually. This demo does not connect to
              GCash.
            </p>
            <div className="settings-footer">
              <Button
                onClick={() =>
                  open("payments", {
                    gcashName: settings.gcashName,
                    gcashNumber: settings.gcashNumber,
                    gcashQR: settings.gcashQR,
                  })
                }
              >
                <Pencil size={16} />
                Edit
              </Button>
            </div>
          </Card>
        )}
        {tab === "Receipt" && (
          <Card className="p-6">
            {fields([
              ["Store Name", settings.storeName],
              ["Footer Message", settings.receiptFooter],
              [
                "Printing",
                "Browser print dialog (hardware integration pending)",
              ],
            ])}
            <div className="settings-footer">
              <Button
                onClick={() =>
                  open("receipt", { receiptFooter: settings.receiptFooter })
                }
              >
                <Pencil size={16} />
                Edit
              </Button>
            </div>
          </Card>
        )}
        {tab === "Sales & Inventory" && (
          <Card className="p-6">
            {fields([
              ["Low Stock Threshold", `${settings.lowStock} kg`],
              ["Daily Sales Target", `PHP ${settings.dailyTarget}`],
              ["Weekly Sales Target", `PHP ${settings.weeklyTarget}`],
              ["Monthly Sales Target", `PHP ${settings.monthlyTarget}`],
            ])}
            <div className="settings-footer">
              <Button
                onClick={() =>
                  open("preferences", {
                    lowStock: settings.lowStock,
                    dailyTarget: settings.dailyTarget,
                    weeklyTarget: settings.weeklyTarget,
                    monthlyTarget: settings.monthlyTarget,
                  })
                }
              >
                <Pencil size={16} />
                Edit
              </Button>
            </div>
          </Card>
        )}
        {tab === "My Account & Security" && (
          <>
            <Card className="p-6">
              {fields([
                ["Name", user.name],
                ["Role", user.role],
                ["PIN", "••••"],
              ])}
              <div className="settings-footer">
                <Button
                  onClick={() => open("account", { pin: "" })}
                >
                  <Pencil size={16} />
                  Change PIN
                </Button>
              </div>
            </Card>
            <Card className="p-6 mt-5">
              <h2 className="mb-4">Email Recovery</h2>
              <p className="helper">Admins can reset their PIN using a verified Supabase email recovery link from the login page. Recovery grants are single-use and expire after five minutes.</p>
            </Card>
          </>
        )}
        {tab === "Data & Backup" && user.role === "Super Admin" && (
          <Card className="p-6">
            <h2>Local demo backups</h2>
            <p className="helper mt-3 mb-5">
              Download and restore this browser's mock data. Scheduled database
              backups require the future backend; no automatic backups run in
              this frontend.
            </p>
            <div className="flex gap-3 flex-wrap">
              <Button primary onClick={backup}>
                <Download size={17} />
                Download Demo Backup
              </Button>
              <label className="btn cursor-pointer">
                <Upload size={17} />
                Restore Demo Backup
                <input
                  className="hidden"
                  type="file"
                  accept=".json,application/json"
                  onChange={loadBackup}
                />
              </label>
            </div>
            <div className="mt-6">
              {state.backups.length ? (
                state.backups.map((b) => (
                  <div className="notification-row" key={b.id}>
                    {dateTime(b.date)} <Badge>{b.status}</Badge>
                  </div>
                ))
              ) : (
                <Empty>No demo backups exported yet.</Empty>
              )}
            </div>
          </Card>
        )}
      </main>
      {edit && (
        <Modal
          title={
            {
              store: "Edit Store Information",
              payments: "Edit GCash",
              receipt: "Edit Receipt",
              preferences: "Edit Sales & Inventory",
              account: "My Account",
            }[edit]
          }
          onClose={() => setEdit(null)}
        >
          <form onSubmit={save}>
            {Object.entries(draft)
              .filter(([k]) => !["id", "role", "active", "gcashQR"].includes(k))
              .map(([key, value]) => (
                <Field
                  key={key}
                  label={
                    {
                      storeName: "Store Name",
                      address: "Business Address",
                      contact: "Contact Number",
                      gcashName: "Account Name",
                      gcashNumber: "Account Number",
                      receiptFooter: "Receipt Footer",
                      lowStock: "Low Stock Threshold (kg)",
                      dailyTarget: "Daily Target (PHP)",
                      weeklyTarget: "Weekly Target (PHP)",
                      monthlyTarget: "Monthly Target (PHP)",
                      name: "Full Name",
                      pin:
                        edit === "account"
                          ? "New 4-digit PIN (leave blank to keep current)"
                          : "4-digit PIN",
                      question: "Security Question",
                      answer: "Answer",
                      recoveryPin: "4-digit Recovery PIN",
                    }[key] || key
                  }
                  required={!(edit === "account" && key === "pin")}
                  type={
                    key.toLowerCase().includes("pin")
                      ? "password"
                      : typeof value === "number"
                        ? "number"
                        : "text"
                  }
                  min={
                    typeof value === "number"
                      ? key === "lowStock"
                        ? 0
                        : 1
                      : undefined
                  }
                  step={typeof value === "number" ? "0.01" : undefined}
                  maxLength={key.toLowerCase().includes("pin") ? 4 : undefined}
                  inputMode={
                    key.toLowerCase().includes("pin") ? "numeric" : undefined
                  }
                  value={value}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      [key]:
                        typeof value === "number"
                          ? Number(e.target.value)
                          : key.toLowerCase().includes("pin")
                            ? e.target.value.replace(/\D/g, "")
                            : e.target.value,
                    })
                  }
                />
              ))}
            {edit === "payments" && (
              <Field label="Static QR image (PNG or JPEG, max 1 MB)">
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (
                      f.size > 1024 * 1024 ||
                      !["image/png", "image/jpeg"].includes(f.type)
                    ) {
                      setError("Choose a PNG or JPEG image smaller than 1 MB.");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () =>
                      setDraft((d) => ({
                        ...d,
                        gcashQR: String(reader.result),
                      }));
                    reader.readAsDataURL(f);
                  }}
                />
                {draft.gcashQR && (
                  <img
                    className="settings-qr"
                    src={draft.gcashQR}
                    alt="GCash QR preview"
                  />
                )}
              </Field>
            )}
            {error && <p className="error">{error}</p>}
            <div className="modal-actions">
              <Button type="button" onClick={() => setEdit(null)}>
                Cancel
              </Button>
              <Button primary>Save Changes</Button>
            </div>
          </form>
        </Modal>
      )}
      {restore && (
        <Modal title="Restore Demo Backup" onClose={() => setRestore(null)}>
          <p>
            This will replace the current browser's products, sales, accounts,
            and settings with the selected demo backup.
          </p>
          <div className="modal-actions">
            <Button onClick={() => setRestore(null)}>Cancel</Button>
            <Button
              danger
              onClick={() => {
                update(
                  () => ({
                    ...restore,
                    logs: restore.logs || [],
                    backups: restore.backups || [],
                  }),
                  "Restored local demo backup",
                );
                setRestore(null);
                notify("Demo backup restored");
              }}
            >
              Restore Demo Data
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
