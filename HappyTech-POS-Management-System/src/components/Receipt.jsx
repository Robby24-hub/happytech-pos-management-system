import { money, dateTime } from "../data/mock";
import { Button } from "./UI";
import { Printer, Download } from "lucide-react";
export async function exportPDF(title, lines) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF();
  let y = 20;
  pdf.setFontSize(16);
  pdf.text(title, 15, y);
  y += 14;
  pdf.setFontSize(10);
  lines.forEach((line) => {
    const wrap = pdf.splitTextToSize(String(line).replaceAll("₱", "PHP "), 180);
    if (y + wrap.length * 6 > 280) {
      pdf.addPage();
      y = 20;
    }
    pdf.text(wrap, 15, y);
    y += wrap.length * 6 + 3;
  });
  pdf.save(`${title.toLowerCase().replaceAll(" ", "-")}.pdf`);
}
export function receiptLines(sale, settings) {
  return [
    settings.storeName,
    settings.address,
    settings.contact,
    sale.id,
    dateTime(sale.date),
    `Cashier: ${sale.cashier}`,
    ...sale.items.map(
      (i) =>
        `${i.name} | ${i.qty} ${i.unit} x ${money(i.price)} = ${money(i.qty * i.price)}`,
    ),
    `Total: ${money(sale.total)}`,
    `Payment: ${sale.payment}`,
    `Received: ${money(sale.received)}`,
    `Change: ${money(Math.max(0, sale.received - sale.total))}`,
    `Status: ${sale.status}`,
    settings.receiptFooter,
    "Frontend demonstration - local record only",
  ];
}
export default function Receipt({ sale, settings }) {
  return (
    <>
      <div className="receipt print-area">
        <h2>{settings.storeName}</h2>
        <p>
          {settings.address}
          <br />
          {settings.contact}
        </p>
        <hr />
        <strong>{sale.id}</strong>
        <p>
          {dateTime(sale.date)}
          <br />
          Cashier: {sale.cashier}
        </p>
        <hr />
        {sale.items.map((i, index) => (
          <div key={index} className="receipt-item">
            <span>
              {i.name}
              <small>
                {i.qty} {i.unit} × {money(i.price)}
              </small>
            </span>
            <b>{money(i.qty * i.price)}</b>
          </div>
        ))}
        <hr />
        <div className="flex justify-between text-lg font-bold">
          <span>TOTAL</span>
          {money(sale.total)}
        </div>
        <p>
          {sale.payment} · {sale.status}
        </p>
        <div className="flex justify-between">
          <span>Received</span>
          {money(sale.received)}
        </div>
        <div className="flex justify-between">
          <span>Change</span>
          {money(Math.max(0, sale.received - sale.total))}
        </div>
        <hr />
        <p>{settings.receiptFooter}</p>
        <small>DEMO · Local mock transaction</small>
      </div>
      <div className="flex gap-3 mt-5 no-print">
        <Button onClick={() => window.print()}>
          <Printer size={17} />
          Print Receipt
        </Button>
        <Button
          onClick={() => exportPDF(sale.id, receiptLines(sale, settings))}
        >
          <Download size={17} />
          PDF
        </Button>
      </div>
    </>
  );
}
