import "./Icon.css";
import assets from "../../data/assets.json";
export function Icon({ name, screen = "45-5530", className = "" }) {
  const src = assets[screen]?.[name];
  return src ? (
    <span className={`asset-icon ${className}`}>
      <img src={src} alt="" />
    </span>
  ) : null;
}
