import "./Button.css";

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
