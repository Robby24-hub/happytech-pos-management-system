import "./Header.css";
import { ArrowLeft } from "lucide-react";
import { Button } from "../Button";
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
