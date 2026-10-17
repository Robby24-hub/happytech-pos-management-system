import "./Badge.css";

export const Badge = ({ children, tone = "" }) => (
  <span
    className={`badge ${tone || { "In Stock": "green", "Low Stock": "amber", "Out of Stock": "red", Refunded: "red", Completed: "green" }[children] || "gray"}`}
  >
    {children}
  </span>
);
