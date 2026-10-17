import "./Stat.css";
import { Card } from "../Card";
import { Icon } from "../Icon";
export function Stat({
  label,
  value,
  caption,
  icon,
  screen = "45-5530",
  alert = false,
  onClick,
  active,
}) {
  const Container = onClick ? "button" : Card;
  return (
    <Container
      className={`stat ${onClick ? "card stat-filter" : ""}`}
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-pressed={onClick ? Boolean(active) : undefined}
    >
      <div className={`stat-icon ${alert ? "alert" : ""}`}>
        {typeof icon === "string" ? <Icon screen={screen} name={icon} /> : icon}
      </div>
      <div className="min-w-0">
        <p className="stat-label">{label}</p>
        <strong className="stat-value">{value}</strong>
        <p className="stat-caption">{caption}</p>
      </div>
    </Container>
  );
}
