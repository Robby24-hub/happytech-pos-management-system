export const pages = [
  { id: "dashboard", label: "Dashboard", icon: "imgLayoutDashboard" },
  { id: "super-dashboard", label: "Home", icon: "imgLayoutDashboard" },
  { id: "pos", label: "POS", icon: "imgShoppingCart" },
  { id: "sales-history", label: "Sales History", icon: "imgHistory" },
  { id: "inventory", label: "Inventory", icon: "imgPackage" },
  { id: "reports", label: "Reports", icon: "imgBarChart3" },
  { id: "settings", label: "Settings", icon: "imgSettings" },
  { id: "administration", label: "Admin Management" },
  { id: "logs", label: "Activity Logs" },
];
export function getAllowedPages(role) {
  if (role === "Cashier") return ["pos", "sales-history"];
  if (role === "Admin") return ["dashboard", "sales-history", "inventory", "reports", "settings", "logs"];
  if (role === "Super Admin") return ["super-dashboard", "administration", "logs"];
  return [];
}
