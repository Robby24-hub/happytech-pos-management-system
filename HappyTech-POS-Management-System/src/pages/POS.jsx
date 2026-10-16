import { useState } from "react";
import {
  Trash2,
  Minus,
  Plus,
  ArrowLeft,
  Banknote,
  CheckCircle,
} from "lucide-react";
import {
  Button,
  Card,
  Icon,
  SearchField,
  Modal,
  Field,
  Empty,
} from "../components/UI";
import { money } from "../data/mock";
import { accountAction, listRecoveryAdmins } from "../lib/supabase";
import Receipt from "../components/Receipt";
export default function POS({ state, update, user, notify, navigate }) {
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState("All Products"),
    [cart, setCart] = useState([]),
    [modal, setModal] = useState(null),
    [checkout, setCheckout] = useState(false),
    [payment, setPayment] = useState("Cash"),
    [received, setReceived] = useState(""),
    [verified, setVerified] = useState(false),
    [pin, setPin] = useState(""),
    [availableAdmins, setAvailableAdmins] = useState([]),
    [approvedAdminId, setApprovedAdminId] = useState(""),
    [verifyingTransfer, setVerifyingTransfer] = useState(false),
    [error, setError] = useState(""),
    [transferQty, setTransferQty] = useState(1),
    [receipt, setReceipt] = useState(null);
  const options = state.products
    .filter((p) => p.available)
    .flatMap((p) => [
      ...(p.id === "sinandomeng"
        ? []
        : [{ ...p, key: p.id + "-kg", saleUnit: "kg", multiplier: 1 }]),
      ...(["jasmine", "denorado", "sinandomeng"].includes(p.id)
        ? [
            {
              ...p,
              key: p.id + "-sack",
              saleUnit: "sack",
              multiplier: p.id === "jasmine" ? 25 : 50,
            },
          ]
        : []),
    ])
    .filter(
      (p) =>
        (category === "All Products" ||
          (category === "Rice (By Kilo)" && p.saleUnit === "kg") ||
          (category === "Rice (By Sack)" && p.saleUnit === "sack")) &&
        p.name.toLowerCase().includes(search.toLowerCase()),
    );
  options.sort((a, b) => (a.saleUnit === "sack") - (b.saleUnit === "sack"));
  const total =
    Math.round(cart.reduce((s, i) => s + i.qty * i.price, 0) * 100) / 100;
  const used = (id) =>
    cart
      .filter((i) => i.productId === id)
      .reduce((n, i) => n + i.qty * i.multiplier, 0);
  const add = (p) => {
    const product = state.products.find((x) => x.id === p.id);
    if (product.stock - used(p.id) < p.multiplier) {
      setModal({ type: "transfer", product: p });
      listRecoveryAdmins().then(list => {setAvailableAdmins(list);setApprovedAdminId(list[0]?.id || "");}).catch(()=>setError("Unable to load Admin accounts. Try again later."));
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
              multiplier: p.multiplier,
              price: p.price * p.multiplier,
              qty: 1,
            },
          ];
    });
  };
  const change = (item, qty) => {
    if (!Number.isFinite(qty) || qty < 0) return;
    const p = state.products.find((p) => p.id === item.productId);
    const other = used(p.id) - item.qty * item.multiplier;
    if (qty * item.multiplier + other > p.stock) {
      notify("Quantity exceeds available retail stock.");
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
  const transfer = async (e) => {
    e.preventDefault();
    const p = state.products.find((p) => p.id === modal.product.id);
    if (!approvedAdminId || !/^\d{4}$/.test(pin)) {setError("Select an Admin and enter their PIN.");return;}
    if (!p) {setError("Product not found.");return;}
    if (transferQty <= 0 || transferQty > p.wholesale) {setError("Enter a valid wholesale stock quantity.");return;}
    setVerifyingTransfer(true);
    try {await accountAction({action:"verify-admin-approval",adminId:approvedAdminId,managerPin:pin});}
    catch {setError("Admin verification failed. Check the PIN or account status.");setPin("");setVerifyingTransfer(false);return;}
    setVerifyingTransfer(false);setPin("");
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
      `Transferred ${transferQty} kg of ${p.name} to retail`,
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
        used(i.productId) >
        state.products.find((p) => p.id === i.productId).stock,
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
      sync: "Demo local",
    };
    update(
      (s) => ({
        ...s,
        sales: [sale, ...s.sales],
        products: s.products.map((p) => ({
          ...p,
          stock: Math.round((p.stock - used(p.id)) * 100) / 100,
        })),
      }),
      `Completed ${sale.id} for ${money(total)}`,
    );
    setCart([]);
    setCheckout(false);
    setReceipt(sale);
    setReceived("");
    setVerified(false);
    notify("Sale complete · saved locally as demo data");
  };
  if (receipt)
    return (
      <main className="main max-w-2xl mx-auto">
        <Button className="mb-4" onClick={() => setReceipt(null)}>
          <ArrowLeft size={17} />
          New Sale
        </Button>
        <Card className="p-6">
          <div className="flex items-center gap-2 text-green-700 mb-4">
            <CheckCircle />
            Sale Complete
          </div>
          <Receipt sale={receipt} settings={state.settings} />
        </Card>
      </main>
    );
  if (checkout)
    return (
      <main className="main checkout-layout">
        <Card className="p-6">
          <Button onClick={() => setCheckout(false)}>
            <ArrowLeft size={17} />
            Back to cart
          </Button>
          <h2 className="mt-6 mb-4">Order Summary</h2>
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
          <div className="flex justify-between text-2xl font-bold mt-6">
            <span>Total</span>
            {money(total)}
          </div>
        </Card>
        <Card className="p-6">
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
                No GCash API or payment verification service is connected.
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
        {[
          ["All Products", "imgBoxes"],
          ["Rice (By Kilo)", "imgPackage1"],
          ["Rice (By Sack)", "imgPackagePlus"],
        ].map(([c, icon]) => (
          <button
            key={c}
            className={c === category ? "active" : ""}
            onClick={() => setCategory(c)}
          >
            <Icon screen="4-17" name={icon} />
            <span>{c}</span>
          </button>
        ))}
        <button className="mt-auto" onClick={() => navigate("sales-history")}>
          Sales History
        </button>
      </aside>
      <main className="product-browser">
        <SearchField value={search} onChange={setSearch} />
        <div className="products-grid">
          {options.map((p) => (
            <button
              className={`product-card ${p.stock < p.multiplier ? "out" : ""}`}
              key={p.key}
              onClick={() => add(p)}
            >
              <div className="product-art">
                <Icon screen="4-17" name={p.icon} />
              </div>
              <strong>
                {p.name} {p.saleUnit === "sack" ? `${p.multiplier}kg` : "1kg"}
              </strong>
              <small>{p.multiplier}kg</small>
              <b>{money(p.price * p.multiplier)}</b>
              <small className={p.stock < p.multiplier ? "text-red-500" : ""}>
                {p.stock < p.multiplier
                  ? "Out of stock · tap"
                  : `Stock: ${p.saleUnit === "kg" ? p.stock : Math.floor(p.stock / p.multiplier)}`}
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
                      step={i.unit === "kg" ? "0.25" : "1"}
                      value={i.qty}
                      onChange={(e) => {
                        const q = Number(e.target.value);
                        if (i.unit === "sack" && !Number.isInteger(q)) return;
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
              <p className="mb-4">
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
                  kg
                </b>
              </p>
              <Field
                label="Quantity to transfer (kg)"
                type="number"
                min="0.01"
                step="0.01"
                required
                value={transferQty}
                onChange={(e) => setTransferQty(Number(e.target.value))}
              />
              <Field label="Approving Admin"><select value={approvedAdminId} onChange={e=>setApprovedAdminId(e.target.value)} required><option value="">Choose an Admin</option>{availableAdmins.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
              <Field
                label="Admin's 4-digit PIN"
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
                <Button primary disabled={pin.length !== 4 || !approvedAdminId || verifyingTransfer}>
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
