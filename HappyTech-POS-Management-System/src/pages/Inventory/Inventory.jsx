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
export default function Inventory({ state, update, notify }) {
  const [search, setSearch] = useState(""),
    [group, setGroup] = useState("All Products"),
    [status, setStatus] = useState("All Status"),
    [sort, setSort] = useState("az"),
    [modal, setModal] = useState(null),
    [form, setForm] = useState(blank),
    [qty, setQty] = useState(""),
    [pool, setPool] = useState("retail"),
    [newGroup, setNewGroup] = useState(""),
    [replacementGroup, setReplacementGroup] = useState(""),
    [error, setError] = useState("");
  const products = state.products
    .filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) &&
        (group === "All Products" || p.group === group) &&
        (status === "All Status" ||
          stockStatus(p, state.settings.lowStock) === status),
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
        ? { ...p }
        : {
            ...blank,
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
    const product = {
      ...form,
      name: form.name.trim(),
      id: form.id || crypto.randomUUID(),
      price: Number(form.price),
      stock: Number(form.stock),
      wholesale: Number(form.wholesale),
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
            state.products.filter(
              (p) => p.stock > 0 && p.stock < state.settings.lowStock,
            ).length
          }
          caption={`Below ${state.settings.lowStock} kg`}
          screen="5-344"
          icon="imgTriangleAlert"
          alert
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
                        <Icon
                          screen={
                            rowScreens[
                              state.products.findIndex((x) => x.id === p.id)
                            ] || "5-428"
                          }
                          name="imgRiceIllustration"
                        />
                      </span>
                      <strong>{p.name}</strong>
                    </button>
                  </td>
                  <td>{p.group}</td>
                  <td>kg</td>
                  <td>
                    {p.stock + p.wholesale} kg
                    <small className="block text-muted">
                      {p.stock} retail · {p.wholesale} wholesale
                    </small>
                  </td>
                  <td>{money(p.price)}/kg</td>
                  <td>
                    <Badge>{stockStatus(p, state.settings.lowStock)}</Badge>
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
                      products
                    </small>
                  </div>
                  <Button
                    danger
                    disabled={state.groups.length === 1}
                    onClick={() => {
                      setReplacementGroup(
                        state.groups.find((x) => x !== g) || "",
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
                      !state.groups.includes(replacementGroup)))
                ) {
                  setError("Choose a valid replacement group.");
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
                Delete <strong>{modal.p}</strong>?
              </p>
              {state.products.some((p) => p.group === modal.p) && (
                <Field label="Move existing products to">
                  <select
                    required
                    value={replacementGroup}
                    onChange={(e) => setReplacementGroup(e.target.value)}
                  >
                    {state.groups
                      .filter((g) => g !== modal.p)
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
              <Field
                label="Product Name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Field label="Product Group">
                <select
                  value={form.group}
                  onChange={(e) => setForm({ ...form, group: e.target.value })}
                >
                  {state.groups.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Selling Price / kg"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
                <Field
                  label="Retail Stock (kg)"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                />
              </div>
              <Field
                label="Wholesale Stock (kg)"
                type="number"
                min="0"
                step="0.01"
                required
                value={form.wholesale}
                onChange={(e) =>
                  setForm({ ...form, wholesale: e.target.value })
                }
              />
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={form.available}
                  onChange={(e) =>
                    setForm({ ...form, available: e.target.checked })
                  }
                />
                Available on POS
              </label>
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
                <dd>{modal.p.stock} kg</dd>
                <dt>Wholesale stock</dt>
                <dd>{modal.p.wholesale} kg</dd>
                <dt>Selling price</dt>
                <dd>{money(modal.p.price)}/kg</dd>
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
                  `Restocked ${modal.p.name} by ${qty} kg (${pool})`,
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
                label="Quantity to add (kg)"
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
                retained.
              </p>
              <div className="modal-actions">
                <Button onClick={() => setModal(null)}>Cancel</Button>
                <Button
                  danger
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
                  ["all products", "add", "manage"].includes(g.toLowerCase()) ||
                  state.groups.some((x) => x.toLowerCase() === g.toLowerCase())
                ) {
                  setError("Enter a unique group name.");
                  return;
                }
                update(
                  (s) => ({ ...s, groups: [...s.groups, g] }),
                  `Created product group ${g}`,
                );
                setModal(null);
                setNewGroup("");
                notify("Product group added");
              }}
            >
              <Field
                label="Group Name"
                required
                value={newGroup}
                onChange={(e) => setNewGroup(e.target.value)}
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
