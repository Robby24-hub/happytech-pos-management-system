const day = new Date();
day.setHours(10, 30, 0, 0);
export const seedProducts = [
  ["basmati", "Basmati Rice", 64, 10, 70, "imgPackage1"],
  ["brown", "Brown Rice", 65, 7, 0, "imgWheat"],
  ["coco", "Coco Pandan Rice", 58, 35, 0, "imgLeaf"],
  ["denorado", "Denorado Rice", 46, 70, 0, "imgWheat"],
  ["jasmine", "Jasmine Rice", 48, 80, 0, "imgPackage1"],
  ["malagkit", "Malagkit Rice", 60, 8, 0, "imgPackage1"],
  ["organic", "Organic Rice", 70, 0, 50, "imgLeaf"],
  ["red", "Red Rice", 62, 20, 0, "imgPackage1"],
  ["sinandomeng", "Sinandomeng Rice", 48, 0, 100, "imgWheat"],
].map(([id, name, price, stock, wholesale, icon]) => ({
  id,
  name,
  price,
  stock,
  wholesale,
  icon,
  group: "Rice",
  unit: "kg",
  available: true,
}));
export const seedUsers = [
  {
    id: "owner",
    name: "Ricky Yurag",
    role: "Admin",
    pin: "1234",
    active: true,
  },
  {
    id: "maria",
    name: "Maria Santos",
    role: "Cashier",
    pin: "1234",
    active: true,
  },
  {
    id: "rogelio",
    name: "Rogelio Reyes",
    role: "Cashier",
    pin: "1234",
    active: true,
  },
  {
    id: "super",
    name: "System Administrator",
    role: "Super Admin",
    pin: "1234",
    active: true,
  },
];
export const seedSales = Array.from({ length: 6 }, (_, i) => {
  const p = seedProducts[i];
  const items = [
    {
      productId: p.id,
      name: p.name,
      qty: [3, 4, 2, 4, 1, 7][i],
      unit: "kg",
      multiplier: 1,
      price: p.price,
    },
  ];
  return {
    id: `INV-${String(i + 1).padStart(4, "0")}`,
    uuid: `seed-${i}`,
    date: new Date(day.getTime() - i * 25 * 60000).toISOString(),
    cashier: seedUsers[i % 3].name,
    items,
    payment: i % 2 ? "GCash" : "Cash",
    total: items.reduce((s, x) => s + x.qty * x.price, 0),
    received: 2000,
    status: "Completed",
    sync: "Saved",
  };
});
export const seedSettings = {
  storeName: "Happy Tech Rice Store",
  address: "Sample Street, Quezon City",
  contact: "0912 345 6789",
  gcashName: "Ricky Yurag",
  gcashNumber: "0912 345 6789",
  gcashQR: "",
  receiptFooter: "Thank you for shopping with us!",
  lowStock: 50,
  dailyTarget: 20000,
  weeklyTarget: 100000,
  monthlyTarget: 400000,
  recoveryPin: "4321",
  question: "What is your favorite color?",
  answer: "green",
};
export const seedState = {
  products: seedProducts,
  users: seedUsers,
  sales: seedSales,
  settings: seedSettings,
  groups: ["Rice"],
  logs: [],
  backups: [],
};
export const money = (n) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    n || 0,
  );
export const dateTime = (v) =>
  new Date(v).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
export const stockStatus = (p, threshold) =>
  p.stock === 0
    ? "Out of Stock"
    : p.stock < (p.lowStock ?? threshold)
      ? "Low Stock"
      : "In Stock";
export function within(date, period, start, end) {
  const d = new Date(date),
    now = new Date();
  if (period === "All Dates") return true;
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  if (period === "This Week") {
    const offset = (from.getDay() + 6) % 7;
    from.setDate(from.getDate() - offset);
  }
  if (period === "This Month") from.setDate(1);
  if (period === "Custom") {
    return (
      (!start || d >= new Date(start + "T00:00:00")) &&
      (!end || d <= new Date(end + "T23:59:59"))
    );
  }
  return d >= from && d <= now;
}
