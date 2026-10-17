import "./SearchField.css";
import { Search } from "lucide-react";
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
