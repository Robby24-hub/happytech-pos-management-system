export const pages = [
  { id: "dashboard", label: "Dashboard", icon: "imgLayoutDashboard" },
  { id: "pos", label: "POS", icon: "imgShoppingCart" },
  { id: "sales-history", label: "Sales History", icon: "imgHistory" },
  { id: "inventory", label: "Inventory", icon: "imgPackage" },
  { id: "reports", label: "Reports", icon: "imgBarChart3" },
  { id: "settings", label: "Settings", icon: "imgSettings" },
  { id: "administration", label: "Administration" },
  { id: "logs", label: "Activity Logs" },
];

export function getAllowedPages(role) {
  if (role === "Cashier") return ["pos", "sales-history"];
  return pages
    .filter((page) => role === "Super Admin" || page.id !== "administration")
    .map((page) => page.id);
}
