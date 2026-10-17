import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { Bell, LogOut } from "lucide-react";
import Sidebar from "./components/Sidebar";
import { pages, getAllowedPages } from "./routing/pages";
import { Header, Modal, Button, Toast, Badge, Empty } from "./components/UI/index.js";
import { seedState, stockStatus } from "./data/mock";
import Login from "./pages/Login.jsx";
import ChangePin from "./pages/ChangePin.jsx";
import ResetPin from "./pages/ResetPin.jsx";
import AdminManagement from "./pages/AdminManagement.jsx";
import ActivityLogs from "./pages/ActivityLogs.jsx";
import SuperDashboard from "./pages/SuperDashboard.jsx";
import Dashboard from "./pages/Dashboard/Dashboard.jsx";
import POS from "./pages/POS/POS.jsx";
import Inventory from "./pages/Inventory/Inventory.jsx";
import SalesHistory from "./pages/SalesHistory/SalesHistory.jsx";
import Reports from "./pages/Reports/Reports.jsx";
import Settings from "./pages/Settings/Settings.jsx";
import { supabase, configured, getProfile, accountAction } from "./lib/supabase";
import "./legacy-auth.css";
const KEY = "happytech-demo-v1";
// Never restore or persist PINs from the older mock-only frontend.
export function scrubDemoCredentials(state) {
  if (!state || typeof state !== "object") return state;
  const { recoveryPin: _recoveryPin, ...settings } = state.settings || {};
  return { ...state, settings,
    users: Array.isArray(state.users) ? state.users.map(({ pin: _pin, ...account }) => account) : [],
  };
}
function readState() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    return scrubDemoCredentials(s?.products && s?.settings && s?.sales && s?.users ? s : structuredClone(seedState));
  } catch { return scrubDemoCredentials(structuredClone(seedState)); }
}
export default function App() {
  const location = useLocation();
  const routerNavigate = useNavigate();
  const [state, setState] = useState(readState);
  const [cloudUser, setCloudUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [overlay, setOverlay] = useState(null);
  const [settingsTab, setSettingsTab] = useState("Store Information");
  const [storageError, setStorageError] = useState(false);
  const user = cloudUser;
  const refreshAuth = useCallback(async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { setCloudUser(null); return; }
      setCloudUser(await getProfile(authUser.id));
    } catch {
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
      setCloudUser(null);
    } finally { setAuthLoading(false); }
  }, []);
  useEffect(() => {
    if (!configured) { setAuthLoading(false); return; }
    void refreshAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      // Defer Auth API calls outside Supabase's auth event callback.
      setTimeout(() => { void refreshAuth(); }, 0);
    });
    return () => subscription.unsubscribe();
  }, [refreshAuth]);
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(scrubDemoCredentials(state))); setStorageError(false); }
    catch { setStorageError(true); }
  }, [state]);
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(timeout);
  }, [toast]);
  useEffect(() => { setOverlay(null); }, [location.key]);
  const notify = useCallback((message) => setToast(message), []);
  const update = useCallback((fn, action) => {
    setState(s => {
      const next = scrubDemoCredentials(fn(s));
      return action ? { ...next, logs: [
        { id: crypto.randomUUID(), actor: user?.name || "Local user", action, date: new Date().toISOString() },
        ...(next.logs || []),
      ].slice(0,500) } : next;
    });
  }, [user?.name]);
  const navigate = useCallback((page) => {
    routerNavigate(`/${page}`); setOverlay(null);
  }, [routerNavigate]);
  const logout = async () => {
    try { await accountAction({ action: "logout" }); } catch { /* login must still allow logout */ }
    await supabase.auth.signOut();
    setCloudUser(null); setOverlay(null);
    routerNavigate("/login", { replace: true });
  };
  const leaveRecovery = async () => {
    await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    setCloudUser(null);
    routerNavigate("/login", { replace: true });
  };
  if (!configured) return <div className="config-needed"><h1>Supabase setup required</h1><p>Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local; see SETUP_AUTH.md.</p></div>;
  // Important: recovery verification must not be authorized by an ordinary session.
  if (location.pathname === "/reset-pin") return <ResetPin onBack={leaveRecovery} onComplete={leaveRecovery} />;
  if (authLoading) return <div className="config-needed">Checking account session...</div>;
  if (user?.must_change_pin) return <ChangePin onDone={refreshAuth} />;
  if (!user) return <><Routes>
    <Route path="/login" element={<Login onLogin={refreshAuth} />} />
    <Route path="*" element={<Navigate to="/login" replace state={{ from: location.pathname }} />} />
  </Routes><Toast message={toast}/></>;
  const allowed = getAllowedPages(user.role);
  if (!allowed.length) return <div className="config-needed" role="alert">This account has no authorized pages. Contact an administrator.</div>;
  const current = location.pathname.replace(/^\/|\/$/g, "");
  const props = { state, update, user, notify, navigate };
  const low = state.products.filter(p => stockStatus(p, state.settings.lowStock) !== "In Stock");
  const destinations = {
    dashboard: <Dashboard {...props} />,
    "super-dashboard": <SuperDashboard {...props} />,
    pos: <POS {...props} />,
    "sales-history": <SalesHistory {...props} />,
    inventory: <Inventory {...props} />,
    reports: <Reports {...props} />,
    settings: <Settings {...props} tab={settingsTab} setTab={setSettingsTab} onLogout={() => setOverlay("logout")} />,
    administration: <AdminManagement />,
    logs: <ActivityLogs user={user} />,
  };
  return <div className="app-shell">
    <Sidebar user={user} logo={state.settings.storeLogo} allowedPages={allowed}
      onAccount={() => setSettingsTab("My Account & Security")}
      onLogout={() => setOverlay("logout")} />
    <div className="page-shell">
      <Header title={pages.find(p => p.id === current)?.label || "HappyTech"} user={user}>
        <button className="icon-button notification-button no-print" aria-label="Notifications" onClick={() => setOverlay("notifications")}>
          <Bell size={19}/>{low.length > 0 && <span className="notification-dot"/>}
        </button>
      </Header>
      {storageError && <p className="storage-warning" role="alert">Browser storage is unavailable or full; local business changes might not persist.</p>}
      <Routes>
        {Object.entries(destinations).map(([id,element]) => <Route key={id} path={`/${id}`} element={allowed.includes(id) ? element : <Navigate to={`/${allowed[0]}`} replace/>}/>)}
        <Route path="/login" element={<Navigate to={`/${allowed[0]}`} replace/>}/>
        <Route path="*" element={<Navigate to={`/${allowed[0]}`} replace/>}/>
      </Routes>
    </div>
    <Toast message={toast}/>
    {overlay === "logout" && <Modal title="Log Out" onClose={() => setOverlay(null)}><p>Are you sure you want to log out of HappyTech?</p><div className="modal-actions"><Button onClick={() => setOverlay(null)}>Cancel</Button><Button primary onClick={logout}><LogOut size={17}/> Log Out</Button></div></Modal>}
    {overlay === "notifications" && <Modal title="Notifications" drawer onClose={() => setOverlay(null)}>
      {low.length ? low.map(p => <div key={p.id} className="notification-row"><strong>{p.name}</strong><p>{p.stock} kg retail stock · <Badge>{stockStatus(p,state.settings.lowStock)}</Badge></p></div>) : <Empty>All products have healthy stock.</Empty>}
      <p className="helper mt-5">Stock alerts reflect locally stored inventory; cloud inventory synchronization is not implemented yet.</p>
    </Modal>}
  </div>;
}
