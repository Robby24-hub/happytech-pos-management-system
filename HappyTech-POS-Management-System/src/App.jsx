import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import Sidebar from "./components/Sidebar";
import { pages, getAllowedPages } from "./routing/pages";
import { useState, useEffect, useCallback } from "react";
import { Bell, LogOut } from "lucide-react";
import { seedState, stockStatus } from "./data/mock";
import { Header, Modal, Button, Toast, Badge, Empty } from "./components/UI";
import Login from "./pages/Login/Login";
import Dashboard from "./pages/Dashboard/Dashboard";
import POS from "./pages/POS/POS";
import Inventory from "./pages/Inventory/Inventory";
import SalesHistory from "./pages/SalesHistory/SalesHistory";
import Reports from "./pages/Reports/Reports";
import Settings from "./pages/Settings/Settings";
import Administration from "./pages/Administration/Administration";
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
  const location = useLocation();
  const routerNavigate = useNavigate();
  const [state, setState] = useState(readState),
    [userId, setUserId] = useState(null),
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
                  actor: user?.name || "User",
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
  const navigate = useCallback(
    (page) => {
      routerNavigate(`/${page}`);
      setOverlay(null);
    },
    [routerNavigate],
  );
  useEffect(() => {
    setOverlay(null);
  }, [location.key]);
  const logout = () => {
    setUserId(null);
    setOverlay(null);
    routerNavigate("/login", { replace: true, state: null });
  };
  const allowed = getAllowedPages(user?.role);
  const requested = location.pathname.replace(/^\/|\/$/g, "");
  const current = allowed.includes(requested) ? requested : allowed[0];
  const props = { state, update, user, notify, navigate };
  if (!user) {
    return (
      <>
        <Routes>
          <Route
            path="/login"
            element={
              <Login
                users={state.users}
                settings={state.settings}
                onLogin={(u) => {
                  setUserId(u.id);
                }}
              />
            }
          />
          <Route
            path="*"
            element={
              <Navigate
                to="/login"
                replace
                state={{ from: location.pathname }}
              />
            }
          />
        </Routes>
        <Toast message={toast} />
      </>
    );
  }
  const low = state.products.filter(
    (p) => stockStatus(p, state.settings.lowStock) !== "In Stock",
  );
  return (
    <div className="app-shell">
      <Sidebar
        user={user}
        logo={state.settings.storeLogo}
        allowedPages={allowed}
        onAccount={() => setSettingsTab("My Account & Security")}
        onLogout={() => setOverlay("logout")}
      />
      <div className="page-shell">
        <Header
          title={pages.find((page) => page.id === current)?.label}
          user={user}
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
        {storageError && (
          <p className="storage-warning" role="alert">
            Changes could not be saved. Browser storage is unavailable or full.
          </p>
        )}
        <Routes>
          {[
            ["dashboard", <Dashboard {...props} />],
            ["pos", <POS {...props} />],
            ["inventory", <Inventory {...props} />],
            ["sales-history", <SalesHistory {...props} />],
            ["reports", <Reports {...props} />],
            [
              "settings",
              <Settings
                {...props}
                tab={settingsTab}
                setTab={setSettingsTab}
                onLogout={() => setOverlay("logout")}
              />,
            ],
            [
              "administration",
              <Administration {...props} page="administration" />,
            ],
            ["logs", <Administration {...props} page="logs" />],
          ].map(([id, element]) => (
            <Route
              key={id}
              path={`/${id}`}
              element={
                allowed.includes(id) ? (
                  element
                ) : (
                  <Navigate to={`/${allowed[0]}`} replace />
                )
              }
            />
          ))}
          <Route
            path="/login"
            element={
              <Navigate
                to={
                  allowed.some((id) => location.state?.from === `/${id}`)
                    ? location.state.from
                    : `/${allowed[0]}`
                }
                replace
                state={null}
              />
            }
          />
          <Route
            path="*"
            element={<Navigate to={`/${allowed[0]}`} replace />}
          />
        </Routes>
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
            Stock alerts reflect current inventory levels.
          </p>
        </Modal>
      )}
    </div>
  );
}
