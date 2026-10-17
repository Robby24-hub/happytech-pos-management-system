import "./Reports.css";
import { useState } from "react";
import { Download, Printer, CalendarDays } from "lucide-react";
import { Card, Stat, Button, Field, Empty } from "../../components/UI";
import Chart from "../../components/Chart";
import { money, within } from "../../data/mock";
import { exportPDF } from "../../components/Receipt";
export default function Reports({ state }) {
  const [period, setPeriod] = useState("Today"),
    [start, setStart] = useState(new Date().toISOString().slice(0, 10)),
    [end, setEnd] = useState(new Date().toISOString().slice(0, 10));
  const filtered = state.sales.filter((s) =>
    within(s.date, period, start, end),
  );
  const completed = filtered.filter((s) => s.status !== "Refunded");
  const gross = filtered.reduce((n, s) => n + s.total, 0),
    refunds = filtered
      .filter((s) => s.status === "Refunded")
      .reduce((n, s) => n + s.total, 0),
    net = gross - refunds,
    cash = completed
      .filter((s) => s.payment === "Cash")
      .reduce((n, s) => n + s.total, 0),
    gcash = net - cash,
    distinct = new Set(
      completed.flatMap((s) => s.items.map((i) => i.productId)),
    ).size;
  const labels =
    period === "Today"
      ? Array.from({ length: 12 }, (_, i) => `${i + 8}:00`)
      : period === "This Week"
        ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        : Array.from({ length: 4 }, (_, i) => `Week ${i + 1}`);
  const values = labels.map((_, i) =>
    completed
      .filter((s) => {
        const d = new Date(s.date);
        return period === "Today"
          ? d.getHours() === i + 8
          : period === "This Week"
            ? (d.getDay() + 6) % 7 === i
            : Math.floor((d.getDate() - 1) / 8) === i;
      })
      .reduce((n, s) => n + s.total, 0),
  );
  const max = Math.max(2000, Math.ceil(Math.max(...values) / 1000) * 1000);
  const sold = {};
  completed.forEach((s) =>
    s.items.forEach((i) => {
      sold[i.productId] ??= { name: i.name, qty: 0, total: 0 };
      sold[i.productId].qty += i.qty * i.multiplier;
      sold[i.productId].total += i.qty * i.price;
    }),
  );
  const ranking = Object.values(sold).sort((a, b) => b.total - a.total);
  const lines = [
    state.settings.storeName,
    `Period: ${period} ${period === "Custom" ? start + " to " + end : ""}`,
    `Gross sales: ${money(gross)}`,
    `Refunds: ${money(refunds)}`,
    `Net sales: ${money(net)}`,
    `Transactions: ${completed.length}`,
    `Distinct products sold: ${distinct}`,
    `Average sale: ${money(completed.length ? net / completed.length : 0)}`,
    `Cash: ${money(cash)}`,
    `GCash: ${money(gcash)}`,
    ...ranking.map((p) => `${p.name} | ${p.qty} kg | ${money(p.total)}`),
  ];
  return (
    <main className="main reports print-area">
      <div className="flex justify-between items-start gap-4 mb-5">
        <div>
          <p className="eyebrow">BUSINESS OVERVIEW</p>
          <h2 className="text-2xl">Sales analytics</h2>
          <p className="helper mt-1">
            {period} · {new Date().toLocaleDateString("en-PH")}
          </p>
        </div>
        <div className="flex gap-3 no-print">
          <Button onClick={() => exportPDF("Sales Analytics", lines)}>
            <Download size={17} />
            Export PDF
          </Button>
          <Button primary onClick={() => window.print()}>
            <Printer size={17} />
            Print Report
          </Button>
        </div>
      </div>
      <Card className="period-controls no-print">
        {["Today", "This Week", "This Month", "Custom"].map((p) => (
          <Button key={p} primary={p === period} onClick={() => setPeriod(p)}>
            <CalendarDays size={16} />
            {p}
          </Button>
        ))}
        {period === "Custom" && (
          <>
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
          </>
        )}
      </Card>
      <div className="stats-grid my-4">
        <Stat
          label="Net sales"
          value={money(net)}
          caption="Gross sales less refunds"
          icon="imgBanknote"
          screen="4-35"
        />
        <Stat
          label="Transactions"
          value={completed.length}
          caption="Completed sales"
          icon="imgReceiptText"
          screen="4-35"
        />
        <Stat
          label="Product Sold"
          value={distinct}
          caption="Distinct products sold"
          icon="imgBoxes"
          screen="4-35"
        />
        <Stat
          label="Average sale"
          value={money(completed.length ? net / completed.length : 0)}
          caption="Net sales ÷ transactions"
          icon="imgBarChart4"
          screen="4-35"
        />
      </div>
      <div className="reports-grid">
        <Card className="p-5">
          <h2>Sales overview</h2>
          <p className="helper mt-3 mb-3">
            {period === "Today" ? "Hourly" : "Period"} net sales
          </p>
          <Chart labels={labels} values={values} max={max} />
          <div className="sales-breakdown">
            {[
              ["Gross sales", gross],
              ["Refunds", refunds],
              ["Net sales", net],
            ].map(([label, n]) => (
              <div key={label}>
                <small>{label}</small>
                <b>{money(n)}</b>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5 payment-methods">
          <h2>Payment methods</h2>
          <p className="helper mt-3">Share of net sales · after refunds</p>
          <p className="helper mt-5">Total collected</p>
          <strong className="text-3xl block mt-3 mb-4">{money(net)}</strong>
          <div className="payment-track">
            <span style={{ width: `${net ? (cash / net) * 100 : 0}%` }} />
          </div>
          {[
            ["Cash", cash],
            ["GCash", gcash],
          ].map(([label, n]) => (
            <div className="payment-row" key={label}>
              <div className="flex justify-between">
                <strong>{label}</strong>
                <b>{money(n)}</b>
              </div>
              <p className="helper mt-2">
                {net ? ((n / net) * 100).toFixed(1) : "0.0"}% of net sales
              </p>
            </div>
          ))}
          <small className="helper">
            Cash and GCash receipts are recorded manually.
          </small>
        </Card>
      </div>
      <Card className="mt-5 overflow-hidden">
        <div className="p-5">
          <h2>Product performance</h2>
          <p className="helper mt-1">
            Best-selling products in the selected period.
          </p>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity sold</th>
                <th>Sales</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((p) => (
                <tr key={p.name}>
                  <td>{p.name}</td>
                  <td>{p.qty} kg</td>
                  <td>{money(p.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!ranking.length && <Empty>No completed sales in this period.</Empty>}
        </div>
      </Card>
    </main>
  );
}
