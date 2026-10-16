import { useState, useEffect, useCallback } from "react";
import { Bell, ClipboardList, ShieldCheck, LogOut } from "lucide-react";
import { seedState, stockStatus } from "./data/mock";
import {
  Icon,
  Header,
  Modal,
  Button,
  Toast,
  Badge,
  Empty,
} from "./components/UI";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import Inventory from "./pages/Inventory";
import SalesHistory from "./pages/SalesHistory";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Administration from "./pages/Administration";
const KEY = "happytech-demo-v1";
function readState() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    return s?.products && s?.settings && s?.sales && s?.users
      ? s
      : structuredClone(seedState);
  } catch {
    return structuredClone(seedState);
  }
}
export default function App() {
  const [state, setState] = useState(readState),
    [userId, setUserId] = useState(null),
    [page, setPage] = useState("dashboard"),
    [toast, setToast] = useState(""),
    [overlay, setOverlay] = useState(null),
    [settingsTab, setSettingsTab] = useState("Store Information"),
    [storageError, setStorageError] = useState(false);
  const user = state.users.find((u) => u.id === userId && u.active);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [state]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 2600);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const notify = useCallback((message) => setToast(message), []);
  const update = useCallback(
    (fn, action) => {
      setState((s) => {
        const next = fn(s);
        return action
          ? {
              ...next,
              logs: [
                {
                  id: crypto.randomUUID(),
                  actor: user?.name || "Demo user",
                  action,
                  date: new Date().toISOString(),
                },
                ...next.logs,
              ].slice(0, 500),
            }
          : next;
      });
    },
    [user?.name],
  );
  const navigate = useCallback((p) => {
    setPage(p);
    setOverlay(null);
  }, []);
  const logout = () => {
    setUserId(null);
    setOverlay(null);
    setPage("dashboard");
  };
  const allowed =
    user?.role === "Cashier"
      ? ["pos", "sales-history"]
      : user?.role === "Super Admin"
        ? [
            "dashboard",
            "pos",
            "sales-history",
            "inventory",
            "reports",
            "settings",
            "administration",
            "logs",
          ]
        : [
            "dashboard",
            "pos",
            "sales-history",
            "inventory",
            "reports",
            "settings",
            "logs",
          ];
  const current = allowed.includes(page) ? page : allowed[0];
  const props = { state, update, user, notify, navigate };
  const nav = [
    ["dashboard", "Dashboard", "imgLayoutDashboard"],
    ["pos", "POS", "imgShoppingCart"],
    ["sales-history", "Sales History", "imgHistory"],
    ["inventory", "Inventory", "imgPackage"],
    ["reports", "Reports", "imgBarChart3"],
    ["settings", "Settings", "imgSettings"],
  ];
  if (!user)
    return (
      <>
        <Login
          users={state.users}
          settings={state.settings}
          onLogin={(u) => {
            setUserId(u.id);
            setPage(u.role === "Cashier" ? "pos" : "dashboard");
          }}
        />
        <Toast message={toast} />
      </>
    );
  const low = state.products.filter(
    (p) => stockStatus(p, state.settings.lowStock) !== "In Stock",
  );
  return (
    <div className="app-shell">
      {!["pos", "settings"].includes(current) && (
        <aside className="sidebar no-print">
          <button
            className="brand"
            aria-label="HappyTech home"
            onClick={() => navigate(allowed[0])}
          >
            <Icon name="imgStore" />
          </button>
          <nav>
            {nav
              .filter(([p]) => allowed.includes(p))
              .map(([p, label, icon]) => (
                <button
                  key={p}
                  title={label}
                  aria-label={label}
                  aria-current={p === current ? "page" : undefined}
                  className={`nav-button ${p === current ? "active" : ""}`}
                  onClick={() => navigate(p)}
                >
                  <Icon
                    name={icon}
                    screen={
                      p === current
                        ? p === "dashboard"
                          ? "45-5530"
                          : p === "reports"
                            ? "4-35"
                            : p === "sales-history"
                              ? "4-28"
                              : "45-5530"
                        : "4-28"
                    }
                  />
                </button>
              ))}
            {allowed.includes("administration") && (
              <button
                aria-label="Administration"
                title="Administration"
                className={`nav-button ${current === "administration" ? "active" : ""}`}
                onClick={() => navigate("administration")}
              >
                <ShieldCheck />
              </button>
            )}
            {allowed.includes("logs") && (
              <button
                aria-label="Activity Logs"
                title="Activity Logs"
                className={`nav-button ${current === "logs" ? "active" : ""}`}
                onClick={() => navigate("logs")}
              >
                <ClipboardList />
              </button>
            )}
          </nav>
          <div className="sidebar-bottom">
            {user.role !== "Cashier" && (
              <button
                className="nav-button"
                title="My Account"
                aria-label="My Account"
                onClick={() => {
                  setSettingsTab("My Account & Security");
                  navigate("settings");
                }}
              >
                <Icon name="imgUserRound" />
              </button>
            )}
            <button
              className="nav-button"
              title="Log Out"
              aria-label="Log Out"
              onClick={() => setOverlay("logout")}
            >
              <Icon name="imgLogOut" />
            </button>
          </div>
        </aside>
      )}
      <div className="page-shell">
        <Header
          title={
            {
              dashboard: "Dashboard",
              pos: "POS",
              "sales-history": "Sales History",
              inventory: "Inventory",
              reports: "Reports",
              settings: "Settings",
              administration: "Administration",
              logs: "Activity Logs",
            }[current]
          }
          user={user}
          back={["pos", "settings"].includes(current)}
          onNavigate={() =>
            navigate(allowed[0] === "pos" ? "sales-history" : "dashboard")
          }
        >
          <button
            className="icon-button notification-button no-print"
            aria-label="Notifications"
            onClick={() => setOverlay("notifications")}
          >
            <Bell size={19} />
            {low.length > 0 && <span className="notification-dot" />}
          </button>
        </Header>
        <div className="demo-strip no-print">
          Frontend demo · Data saved on this browser only
          {storageError && (
            <b>
              {" "}
              · Browser storage is unavailable; changes will be lost after
              refresh.
            </b>
          )}
        </div>
        {current === "dashboard" && <Dashboard {...props} />}{" "}
        {current === "pos" && <POS {...props} />}{" "}
        {current === "inventory" && <Inventory {...props} />}{" "}
        {current === "sales-history" && <SalesHistory {...props} />}{" "}
        {current === "reports" && <Reports {...props} />}{" "}
        {current === "settings" && (
          <Settings
            {...props}
            tab={settingsTab}
            setTab={setSettingsTab}
            onLogout={() => setOverlay("logout")}
          />
        )}{" "}
        {["administration", "logs"].includes(current) && (
          <Administration {...props} page={current} />
        )}
      </div>
      <Toast message={toast} />
      {overlay === "logout" && (
        <Modal title="Log Out" onClose={() => setOverlay(null)}>
          <p>Are you sure you want to log out of HappyTech?</p>
          <div className="modal-actions">
            <Button onClick={() => setOverlay(null)}>Cancel</Button>
            <Button primary onClick={logout}>
              <LogOut size={17} />
              Log Out
            </Button>
          </div>
        </Modal>
      )}
      {overlay === "notifications" && (
        <Modal title="Notifications" drawer onClose={() => setOverlay(null)}>
          {low.length ? (
            low.map((p) => (
              <div key={p.id} className="notification-row">
                <strong>{p.name}</strong>
                <p>
                  {p.stock} kg retail stock ·{" "}
                  <Badge>{stockStatus(p, state.settings.lowStock)}</Badge>
                </p>
              </div>
            ))
          ) : (
            <Empty>All products have healthy stock.</Empty>
          )}
          <p className="helper mt-5">
            Stock alerts are generated from the current mock inventory.
          </p>
        </Modal>
      )}
    </div>
  );
}
