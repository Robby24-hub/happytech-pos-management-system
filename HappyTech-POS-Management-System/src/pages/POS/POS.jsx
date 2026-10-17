import "./POS.css";
import { useState } from "react";
import { Trash2, Minus, Plus, ArrowLeft } from "lucide-react";
import {
  Button,
  Card,
  Icon,
  SearchField,
  Modal,
  Field,
  Empty,
} from "../../components/UI";
import { money } from "../../data/mock";
export default function POS({ state, update, user, notify }) {
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState("All Products"),
    [cart, setCart] = useState([]),
    [modal, setModal] = useState(null),
    [checkout, setCheckout] = useState(false),
    [payment, setPayment] = useState("Cash"),
    [received, setReceived] = useState(""),
    [verified, setVerified] = useState(false),
    [pin, setPin] = useState(""),
    [error, setError] = useState(""),
    [transferQty, setTransferQty] = useState(1);
  const categories = [
    "All Products",
    ...state.groups.flatMap((g) => [
      `${g} (By ${state.groupUnits[g]})`,
      ...(state.products.some((p) => p.group === g && p.wholesaleUnits.length)
        ? [`${g} (By sk)`]
        : []),
    ]),
  ];
  const options = state.products
    .filter((p) => p.available)
    .flatMap((p) => [
      {
        ...p,
        key: p.id + "-retail",
        saleUnit: p.unit,
        multiplier: 1,
        pool: "retail",
        salePrice: p.price,
        availableStock: p.stock,
      },
      ...p.wholesaleUnits.map((v) => ({
        ...p,
        key: p.id + "-" + v.id,
        saleUnit: `${v.size} ${p.unit} pack`,
        multiplier: v.size,
        pool: "wholesale",
        variantId: v.id,
        salePrice: v.price,
        availableStock: p.wholesale,
      })),
    ])
    .filter(
      (p) =>
        (category === "All Products" ||
          category ===
            `${p.group} (By ${p.pool === "retail" ? p.unit : "sk"})`) &&
        p.name.toLowerCase().includes(search.toLowerCase()),
    );
  const total =
    Math.round(cart.reduce((s, i) => s + i.qty * i.price, 0) * 100) / 100;
  const used = (id, pool = "retail") =>
    cart
      .filter((i) => i.productId === id && (i.pool || "retail") === pool)
      .reduce((n, i) => n + i.qty * i.multiplier, 0);
  const add = (p) => {
    const product = state.products.find((x) => x.id === p.id);
    if (
      (p.pool === "wholesale" ? product.wholesale : product.stock) -
        used(p.id, p.pool) <
      p.multiplier
    ) {
      if (p.pool === "wholesale") {
        notify(
          "Insufficient wholesale stock. Restock this product in Inventory.",
          "warning",
        );
        return;
      }
      setModal({ type: "transfer", product: p });
      setTransferQty(p.multiplier);
      setPin("");
      setError("");
      return;
    }
    setCart((c) => {
      const existing = c.find((i) => i.key === p.key);
      return existing
        ? c.map((i) => (i.key === p.key ? { ...i, qty: i.qty + 1 } : i))
        : [
            ...c,
            {
              key: p.key,
              productId: p.id,
              name: p.name,
              unit: p.saleUnit,
              baseUnit: p.unit,
              pool: p.pool,
              variantId: p.variantId,
              multiplier: p.multiplier,
              price: p.salePrice,
              qty: 1,
            },
          ];
    });
  };
  const change = (item, qty) => {
    if (!Number.isFinite(qty) || qty < 0) return;
    const p = state.products.find((p) => p.id === item.productId);
    const other = used(p.id, item.pool) - item.qty * item.multiplier;
    if (
      qty * item.multiplier + other >
      (item.pool === "wholesale" ? p.wholesale : p.stock)
    ) {
      notify("Quantity exceeds available stock.", "warning");
      return;
    }
    setCart((c) =>
      qty === 0
        ? c.filter((i) => i.key !== item.key)
        : c.map((i) =>
            i.key === item.key ? { ...i, qty: Math.round(qty * 100) / 100 } : i,
          ),
    );
  };
  const transfer = (e) => {
    e.preventDefault();
    const p = state.products.find((p) => p.id === modal.product.id);
    if (
      !state.users.some(
        (u) => u.role !== "Cashier" && u.active && u.pin === pin,
      )
    ) {
      setError("Incorrect owner PIN.");
      return;
    }
    if (transferQty <= 0 || transferQty > p.wholesale) {
      setError("Enter a quantity within available wholesale stock.");
      return;
    }
    update(
      (s) => ({
        ...s,
        products: s.products.map((x) =>
          x.id === p.id
            ? {
                ...x,
                stock: x.stock + Number(transferQty),
                wholesale: x.wholesale - Number(transferQty),
              }
            : x,
        ),
      }),
      `Transferred ${transferQty} ${p.unit} of ${p.name} to retail`,
    );
    setModal(null);
    notify("Stock transferred. Tap the product to add it.");
  };
  const complete = () => {
    if (
      (payment === "Cash" && Number(received) < total) ||
      (payment === "GCash" && !verified)
    )
      return;
    const shortages = cart.some(
      (i) =>
        used(i.productId, i.pool) >
        (i.pool === "wholesale"
          ? state.products.find((p) => p.id === i.productId).wholesale
          : state.products.find((p) => p.id === i.productId).stock),
    );
    if (shortages) {
      setError(
        "Inventory changed. Check the quantities before completing this sale.",
      );
      return;
    }
    const sale = {
      id: `INV-${String(Math.max(0, ...state.sales.map((s) => Number(s.id.split("-")[1]) || 0)) + 1).padStart(4, "0")}`,
      uuid: crypto.randomUUID(),
      date: new Date().toISOString(),
      cashier: user.name,
      items: structuredClone(cart),
      payment,
      total,
      received: payment === "Cash" ? Number(received) : total,
      status: "Completed",
      sync: "Saved",
    };
    update(
      (s) => ({
        ...s,
        sales: [sale, ...s.sales],
        products: s.products.map((p) => ({
          ...p,
          stock: Math.round((p.stock - used(p.id, "retail")) * 100) / 100,
          wholesale:
            Math.round((p.wholesale - used(p.id, "wholesale")) * 100) / 100,
        })),
      }),
      `Completed ${sale.id} for ${money(total)}`,
    );
    setCart([]);
    setCheckout(false);
    setReceived("");
    setVerified(false);
    notify("Sale completed");
  };
  if (checkout)
    return (
      <main className="main checkout-layout">
        <Card className="checkout-summary">
          <Button className="self-start" onClick={() => setCheckout(false)}>
            <ArrowLeft size={17} />
            Back to cart
          </Button>
          <h2 className="mt-6 mb-4">Order Summary</h2>
          <div className="checkout-order-list">
            {cart.map((i) => (
              <div key={i.key} className="checkout-row">
                <div>
                  <strong>{i.name}</strong>
                  <small>
                    {i.qty} {i.unit} × {money(i.price)}
                  </small>
                </div>
                <b>{money(i.qty * i.price)}</b>
              </div>
            ))}
          </div>
          <div className="checkout-total">
            <span>Total</span>
            {money(total)}
          </div>
        </Card>
        <Card className="checkout-payment">
          <h2>Payment</h2>
          <p className="helper mt-1 mb-6">
            Choose a payment method to complete the sale.
          </p>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {["Cash", "GCash"].map((p) => (
              <Button
                key={p}
                primary={payment === p}
                onClick={() => {
                  setPayment(p);
                  setError("");
                }}
              >
                <Icon
                  screen="4-24"
                  name={p === "Cash" ? "imgBanknote" : "imgQrCode"}
                />
                {p}
              </Button>
            ))}
          </div>
          {payment === "Cash" ? (
            <>
              <Field
                label="Amount Received (PHP)"
                type="number"
                min={total}
                step="0.01"
                value={received}
                onChange={(e) => setReceived(e.target.value)}
              />
              <Button
                className="w-full mt-3"
                onClick={() => setReceived(String(total))}
              >
                Exact Amount
              </Button>
              <div className="checkout-row text-xl">
                <span>Change</span>
                <b>{money(Math.max(0, Number(received) - total))}</b>
              </div>
              {received !== "" && Number(received) < total && (
                <p className="error">Insufficient amount received.</p>
              )}
            </>
          ) : (
            <>
              <div className="gcash-panel">
                {state.settings.gcashQR ? (
                  <img src={state.settings.gcashQR} alt="Store GCash QR code" />
                ) : (
                  <div className="qr-placeholder">
                    <Icon name="imgQrCode" screen="4-24" />
                    <span>Upload your static GCash QR in Settings.</span>
                  </div>
                )}
                <strong>{state.settings.gcashName}</strong>
                <span>{state.settings.gcashNumber}</span>
                <b>{money(total)}</b>
              </div>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={verified}
                  onChange={(e) => setVerified(e.target.checked)}
                />
                I have manually verified the GCash payment.
              </label>
              <p className="helper">
                Confirm the payment in your GCash account before completing the
                sale.
              </p>
            </>
          )}
          {error && <p className="error">{error}</p>}
          <Button
            primary
            className="w-full mt-6"
            disabled={
              payment === "Cash"
                ? received === "" || Number(received) < total
                : !verified
            }
            onClick={complete}
          >
            Complete Sale
          </Button>
        </Card>
      </main>
    );
  return (
    <div className="pos-layout">
      <aside className="pos-categories">
        {categories.map((c) => (
          <button
            key={c}
            className={c === category ? "active" : ""}
            onClick={() => setCategory(c)}
          >
            <span>{c}</span>
          </button>
        ))}
      </aside>
      <main className="product-browser">
        <SearchField value={search} onChange={setSearch} />
        <div className="products-grid">
          {options.map((p) => (
            <button
              className={`product-card ${p.availableStock < p.multiplier ? "out" : ""}`}
              key={p.key}
              onClick={() => add(p)}
            >
              <div className="product-art">
                {p.image ? (
                  <img
                    src={p.image}
                    alt={p.name}
                    className="pos-product-image"
                  />
                ) : (
                  <Icon screen="4-17" name={p.icon} />
                )}
              </div>
              <strong>
                {p.name} {p.multiplier}
                {p.unit}
              </strong>
              <small>
                {p.multiplier} {p.unit}
                {p.pool === "wholesale" ? " · wholesale" : ""}
              </small>
              <b>{money(p.salePrice)}</b>
              <small
                className={
                  p.availableStock < p.multiplier ? "text-red-500" : ""
                }
              >
                {p.availableStock < p.multiplier
                  ? "Out of stock · tap"
                  : `Stock: ${p.pool === "retail" ? p.stock : Math.floor(p.wholesale / p.multiplier)}`}
              </small>
            </button>
          ))}
        </div>
        {!options.length && <Empty>No products match your search.</Empty>}
      </main>
      <aside className="cart-panel">
        <div className="flex justify-between items-start pb-5 border-b border-line">
          <div>
            <h2>New Order</h2>
            <small className="text-muted">{cart.length} items</small>
          </div>
          <button
            aria-label="Clear cart"
            className="icon-button text-red-500 border border-line"
            disabled={!cart.length}
            onClick={() => setModal({ type: "clear" })}
          >
            <Icon screen="4-17" name="imgTrash2" />
          </button>
        </div>
        <div className="cart-items">
          {!cart.length ? (
            <p className="helper mt-4">Tap a product to add it to the order.</p>
          ) : (
            cart.map((i) => (
              <div className="cart-item" key={i.key}>
                <div className="flex justify-between gap-2">
                  <strong>{i.name}</strong>
                  <b>{money(i.qty * i.price)}</b>
                </div>
                <small>
                  {money(i.price)} / {i.unit}
                </small>
                <div className="flex justify-between items-center mt-3">
                  <div className="quantity-control">
                    <button
                      aria-label={`Decrease ${i.name}`}
                      onClick={() => change(i, i.qty - 1)}
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      aria-label={`Quantity for ${i.name}`}
                      type="number"
                      min="0"
                      step={
                        i.pool === "wholesale" || i.baseUnit === "pc"
                          ? "1"
                          : "0.25"
                      }
                      value={i.qty}
                      onChange={(e) => {
                        const q = Number(e.target.value);
                        if (
                          (i.pool === "wholesale" || i.baseUnit === "pc") &&
                          !Number.isInteger(q)
                        )
                          return;
                        change(i, q);
                      }}
                    />
                    <button
                      aria-label={`Increase ${i.name}`}
                      onClick={() => change(i, i.qty + 1)}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <button
                    className="icon-button text-red-500"
                    aria-label={`Remove ${i.name}`}
                    onClick={() => change(i, 0)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="cart-footer">
          <div className="flex justify-between mb-6">
            <span className="text-muted">Subtotal</span>
            <b className="text-xl">{money(total)}</b>
          </div>
          <Button
            primary
            className="w-full"
            disabled={!cart.length}
            onClick={() => {
              setCheckout(true);
              setError("");
            }}
          >
            <Icon screen="4-17" name="imgBanknote" />
            Pay
          </Button>
        </div>
      </aside>
      {modal && (
        <Modal
          title={
            modal.type === "clear"
              ? "Clear Cart"
              : "Wholesale to Retail Transfer"
          }
          onClose={() => setModal(null)}
        >
          {modal.type === "clear" ? (
            <>
              <p>Remove all items from the current order?</p>
              <div className="modal-actions">
                <Button onClick={() => setModal(null)}>Cancel</Button>
                <Button
                  danger
                  onClick={() => {
                    setCart([]);
                    setModal(null);
                  }}
                >
                  Clear Cart
                </Button>
              </div>
            </>
          ) : (
            <form onSubmit={transfer}>
              <p className="stock-transfer-warning">
                {modal.product.name} has insufficient retail stock. Owner
                approval is required to transfer wholesale stock.
              </p>
              <p className="mb-4">
                <b>
                  Wholesale available:{" "}
                  {
                    state.products.find((p) => p.id === modal.product.id)
                      .wholesale
                  }{" "}
                  {modal.product.unit}
                </b>
              </p>
              <Field
                label={`Quantity to transfer (${modal.product.unit})`}
                type="number"
                min="0.01"
                step="0.01"
                required
                value={transferQty}
                onChange={(e) => setTransferQty(Number(e.target.value))}
              />
              <Field
                label="Owner's 4-digit PIN"
                type="password"
                inputMode="numeric"
                maxLength={4}
                required
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              />
              {error && <p className="error">{error}</p>}
              <div className="modal-actions">
                <Button type="button" onClick={() => setModal(null)}>
                  Cancel
                </Button>
                <Button warning disabled={pin.length !== 4}>
                  Approve Transfer
                </Button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
