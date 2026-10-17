import "./Inventory.css";
import { useState } from "react";
import {
  Plus,
  PackagePlus,
  Trash2,
  Pencil,
  // Boxes,
  // Banknote,
  // TriangleAlert,
  // Package,
} from "lucide-react";
import {
  Card,
  Button,
  Stat,
  SearchField,
  Select,
  Badge,
  Icon,
  Modal,
  Field,
  Empty,
} from "../../components/UI";
import {
  groupUnit,
  groupThreshold,
  wholesaleStock,
  totalStock,
  stockAlerts,
} from "../../data/inventory";
import { money, stockStatus } from "../../data/mock";
const blank = {
  name: "",
  group: "Rice",
  price: "",
  stock: "",
  wholesale: "0",
  available: true,
  icon: "imgPackage1",
  unit: "kg",
};
const rowScreens = [
  "5-428",
  "5-511",
  "5-594",
  "5-677",
  "5-760",
  "5-843",
  "5-926",
  "5-1009",
  "5-1092",
];
export default function Inventory({ state, update, notify, user }) {
  const [search, setSearch] = useState(""),
    [group, setGroup] = useState("All Products"),
    [status, setStatus] = useState("All Status"),
    [sort, setSort] = useState("az"),
    [modal, setModal] = useState(null),
    [form, setForm] = useState(blank),
    [qty, setQty] = useState(""),
    [pool, setPool] = useState("retail"),
    [newGroup, setNewGroup] = useState(""),
    [newUnit, setNewUnit] = useState(""),
    [replacementGroup, setReplacementGroup] = useState(""),
    [error, setError] = useState("");
  const products = state.products
    .filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) &&
        (group === "All Products" || p.group === group) &&
        (status === "All Status" ||
          (status === "Low Stock"
            ? stockAlerts(state).some(
                (a) => a.productId === p.id && a.status === status,
              )
            : stockStatus(p, state.settings.lowStock) === status)),
    )
    .sort((a, b) =>
      sort === "az"
        ? a.name.localeCompare(b.name)
        : sort === "za"
          ? b.name.localeCompare(a.name)
          : sort === "stockUp"
            ? a.stock - b.stock
            : sort === "stockDown"
              ? b.stock - a.stock
              : sort === "priceUp"
                ? a.price - b.price
                : b.price - a.price,
    );
  const open = (type, p) => {
    setModal({ type, p });
    setError("");
    setQty("");
    setForm(
      p
        ? {
            ...p,
            wholesaleUnits: (p.wholesaleUnits || []).map((v) => ({ ...v })),
          }
        : {
            ...blank,
            unit: groupUnit(
              state,
              state.groups.includes(blank.group)
                ? blank.group
                : state.groups[0],
            ),
            lowStock: groupThreshold(
              state,
              state.groups.includes(blank.group)
                ? blank.group
                : state.groups[0],
            ),
            wholesaleUnits: [],
            group: state.groups.includes(blank.group)
              ? blank.group
              : state.groups[0],
          },
    );
  };
  const save = (e) => {
    e.preventDefault();
    if (
      !form.name.trim() ||
      state.products.some(
        (p) =>
          p.id !== form.id &&
          p.name.toLowerCase() === form.name.trim().toLowerCase(),
      )
    ) {
      setError("Enter a unique product name.");
      return;
    }
    if (
      form.wholesaleUnits.some(
        (v, i, all) =>
          !Number.isFinite(Number(v.size)) ||
          Number(v.size) <= 1 ||
          !Number.isFinite(Number(v.price)) ||
          Number(v.price) <= 0 ||
          !Number.isFinite(Number(v.lowStock)) ||
          Number(v.lowStock) < 0 ||
          all.some((x, j) => j !== i && Number(x.size) === Number(v.size)),
      )
    ) {
      setError(
        "Wholesale sizes must be unique and greater than 1. Enter a positive selling price and a nonnegative threshold.",
      );
      return;
    }
    const product = {
      ...form,
      name: form.name.trim(),
      id: form.id || crypto.randomUUID(),
      price: Number(form.price),
      stock: Number(form.stock),
      wholesale: Number(form.wholesale),
      lowStock: Number(form.lowStock),
      wholesaleUnits: form.wholesaleUnits.map((v) => ({
        ...v,
        size: Number(v.size),
        price: Number(v.price),
        lowStock: Number(v.lowStock),
      })),
    };
    update(
      (s) => ({
        ...s,
        products:
          modal.type === "add"
            ? [...s.products, product]
            : s.products.map((p) => (p.id === product.id ? product : p)),
      }),
      `${modal.type === "add" ? "Added" : "Edited"} product ${product.name}`,
    );
    setModal(null);
    notify(modal.type === "add" ? "Product added" : "Product changes saved");
  };
  const toggle = (p) => {
    update(
      (s) => ({
        ...s,
        products: s.products.map((x) =>
          x.id === p.id ? { ...x, available: !x.available } : x,
        ),
      }),
      `${p.available ? "Hid" : "Showed"} ${p.name} on POS`,
    );
    notify("POS availability updated");
  };
  const resolveReturn = (request, decision) => {
    if (user.role === "Cashier") return;
    const missing = request.items.some(
      (i) => !state.products.some((p) => p.id === i.productId),
    );
    if (decision === "approved" && missing) {
      notify(
        "A returned product was deleted. Restore it from a backup before approving this return.",
        "danger",
      );
      return;
    }
    update(
      (s) => {
        const pending = s.returnApprovals.find(
          (r) => r.id === request.id && r.status === "pending",
        );
        if (
          !pending ||
          (decision === "approved" &&
            pending.items.some(
              (i) => !s.products.some((p) => p.id === i.productId),
            ))
        )
          return s;
        return {
          ...s,
          returnApprovals: s.returnApprovals.map((r) =>
            r.id === pending.id
              ? {
                  ...r,
                  status: decision,
                  reviewedBy: user.name,
                  reviewedAt: new Date().toISOString(),
                }
              : r,
          ),
          products:
            decision !== "approved"
              ? s.products
              : s.products.map((p) => {
                  const amount = (pool) =>
                    pending.items
                      .filter(
                        (i) =>
                          i.productId === p.id && (i.pool || "retail") === pool,
                      )
                      .reduce((n, i) => n + i.qty * (i.multiplier || 1), 0);
                  return {
                    ...p,
                    stock: Math.round((p.stock + amount("retail")) * 100) / 100,
                    wholesale:
                      Math.round((p.wholesale + amount("wholesale")) * 100) /
                      100,
                  };
                }),
        };
      },
      `${decision === "approved" ? "Approved" : "Rejected"} returned stock for ${request.invoice}`,
    );
    notify(
      decision === "approved"
        ? "Return approved · inventory stock updated"
        : "Return rejected · stock unchanged",
    );
  };
  return (
    <main className="main inventory">
      <div className="stats-grid">
        <Stat
          onClick={() => {
            setSearch("");
            setGroup("All Products");
            setStatus("All Status");
          }}
          active={
            status === "All Status" && group === "All Products" && !search
          }
          label="Total Products"
          value={state.products.length}
          caption="Across all groups"
          screen="5-344"
          icon="imgBoxes"
        />
        <Stat
          label="Inventory Value"
          value={money(
            state.products.reduce(
              (n, p) => n + (p.stock + p.wholesale) * p.price,
              0,
            ),
          )}
          caption="At selling prices"
          screen="5-344"
          icon="imgBanknote"
        />
        <Stat
          onClick={() => {
            setSearch("");
            setGroup("All Products");
            setStatus("Low Stock");
          }}
          active={status === "Low Stock"}
          label="Low Stock"
          value={
            state.products.filter((p) =>
              stockAlerts(state).some(
                (a) => a.productId === p.id && a.status === "Low Stock",
              ),
            ).length
          }
          caption="Below product thresholds"
          screen="5-344"
          icon="imgTriangleAlert"
          warning
        />
        <Stat
          onClick={() => {
            setSearch("");
            setGroup("All Products");
            setStatus("Out of Stock");
          }}
          active={status === "Out of Stock"}
          label="Out of Stock"
          value={state.products.filter((p) => p.stock === 0).length}
          caption="Zero retail stock"
          screen="5-344"
          icon="imgPackage"
          alert
        />
      </div>
      <section className="return-queue" aria-label="Refund return approvals">
        {state.returnApprovals
          .filter((r) => r.status === "pending")
          .map((r) => (
            <article className="return-alert" key={r.id}>
              <h2>Refund return awaiting stock approval · {r.invoice}</h2>
              <p>Reason: {r.reason}</p>
              <ul>
                {r.items.map((i, index) => (
                  <li key={index}>
                    {i.name}: {i.qty} {i.unit} → {i.qty * (i.multiplier || 1)}{" "}
                    {i.baseUnit ||
                      state.products.find((p) => p.id === i.productId)?.unit ||
                      "kg"}{" "}
                    ({i.pool || "retail"})
                  </li>
                ))}
              </ul>
              <p className="helper">
                Inspect these returned goods before approving. Stock has not
                been restored.
              </p>
              {user.role !== "Cashier" && (
                <div className="return-actions">
                  <Button primary onClick={() => resolveReturn(r, "approved")}>
                    Approve stock return
                  </Button>
                  <Button danger onClick={() => resolveReturn(r, "rejected")}>
                    Reject stock return
                  </Button>
                </div>
              )}
            </article>
          ))}
      </section>
      <Card className="overflow-hidden">
        <div className="table-controls">
          <SearchField value={search} onChange={setSearch} />
          <Select
            value={group}
            label="Product group"
            onChange={(v) =>
              v === "add"
                ? open("group")
                : v === "manage"
                  ? open("groups")
                  : setGroup(v)
            }
            options={[
              "All Products",
              ...state.groups,
              { value: "add", label: "+ Add Group" },
              { value: "manage", label: "Manage Groups" },
            ]}
          />
          <Select
            value={status}
            label="Stock status"
            onChange={setStatus}
            options={["All Status", "In Stock", "Low Stock", "Out of Stock"]}
          />
          <Select
            value={sort}
            label="Sort products"
            onChange={setSort}
            options={[
              { value: "az", label: "A–Z" },
              { value: "za", label: "Z–A" },
              { value: "stockUp", label: "Stock: Low–High" },
              { value: "stockDown", label: "Stock: High–Low" },
              { value: "priceUp", label: "Price: Low–High" },
              { value: "priceDown", label: "Price: High–Low" },
            ]}
          />
          <Button primary onClick={() => open("add")}>
            <Plus size={18} />
            Add Product
          </Button>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {[
                  "Products",
                  "Group",
                  "Unit",
                  "Total Stocks",
                  "Selling Price/unit",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <button
                      className="product-name"
                      onClick={() => open("details", p)}
                    >
                      <span className="inventory-art">
                        {p.image ? (
                          <img src={p.image} alt={p.name} />
                        ) : (
                          <Icon
                            screen={
                              rowScreens[
                                state.products.findIndex((x) => x.id === p.id)
                              ] || "5-428"
                            }
                            name="imgRiceIllustration"
                          />
                        )}
                      </span>
                      <strong>{p.name}</strong>
                    </button>
                  </td>
                  <td>{p.group}</td>
                  <td>{p.unit}</td>
                  <td>
                    {totalStock(p)} {p.unit}
                    <small className="block text-muted">
                      {p.stock} retail · {p.wholesale} wholesale
                    </small>
                  </td>
                  <td>
                    {money(p.price)}/{p.unit}
                  </td>
                  <td>
                    <Badge>{stockStatus(p, state.settings.lowStock)}</Badge>
                    {stockAlerts(state)
                      .filter((a) => a.productId === p.id && a.id !== "retail")
                      .map((a) => (
                        <small className="wholesale-stock-alert" key={a.id}>
                          {a.label.replace(p.name + " — ", "")}: {a.status}
                        </small>
                      ))}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        className={`toggle ${p.available ? "on" : ""}`}
                        role="switch"
                        aria-checked={p.available}
                        aria-label={`Show ${p.name} on POS`}
                        onClick={() => toggle(p)}
                      >
                        <span />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`Restock ${p.name}`}
                        onClick={() => open("restock", p)}
                      >
                        <PackagePlus size={20} />
                      </button>
                      <button
                        className="icon-button text-red-500"
                        aria-label={`Delete ${p.name}`}
                        onClick={() => open("delete", p)}
                      >
                        <Trash2 size={19} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!products.length && <Empty>No products match these filters.</Empty>}
        </div>
        <footer className="table-footer">
          {products.length} products · Tap a product to view its details
        </footer>
      </Card>
      {modal && (
        <Modal
          title={
            {
              add: "Add Product",
              edit: "Edit Product",
              details: "Product Details",
              restock: "Restock Product",
              delete: "Delete Product",
              group: "Add Product Group",
              groups: "Manage Product Groups",
              deleteGroup: "Delete Product Group",
            }[modal.type]
          }
          drawer={modal.type === "details"}
          onClose={() => setModal(null)}
        >
          {modal.type === "groups" ? (
            <div>
              <p className="helper mb-4">
                Manage product groups here. Products can be reassigned before a
                group is deleted.
              </p>
              {state.groups.map((g) => (
                <div key={g} className="group-management-row">
                  <div>
                    <strong>{g}</strong>
                    <small>
                      {state.products.filter((p) => p.group === g).length}{" "}
                      products · {groupUnit(state, g)}
                    </small>
                  </div>
                  <Button
                    danger
                    disabled={state.groups.length === 1}
                    onClick={() => {
                      setReplacementGroup(
                        state.groups.find(
                          (x) =>
                            x !== g &&
                            groupUnit(state, x) === groupUnit(state, g),
                        ) || "",
                      );
                      open("deleteGroup", g);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              ))}
              {state.groups.length === 1 && (
                <p className="helper mt-4">Keep at least one product group.</p>
              )}
              <Button primary className="mt-4" onClick={() => open("group")}>
                <Plus size={18} />
                Add Group
              </Button>
            </div>
          ) : modal.type === "deleteGroup" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const assigned = state.products.some(
                  (p) => p.group === modal.p,
                );
                if (
                  state.groups.length <= 1 ||
                  (assigned &&
                    (!replacementGroup ||
                      replacementGroup === modal.p ||
                      !state.groups.includes(replacementGroup) ||
                      groupUnit(state, replacementGroup) !==
                        groupUnit(state, modal.p)))
                ) {
                  setError(
                    "Choose a replacement group with the same default unit.",
                  );
                  return;
                }
                update(
                  (s) => ({
                    ...s,
                    groups: s.groups.filter((g) => g !== modal.p),
                    products: s.products.map((p) =>
                      p.group === modal.p
                        ? { ...p, group: replacementGroup }
                        : p,
                    ),
                  }),
                  `Deleted product group ${modal.p}${assigned ? `; reassigned products to ${replacementGroup}` : ""}`,
                );
                if (group === modal.p) setGroup("All Products");
                setModal(null);
                notify("Product group deleted");
              }}
            >
              <p className="mb-4">
                Delete <strong>{modal.p}</strong>? Products can only move to a
                group with the same default unit.
              </p>
              {state.products.some((p) => p.group === modal.p) && (
                <Field label="Move existing products to">
                  <select
                    required
                    value={replacementGroup}
                    onChange={(e) => setReplacementGroup(e.target.value)}
                  >
                    {state.groups
                      .filter(
                        (g) =>
                          g !== modal.p &&
                          groupUnit(state, g) === groupUnit(state, modal.p),
                      )
                      .map((g) => (
                        <option key={g}>{g}</option>
                      ))}
                  </select>
                </Field>
              )}
              {error && <p className="error">{error}</p>}
              <div className="modal-actions">
                <Button type="button" onClick={() => open("groups")}>
                  Cancel
                </Button>
                <Button danger>Delete Group</Button>
              </div>
            </form>
          ) : ["add", "edit"].includes(modal.type) ? (
            <form onSubmit={save}>
              <p className="helper mb-4">
                Add a product and optional wholesale units.
              </p>
              <Field label="Product Group *">
                <select
                  required
                  value={form.group}
                  onChange={(e) => {
                    const g = e.target.value;
                    if (form.id && groupUnit(state, g) !== form.unit) {
                      setError(
                        "Choose a group with the same unit to preserve existing stock quantities.",
                      );
                      return;
                    }
                    setError("");
                    setForm({
                      ...form,
                      group: g,
                      unit: groupUnit(state, g),
                      lowStock: groupThreshold(state, g),
                      wholesaleUnits: form.wholesaleUnits.map((v) => ({
                        ...v,
                        lowStock: Math.ceil(
                          groupThreshold(state, g) / Number(v.size || 1),
                        ),
                      })),
                    });
                  }}
                >
                  {state.groups.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </Field>
              <Field label="Product Image (PNG or JPEG, max 1 MB)">
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (
                      f.size > 1048576 ||
                      !["image/png", "image/jpeg"].includes(f.type)
                    ) {
                      setError("Choose a PNG or JPEG image smaller than 1 MB.");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      setForm((d) => ({ ...d, image: String(reader.result) }));
                      setError("");
                    };
                    reader.readAsDataURL(f);
                  }}
                />
                {form.image && (
                  <img
                    className="product-image-preview"
                    src={form.image}
                    alt="Product preview"
                  />
                )}
              </Field>
              <Field
                label="Product Name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label={`Retail Stock (${form.unit}) *`}
                  type="number"
                  min="0"
                  step={form.unit === "pc" ? "1" : "0.01"}
                  required
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                />
                <Field
                  label={`Selling Price/unit (${form.unit}) *`}
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
              <Field
                label={`Retail Low Stock Threshold (${form.unit}) *`}
                type="number"
                min="0"
                step="0.01"
                required
                value={form.lowStock}
                onChange={(e) => setForm({ ...form, lowStock: e.target.value })}
              />
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={form.available}
                  onChange={(e) =>
                    setForm({ ...form, available: e.target.checked })
                  }
                />
                Show on POS
              </label>
              <h3 className="mt-5 mb-3">Wholesale Units</h3>
              <Field
                label={`Wholesale Stock (${form.unit})`}
                type="number"
                min="0"
                step={form.unit === "pc" ? "1" : "0.01"}
                required
                value={form.wholesale}
                onChange={(e) =>
                  setForm({ ...form, wholesale: e.target.value })
                }
              />
              <p className="helper mb-4">
                All wholesale sizes share this stock pool in {form.unit}. A 25{" "}
                {form.unit} pack uses 25 {form.unit} of wholesale stock.
                Thresholds below count complete packs.
              </p>
              {form.wholesaleUnits.map((v, index) => (
                <div className="wholesale-unit-form" key={v.id}>
                  <h4>Wholesale unit {index + 1}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <Field
                      label={`Units (${form.unit})`}
                      type="number"
                      min="1.01"
                      step="0.01"
                      required
                      value={v.size}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          wholesaleUnits: form.wholesaleUnits.map((x) =>
                            x.id === v.id
                              ? {
                                  ...x,
                                  size: e.target.value,
                                  lowStock: Math.ceil(
                                    groupThreshold(state, form.group) /
                                      Number(e.target.value || 1),
                                  ),
                                }
                              : x,
                          ),
                        })
                      }
                    />
                    <Field
                      label="Wholesale Selling Price"
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      value={v.price}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          wholesaleUnits: form.wholesaleUnits.map((x) =>
                            x.id === v.id ? { ...x, price: e.target.value } : x,
                          ),
                        })
                      }
                    />
                  </div>
                  <Field
                    label="Wholesale Low Stock Threshold (packs)"
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={v.lowStock}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        wholesaleUnits: form.wholesaleUnits.map((x) =>
                          x.id === v.id
                            ? { ...x, lowStock: e.target.value }
                            : x,
                        ),
                      })
                    }
                  />
                  <Button
                    type="button"
                    danger
                    onClick={() =>
                      setForm({
                        ...form,
                        wholesaleUnits: form.wholesaleUnits.filter(
                          (x) => x.id !== v.id,
                        ),
                      })
                    }
                  >
                    Remove wholesale unit
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                className="w-full"
                onClick={() =>
                  setForm({
                    ...form,
                    wholesaleUnits: [
                      ...form.wholesaleUnits,
                      {
                        id: crypto.randomUUID(),
                        size: "",
                        price: "",
                        lowStock: Math.ceil(groupThreshold(state, form.group)),
                      },
                    ],
                  })
                }
              >
                <Plus size={17} />
                Add New Wholesale Unit
              </Button>
              {error && <p className="error">{error}</p>}
              <div className="modal-actions">
                <Button type="button" onClick={() => setModal(null)}>
                  Cancel
                </Button>
                <Button primary>Save Product</Button>
              </div>
            </form>
          ) : modal.type === "details" ? (
            <>
              <div className="details-product">
                <span className="inventory-art">
                  <Icon
                    name="imgRiceIllustration"
                    screen={
                      rowScreens[
                        state.products.findIndex((x) => x.id === modal.p.id)
                      ] || "5-428"
                    }
                  />
                </span>
                <h2>{modal.p.name}</h2>
                <Badge>{stockStatus(modal.p, state.settings.lowStock)}</Badge>
              </div>
              <dl className="details-list">
                <dt>Product ID</dt>
                <dd>{modal.p.id}</dd>
                <dt>Group</dt>
                <dd>{modal.p.group}</dd>
                <dt>Retail stock</dt>
                <dd>
                  {modal.p.stock} {modal.p.unit}
                </dd>
                <dt>Wholesale stock</dt>
                <dd>
                  {modal.p.wholesale} {modal.p.unit}
                </dd>
                <dt>Selling price</dt>
                <dd>
                  {money(modal.p.price)}/{modal.p.unit}
                </dd>
                <dt>Retail low stock threshold</dt>
                <dd>
                  {modal.p.lowStock} {modal.p.unit}
                </dd>
                {(modal.p.wholesaleUnits || []).map((v) => (
                  <div className="wholesale-detail" key={v.id}>
                    <dt>
                      {v.size} {modal.p.unit} wholesale
                    </dt>
                    <dd>
                      {money(v.price)} · {wholesaleStock(modal.p, v)} packs
                      available · alert below {v.lowStock} packs
                    </dd>
                  </div>
                ))}
                <dt>Available on POS</dt>
                <dd>{modal.p.available ? "Yes" : "No"}</dd>
              </dl>
              <Button
                primary
                className="w-full mt-5"
                onClick={() => open("edit", modal.p)}
              >
                <Pencil size={17} />
                Edit Product
              </Button>
            </>
          ) : modal.type === "restock" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                update(
                  (s) => ({
                    ...s,
                    products: s.products.map((p) =>
                      p.id === modal.p.id
                        ? {
                            ...p,
                            [pool === "retail" ? "stock" : "wholesale"]:
                              Math.round(
                                (p[pool === "retail" ? "stock" : "wholesale"] +
                                  Number(qty)) *
                                  100,
                              ) / 100,
                          }
                        : p,
                    ),
                  }),
                  `Restocked ${modal.p.name} by ${qty} ${modal.p.unit} (${pool})`,
                );
                setModal(null);
                notify("Stock updated");
              }}
            >
              <p className="mb-4">
                Add stock for <b>{modal.p.name}</b>.
              </p>
              <Field label="Stock location">
                <select value={pool} onChange={(e) => setPool(e.target.value)}>
                  <option value="retail">Retail</option>
                  <option value="wholesale">Wholesale</option>
                </select>
              </Field>
              <Field
                label={`Quantity to add (${modal.p.unit})`}
                type="number"
                min="0.01"
                step="0.01"
                required
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
              <div className="modal-actions">
                <Button primary>Restock</Button>
              </div>
            </form>
          ) : modal.type === "delete" ? (
            <>
              <p>
                Delete <b>{modal.p.name}</b>? Existing sales records will be
                retained. Resolve any pending stock return approvals for this
                product before deleting it.
              </p>
              <div className="modal-actions">
                <Button onClick={() => setModal(null)}>Cancel</Button>
                <Button
                  danger
                  disabled={state.returnApprovals.some(
                    (r) =>
                      r.status === "pending" &&
                      r.items.some((i) => i.productId === modal.p.id),
                  )}
                  onClick={() => {
                    update(
                      (s) => ({
                        ...s,
                        products: s.products.filter((p) => p.id !== modal.p.id),
                      }),
                      `Deleted product ${modal.p.name}`,
                    );
                    setModal(null);
                    notify("Product deleted");
                  }}
                >
                  Delete Product
                </Button>
              </div>
            </>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const g = newGroup.trim();
                if (
                  !g ||
                  !newUnit.trim() ||
                  ["all products", "add", "manage"].includes(g.toLowerCase()) ||
                  state.groups.some((x) => x.toLowerCase() === g.toLowerCase())
                ) {
                  setError("Enter a unique group name.");
                  return;
                }
                update(
                  (s) => ({
                    ...s,
                    groups: [...s.groups, g],
                    groupUnits: {
                      ...s.groupUnits,
                      [g]: newUnit.trim().toLowerCase(),
                    },
                    settings: {
                      ...s.settings,
                      groupThresholds: {
                        ...s.settings.groupThresholds,
                        [g]: s.settings.lowStock ?? 50,
                      },
                    },
                  }),
                  `Created product group ${g}`,
                );
                setModal(null);
                setNewGroup("");
                setNewUnit("");
                notify("Product group added");
              }}
            >
              <Field
                label="Group Name"
                required
                value={newGroup}
                onChange={(e) => setNewGroup(e.target.value)}
              />
              <Field
                label="Default Unit"
                required
                maxLength={20}
                placeholder="e.g. kg, pc, L"
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
              />
              {error && <p className="error">{error}</p>}
              <div className="modal-actions">
                <Button primary>Add Group</Button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </main>
  );
}
