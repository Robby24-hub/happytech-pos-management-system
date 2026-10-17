import "./Sidebar.css";
import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ClipboardList, ShieldCheck, PanelLeft } from "lucide-react";
import { Icon } from "../Icon";
import { Modal } from "../Modal";
import { pages } from "../../routing/pages";

export default function Sidebar({
  user,
  logo,
  allowedPages,
  onAccount,
  onLogout,
}) {
  const [expanded, setExpanded] = useState(false);
  const location = useLocation();
  useEffect(() => {
    setExpanded(false);
  }, [location.key]);
  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [expanded]);
  const brand = logo ? (
    <img className="store-logo" src={logo} alt="Happy Tech Store logo" />
  ) : (
    <Icon name="imgStore" />
  );
  const links = (labels) => (
    <>
      <nav aria-label="Main navigation">
        {pages
          .filter((page) => allowedPages.includes(page.id))
          .map((page) => (
            <NavLink
              key={page.id}
              to={`/${page.id}`}
              end
              title={page.label}
              aria-label={page.label}
              onClick={() => setExpanded(false)}
              className={({ isActive }) =>
                `nav-button ${isActive ? "active" : ""}`
              }
            >
              {page.id === "administration" ? (
                <ShieldCheck />
              ) : page.id === "logs" ? (
                <ClipboardList />
              ) : (
                <Icon name={page.icon} screen="4-28" />
              )}
              {labels && <span>{page.label}</span>}
            </NavLink>
          ))}
      </nav>
      <div className="sidebar-bottom">
        {user.role !== "Cashier" && allowedPages.includes("settings") && (
          <Link
            className="nav-button"
            title="My Account"
            aria-label="My Account"
            to="/settings"
            onClick={() => {
              onAccount();
              setExpanded(false);
            }}
          >
            <Icon name="imgUserRound" />
            {labels && <span>My Account</span>}
          </Link>
        )}
        <button
          className="nav-button"
          title="Log Out"
          aria-label="Log Out"
          onClick={() => {
            setExpanded(false);
            onLogout();
          }}
        >
          <Icon name="imgLogOut" />
          {labels && <span>Log Out</span>}
        </button>
      </div>
    </>
  );
  return (
    <>
      <aside className="sidebar no-print" inert={expanded ? true : undefined}>
        <button
          type="button"
          className="sidebar-toggle"
          title="Expand sidebar"
          aria-haspopup="dialog"
          aria-label="Open sidebar"
          aria-expanded={expanded}
          onClick={() => setExpanded(value => !value)}
        >
          <PanelLeft size={25} />
        </button>
        {links(false)}
      </aside>
      {expanded && (
        <Modal
          drawer
          ariaLabel="Main navigation"
          closeLabel="Close sidebar"
          title={
            <span className="sidebar-company">
              <span className="brand">{brand}</span>Happy Tech Store
            </span>
          }
          className="sidebar-dialog"
          overlayClassName="sidebar-overlay no-print"
          onClose={() => setExpanded(false)}
        >
          {links(true)}
        </Modal>
      )}
    </>
  );
}
