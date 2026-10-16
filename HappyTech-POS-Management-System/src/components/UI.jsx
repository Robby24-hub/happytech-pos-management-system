import { useEffect, useRef } from "react";
import { X, Search, CheckCircle, ChevronDown, ArrowLeft } from "lucide-react";
import assets from "../data/assets.json";
export function Icon({ name, screen = "45-5530", className = "" }) {
  const src = assets[screen]?.[name];
  return src ? (
    <span className={`asset-icon ${className}`}>
      <img src={src} alt="" />
    </span>
  ) : null;
}
export const Card = ({ children, className = "" }) => (
  <section className={`card ${className}`}>{children}</section>
);
export function Button({
  children,
  primary = false,
  danger = false,
  className = "",
  ...props
}) {
  return (
    <button
      className={`btn ${primary ? "btn-primary" : ""} ${danger ? "btn-danger" : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
export const SearchField = ({
  value,
  onChange,
  placeholder = "Search products...",
}) => (
  <div className="search-field">
    <Search size={18} />
    <input
      aria-label={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  </div>
);
export function Select({ value, onChange, options, label, className = "" }) {
  return (
    <div className={`select-wrap ${className}`}>
      <select
        aria-label={label || "Filter"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option
            key={typeof o === "string" ? o : o.value}
            value={typeof o === "string" ? o : o.value}
          >
            {typeof o === "string" ? o : o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={14} />
    </div>
  );
}
export const Field = ({ label, children, ...props }) => (
  <label className="field">
    <span>{label}</span>
    {children || <input {...props} />}
  </label>
);
export const Badge = ({ children, tone = "" }) => (
  <span
    className={`badge ${tone || { "In Stock": "green", "Low Stock": "amber", "Out of Stock": "red", Refunded: "red", Completed: "green" }[children] || "gray"}`}
  >
    {children}
  </span>
);
export function Modal({
  title,
  onClose,
  children,
  wide = false,
  drawer = false,
}) {
  const ref = useRef();
  useEffect(() => {
    const previous = document.activeElement;
    const focusables = () =>
      [
        ...ref.current.querySelectorAll("button,input,select,textarea,a[href]"),
      ].filter((e) => !e.disabled);
    focusables()[0]?.focus();
    const key = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const a = focusables();
        if (e.shiftKey && document.activeElement === a[0]) {
          e.preventDefault();
          a.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === a.at(-1)) {
          e.preventDefault();
          a[0]?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div
      className={`modal-overlay ${drawer ? "drawer-overlay" : ""}`}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`modal ${wide ? "wide" : ""} ${drawer ? "drawer" : ""}`}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <div className="modal-content">{children}</div>
      </section>
    </div>
  );
}
export const Empty = ({ children = "No results found." }) => (
  <div className="empty">{children}</div>
);
export function Toast({ message }) {
  return message ? (
    <div role="status" className="toast">
      <CheckCircle size={20} />
      {message}
    </div>
  ) : null;
}
export function Header({ title, user, back, onNavigate, children }) {
  return (
    <header className="topbar">
      {back && (
        <Button onClick={() => onNavigate("dashboard")}>
          <ArrowLeft size={17} />
          Back
        </Button>
      )}
      <h1>{title}</h1>
      <div className="top-meta">
        <time>
          {new Date().toLocaleString("en-PH", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </time>
        <div className="avatar">{user.name[0]}</div>
        <div className="identity">
          <strong>{user.name}</strong>
          <small>{user.role === "Admin" ? "Store Owner" : user.role}</small>
        </div>
      </div>
      {children}
    </header>
  );
}
export function Stat({
  label,
  value,
  caption,
  icon,
  screen = "45-5530",
  alert = false,
}) {
  return (
    <Card className="stat">
      <div className={`stat-icon ${alert ? "alert" : ""}`}>
        {typeof icon === "string" ? <Icon screen={screen} name={icon} /> : icon}
      </div>
      <div className="min-w-0">
        <p className="stat-label">{label}</p>
        <strong className="stat-value">{value}</strong>
        <p className="stat-caption">{caption}</p>
      </div>
    </Card>
  );
}
