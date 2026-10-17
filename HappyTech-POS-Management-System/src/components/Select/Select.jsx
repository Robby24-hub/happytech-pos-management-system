import "./Select.css";
import { ChevronDown } from "lucide-react";
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
