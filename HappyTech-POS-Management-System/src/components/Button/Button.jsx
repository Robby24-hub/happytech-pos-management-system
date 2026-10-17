import "./Button.css";

export function Button({
  children,
  primary = false,
  danger = false,
  warning = false,
  alert = false,
  className = "",
  ...props
}) {
  return (
    <button
      className={`btn ${primary ? "btn-primary" : ""} ${danger ? "btn-danger" : ""} ${warning ? "btn-warning" : ""} ${alert ? "btn-alert" : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
