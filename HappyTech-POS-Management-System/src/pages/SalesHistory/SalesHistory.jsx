import { useState } from "react";
import { Printer, Download, RotateCcw } from "lucide-react";
import {
  Card,
  Button,
  SearchField,
  Select,
  Modal,
  Field,
  Badge,
  Empty,
} from "../../components/UI";
import { money, dateTime, within } from "../../data/mock";
import Receipt, { exportPDF } from "../../components/Receipt";
export default function SalesHistory({ state, update, user, notify }) {
  const [search, setSearch] = useState(""),
    [payment, setPayment] = useState("All Payments"),
    [period, setPeriod] = useState("All Dates"),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [selected, setSelected] = useState(null),
    [refund, setRefund] = useState(false),
    [pin, setPin] = useState(""),
    [error, setError] = useState("");
  const sales = state.sales.filter(
    (s) =>
      (s.id + " " + s.cashier).toLowerCase().includes(search.toLowerCase()) &&
      (payment === "All Payments" || s.payment === payment) &&
      within(s.date, period, start, end),
  );
  const current =
    state.sales.find((s) => s.uuid === selected?.uuid) || selected;
  const lines = () => [
    state.settings.storeName,
    `Period: ${period}`,
    `Transactions: ${sales.length}`,
    ...sales.map(
      (s) =>
        `${s.id} | ${dateTime(s.date)} | ${s.cashier} | ${s.payment} | ${money(s.total)} | ${s.status}`,
    ),
    `Net sales: ${money(sales.filter((s) => s.status !== "Refunded").reduce((n, s) => n + s.total, 0))}`,
  ];
  const doRefund = (e) => {
    e.preventDefault();
    const valid = state.users.some(
      (u) =>
        u.active &&
        u.pin === pin &&
        (user.role === "Cashier" ? u.id === user.id : u.role !== "Cashier"),
    );
    if (!valid) {
      setError("Incorrect PIN. Demo PIN: 1234.");
      return;
    }
    if (current.status === "Refunded") return;
    update(
      (s) => ({
        ...s,
        sales: s.sales.map((t) =>
          t.uuid === current.uuid ? { ...t, status: "Refunded" } : t,
        ),
        products: s.products.map((p) => ({
          ...p,
          stock:
            p.stock +
            current.items
              .filter((i) => i.productId === p.id)
              .reduce((n, i) => n + i.qty * i.multiplier, 0),
        })),
      }),
      `Refunded ${current.id}`,
    );
    setRefund(false);
    setPin("");
    notify("Refund completed · retail stock restored");
  };
  return (
    <main className="main sales-history">
      <div className="flex justify-end gap-3 mb-5 no-print">
        <Button onClick={() => window.print()}>
          <Printer size={17} />
          Print Summary
        </Button>
        <Button onClick={() => exportPDF("Sales Summary", lines())}>
          <Download size={17} />
          Export PDF
        </Button>
      </div>
      <Card className="overflow-hidden print-area">
        <div className="table-controls no-print">
          <SearchField
            placeholder="Search invoice or cashier..."
            value={search}
            onChange={setSearch}
          />
          <Select
            label="Payment method"
            value={payment}
            onChange={setPayment}
            options={["All Payments", "Cash", "GCash"]}
          />
          <Select
            label="Sales date range"
            value={period}
            onChange={setPeriod}
            options={[
              "All Dates",
              "Today",
              "This Week",
              "This Month",
              "Custom",
            ]}
          />
        </div>
        {period === "Custom" && (
          <div className="flex flex-wrap gap-4 px-5 pb-4 no-print">
            <Field
              label="From"
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
            <Field
              label="To"
              type="date"
              min={start}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
        )}
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {[
                  "Invoice No.",
                  "Date & Time",
                  "Cashier",
                  "Items",
                  "Payment",
                  "Total",
                  "Status",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.uuid}>
                  <td>
                    <button
                      className="text-green-700 font-semibold text-left min-h-12"
                      onClick={() => {
                        setSelected(s);
                        setRefund(false);
                      }}
                    >
                      {s.id}
                    </button>
                  </td>
                  <td>{dateTime(s.date)}</td>
                  <td>{s.cashier}</td>
                  <td>{s.items.length}</td>
                  <td>{s.payment}</td>
                  <td className="font-semibold">{money(s.total)}</td>
                  <td>
                    <Badge>{s.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!sales.length && <Empty>No transactions match these filters.</Empty>}
        </div>
        <footer className="table-footer">
          Tap an invoice to view its details · {sales.length} records · Demo
          local data
        </footer>
      </Card>
      {current && (
        <Modal
          title={refund ? "Refund Transaction" : "Transaction Details"}
          drawer
          onClose={() => setSelected(null)}
        >
          {refund ? (
            <form onSubmit={doRefund}>
              <p className="mb-5">
                Refund {current.id} for <b>{money(current.total)}</b>? The full
                order will be returned to retail stock.
              </p>
              <Field
                label="Confirm with your 4-digit PIN"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              />
              {error && <p className="error">{error}</p>}
              <div className="modal-actions">
                <Button type="button" onClick={() => setRefund(false)}>
                  Cancel
                </Button>
                <Button danger disabled={pin.length !== 4}>
                  Confirm Refund
                </Button>
              </div>
            </form>
          ) : (
            <>
              <Receipt sale={current} settings={state.settings} />
              <Button
                danger
                className="w-full mt-4"
                disabled={current.status === "Refunded"}
                onClick={() => {
                  setRefund(true);
                  setPin("");
                  setError("");
                }}
              >
                <RotateCcw size={17} />
                {current.status === "Refunded"
                  ? "Already Refunded"
                  : "Refund Transaction"}
              </Button>
            </>
          )}
        </Modal>
      )}
    </main>
  );
}
