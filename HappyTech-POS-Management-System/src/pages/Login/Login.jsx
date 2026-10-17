import "./Login.css";
import { useState } from "react";
import {
  Shield,
  ShoppingBasket,
  ArrowLeft,
  Delete,
  Clock,
  Lightbulb,
  ShieldCheck,
} from "lucide-react";
import { Button, Field, Icon } from "../../components/UI";
export default function Login({ users, settings, onLogin }) {
  const [role, setRole] = useState(""),
    [account, setAccount] = useState(""),
    [pin, setPin] = useState(""),
    [error, setError] = useState(""),
    [recover, setRecover] = useState(false);
  const list = users.filter((u) => u.role === role && u.active);
  const selected = list.find((u) => u.id === account) || list[0];
  const choose = (r) => {
    setRole(r);
    setAccount("");
    setPin("");
    setError("");
  };
  const submit = (e) => {
    e?.preventDefault();
    if (recover) {
      if (pin === settings.recoveryPin && role !== "Cashier") {
        onLogin(selected);
        return;
      }
      setError("Incorrect recovery PIN.");
      return;
    }
    if (selected?.pin === pin) onLogin(selected);
    else {
      setError("Incorrect PIN. Please try again.");
      setPin("");
    }
  };
  return (
    <div className="login-screen">
      <aside className="login-brand">
        <div className="flex items-center gap-3 text-2xl font-bold">
          <span className="brand">
            <Icon name="imgLucideLayoutDashboard" screen="45-7300" />
          </span>
          HappyTech POS
        </div>
        <div className="login-hero">
          <img
            src="/assets/0a319.png"
            alt="Cashier at a point of sale counter"
          />
          <h2>Ready to serve your customers</h2>
          <p>Choose a role to continue to your account and secure sign-in.</p>
        </div>
        <div>
          <div className="login-tip">
            <div>
              <strong>
                {new Date().toLocaleDateString("en-PH", {
                  weekday: "long",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </strong>
              <p>
                {new Date().toLocaleTimeString("en-PH", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <Clock size={20} />
          </div>
          <div className="login-tip mt-4">
            <Lightbulb size={19} />
            <p>
              Tip: Keep your PIN private and lock the terminal when stepping
              away from the counter.
            </p>
          </div>
        </div>
      </aside>
      <main className="login-main">
        <section className="login-card">
          {!role ? (
            <>
              <h1>Select Your Role</h1>
              <p className="text-center helper">
                Please choose your access level to continue
              </p>
              <div className="grid gap-4 mt-8">
                {[
                  [
                    "Admin",
                    Shield,
                    "Full access to settings, reports, and management.",
                  ],
                  [
                    "Cashier",
                    ShoppingBasket,
                    "Access to point-of-sale, sales, and returns.",
                  ],
                  [
                    "Super Admin",
                    ShieldCheck,
                    "Manage administrators, activity logs, and backups.",
                  ],
                ].map(([r, I, desc]) => (
                  <button
                    className="role-choice"
                    key={r}
                    onClick={() => choose(r)}
                  >
                    <span className="role-symbol">
                      <I />
                    </span>
                    <span>
                      <strong>{r}</strong>
                      <small>{desc}</small>
                    </span>
                    <span className="role-radio" />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <button
                className="text-button"
                onClick={() => {
                  setRole("");
                  setRecover(false);
                }}
              >
                <ArrowLeft size={16} />
                Change role
              </button>
              <h1>{recover ? "Account Recovery" : `${role} Sign In`}</h1>
              <p className="helper text-center">
                {recover
                  ? "Enter the recovery PIN"
                  : "Choose your account and enter your 4-digit PIN"}
              </p>
              <form onSubmit={submit}>
                <Field label="Account">
                  <select
                    value={selected?.id || ""}
                    onChange={(e) => {
                      setAccount(e.target.value);
                      setPin("");
                    }}
                  >
                    {list.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <input
                  className="pin-input"
                  aria-label={recover ? "Recovery PIN" : "4-digit PIN"}
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value.replace(/\D/g, ""));
                    setError("");
                  }}
                  placeholder="••••"
                />
                <div className="keypad">
                  {[
                    "1",
                    "2",
                    "3",
                    "4",
                    "5",
                    "6",
                    "7",
                    "8",
                    "9",
                    "Clear",
                    "0",
                    "⌫",
                  ].map((key) => (
                    <button
                      type="button"
                      key={key}
                      onClick={() =>
                        setPin((p) =>
                          key === "Clear"
                            ? ""
                            : key === "⌫"
                              ? p.slice(0, -1)
                              : (p + key).slice(0, 4),
                        )
                      }
                    >
                      {key === "⌫" ? <Delete size={20} /> : key}
                    </button>
                  ))}
                </div>
                {error && (
                  <p className="error" role="alert">
                    {error}
                  </p>
                )}
                <Button
                  primary
                  className="w-full mt-4"
                  disabled={pin.length !== 4 || !selected}
                >
                  Continue
                </Button>
              </form>
              {role !== "Cashier" && (
                <button
                  className="text-button mx-auto mt-3"
                  onClick={() => {
                    setRecover(!recover);
                    setPin("");
                    setError("");
                  }}
                >
                  {recover ? "Back to sign in" : "Forgot PIN?"}
                </button>
              )}
            </>
          )}
        </section>
        <p className="login-footer">HappyTech POS & Management System</p>
      </main>
    </div>
  );
}
