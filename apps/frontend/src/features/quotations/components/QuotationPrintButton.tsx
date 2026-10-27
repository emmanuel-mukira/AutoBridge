import { createRoot } from "react-dom/client";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Quotation } from "../services/quotationsApi";

const money = (value: string) =>
  `KES ${Number(value).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function QuotationPrintView({ quotation }: { quotation: Quotation }) {
  return (
    <main>
      <header>
        <h1>AutoBridge</h1>
        <p>B2B Automotive Parts and Accessories</p>
        <strong>Quotation</strong>
      </header>
      <section className="summary">
        <div>
          <span>Quotation</span>
          <b>
            {quotation.quoteNumber} · Version {quotation.version} ·{" "}
            {quotation.status}
          </b>
        </div>
        <div>
          <span>Issue / validity</span>
          <b>
            {quotation.issueDate
              ? new Date(quotation.issueDate).toLocaleDateString("en-KE")
              : "Not issued"}{" "}
            — {new Date(quotation.validUntil).toLocaleDateString("en-KE")}
          </b>
        </div>
        <div>
          <span>Prepared for</span>
          <b>{quotation.clientNameSnapshot}</b>
          <p>{quotation.clientAddressSnapshot}</p>
          {quotation.contactNameSnapshot && (
            <p>Attention: {quotation.contactNameSnapshot}</p>
          )}
        </div>
        <div>
          <span>Opportunity</span>
          <b>{quotation.opportunity.title}</b>
          <p>
            Prepared by {quotation.createdBy.firstName}{" "}
            {quotation.createdBy.lastName}
          </p>
        </div>
      </section>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Unit price</th>
            <th>Line total</th>
          </tr>
        </thead>
        <tbody>
          {quotation.items.map((item) => (
            <tr key={item.id}>
              <td>
                <b>
                  {item.skuSnapshot} · {item.productNameSnapshot}
                </b>
                <small>{item.unitSnapshot}</small>
              </td>
              <td>{item.quantity}</td>
              <td>{money(item.unitPrice)}</td>
              <td>{money(item.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <section className="totals">
        <p>
          <span>Subtotal</span>
          <b>{money(quotation.subtotal)}</b>
        </p>
        <p>
          <span>Discount ({quotation.discountPercent}%)</span>
          <b>− {money(quotation.discountAmount)}</b>
        </p>
        <p className="grand">
          <span>Total</span>
          <b>{money(quotation.totalAmount)}</b>
        </p>
      </section>
      {(quotation.notes || quotation.terms) && (
        <section className="notes">
          {quotation.notes && (
            <div>
              <span>Notes</span>
              <p>{quotation.notes}</p>
            </div>
          )}
          {quotation.terms && (
            <div>
              <span>Commercial terms</span>
              <p>{quotation.terms}</p>
            </div>
          )}
        </section>
      )}
      <footer>
        AutoBridge quotation · Prices and availability are subject to the
        commercial terms above.
      </footer>
    </main>
  );
}

const printStyles = `
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #172033; font: 12px/1.45 Arial, sans-serif; }
  main { max-width: 190mm; margin: 0 auto; }
  header { border-bottom: 2px solid #1d4ed8; padding-bottom: 12px; margin-bottom: 20px; }
  h1 { color: #1d4ed8; font-size: 24px; margin: 0 0 4px; }
  header p { color: #536079; margin: 0 0 3px; }
  .summary { display: grid; grid-template-columns: 1fr 1fr; gap: 18px 30px; margin-bottom: 22px; }
  .summary span, .notes span { color: #6b7280; display: block; font-size: 10px; text-transform: uppercase; }
  .summary b { display: block; font-size: 13px; margin-top: 3px; }
  .summary p, .notes p { margin: 2px 0 0; }
  table { border-collapse: collapse; width: 100%; break-inside: auto; }
  thead { display: table-header-group; }
  th { background: #e8eefb; text-align: left; }
  th, td { border-bottom: 1px solid #dfe3ea; padding: 8px; vertical-align: top; }
  th:nth-child(n+2), td:nth-child(n+2) { text-align: right; }
  td small { color: #6b7280; display: block; margin-top: 2px; }
  tr { break-inside: avoid; }
  .totals { margin: 14px 0 0 auto; width: 45%; }
  .totals p { display: flex; justify-content: space-between; margin: 0; padding: 4px 0; }
  .totals .grand { border-top: 1px solid #172033; font-size: 14px; margin-top: 4px; padding-top: 8px; }
  .notes { background: #f5f7fb; display: grid; gap: 10px; margin-top: 18px; padding: 12px; }
  footer { bottom: 0; color: #6b7280; font-size: 10px; margin-top: 28px; text-align: center; }
  @media screen { body { padding: 24px; } }
`;

export function QuotationPrintButton({ quotation }: { quotation: Quotation }) {
  const print = () => {
    const printWindow = window.open("", "_blank", "popup");
    if (!printWindow) {
      toast.error("Allow pop-ups to print or save this quotation as PDF");
      return;
    }
    printWindow.opener = null;
    printWindow.document.title = quotation.quoteNumber;
    const style = printWindow.document.createElement("style");
    style.textContent = printStyles;
    printWindow.document.head.append(style);
    const root = createRoot(printWindow.document.body);
    root.render(<QuotationPrintView quotation={quotation} />);
    printWindow.addEventListener(
      "afterprint",
      () => {
        root.unmount();
        printWindow.close();
      },
      { once: true },
    );
    printWindow.requestAnimationFrame(() =>
      printWindow.requestAnimationFrame(() => {
        printWindow.focus();
        printWindow.print();
      }),
    );
  };

  return (
    <Button type="button" size="sm" variant="outline" onClick={print}>
      <Printer className="mr-2 h-4 w-4" />
      Print / Save PDF
    </Button>
  );
}
