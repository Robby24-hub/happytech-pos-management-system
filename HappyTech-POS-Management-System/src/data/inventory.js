// Stock quantities are stored in the group's base unit. Wholesale sizes share
// the wholesale pool; their thresholds are measured in complete packs.
export const groupUnit = (s, group) => s.groupUnits?.[group] || "kg";
export const groupThreshold = (s, group) =>
  Number(s.settings.groupThresholds?.[group] ?? s.settings.lowStock ?? 50);
export const retailThreshold = (p, settings) =>
  Number(
    p.lowStock ??
      settings.groupThresholds?.[p.group] ??
      settings.lowStock ??
      50,
  );
export const wholesaleStock = (p, v) => Math.floor((p.wholesale || 0) / v.size);
export const totalStock = (p) => p.stock + (p.wholesale || 0);
export function normalizeState(s) {
  return {
    ...s,
    groupUnits: Object.fromEntries(
      s.groups.map((g) => [
        g,
        s.groupUnits?.[g] ||
          s.products.find((p) => p.group === g)?.unit ||
          "kg",
      ]),
    ),
    settings: {
      ...s.settings,
      groupThresholds: Object.fromEntries(
        s.groups.map((g) => [
          g,
          Number(s.settings.groupThresholds?.[g] ?? s.settings.lowStock ?? 50),
        ]),
      ),
    },
    products: s.products.map((p) => ({
      ...p,
      unit: s.groupUnits?.[p.group] || p.unit || "kg",
      lowStock:
        p.lowStock ??
        s.settings.groupThresholds?.[p.group] ??
        s.settings.lowStock ??
        50,
      wholesaleUnits:
        p.wholesaleUnits ??
        (["jasmine", "denorado", "sinandomeng"].includes(p.id)
          ? [
              {
                id: p.id + "-pack",
                size: p.id === "jasmine" ? 25 : 50,
                price: p.price * (p.id === "jasmine" ? 25 : 50),
                lowStock: Math.ceil(
                  (s.settings.lowStock ?? 50) / (p.id === "jasmine" ? 25 : 50),
                ),
              },
            ]
          : []),
    })),
    returnApprovals: s.returnApprovals || [],
    notificationState: s.notificationState || {},
    logs: s.logs || [],
    backups: s.backups || [],
  };
}
export function stockAlerts(s) {
  return s.products.flatMap((p) => {
    const variants = [
      {
        id: "retail",
        qty: p.stock,
        threshold: retailThreshold(p, s.settings),
        label: `${p.name} — retail`,
        unit: p.unit || groupUnit(s, p.group),
      },
      ...(p.wholesaleUnits || []).map((v) => ({
        id: v.id,
        qty: wholesaleStock(p, v),
        threshold: v.lowStock,
        label: `${p.name} — ${v.size} ${p.unit} wholesale`,
        unit: "packs",
      })),
    ];
    return variants
      .filter((v) => v.qty === 0 || v.qty < v.threshold)
      .map((v) => ({
        ...v,
        productId: p.id,
        status: v.qty === 0 ? "Out of Stock" : "Low Stock",
      }));
  });
}
export function notificationsFor(s, role) {
  const stock = stockAlerts(s).map((a) => ({
    id: `stock:${a.productId}:${a.id}:${a.status}:${a.qty}:${a.threshold}`,
    title: `${a.status}: ${a.label}`,
    message: `${a.qty} ${a.unit} available · threshold ${a.threshold} ${a.unit}`,
    target: role === "Cashier" ? "pos" : "inventory",
    tone: a.qty === 0 ? "danger" : "warning",
  }));
  const returns =
    role === "Cashier"
      ? []
      : s.returnApprovals
          .filter((r) => r.status === "pending")
          .map((r) => ({
            id: `return:${r.id}`,
            title: `Refund return awaiting approval: ${r.invoice}`,
            message: r.reason,
            target: "inventory",
            tone: "alert",
          }));
  return [...returns, ...stock]
    .filter((n) => !s.notificationState[n.id]?.removed)
    .map((n) => ({ ...n, read: !!s.notificationState[n.id]?.read }));
}
