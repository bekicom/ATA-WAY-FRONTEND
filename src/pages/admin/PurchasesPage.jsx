import { useState } from "react";
import { PageHeader } from "../../components/page_header/PageHeader";
import { PageLoader } from "../../components/loading/PageLoader";
import { PurchasesTable } from "../../components/table/PurchasesTable";
import { useGetSuppliersQuery } from "../../context/service/master.service";
import { useGetPurchasesQuery } from "../../context/service/purchase.service";
import { formatDateTime, formatMoneyWithCurrency, getSupplierName } from "../../utils/format";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function downloadPurchasesExcel(purchases) {
  if (!purchases.length) return;

  const totals = purchases.reduce(
    (acc, item) => ({
      quantity: acc.quantity + Number(item.quantity || 0),
      totalCost: acc.totalCost + Number(item.totalCost || 0),
      paidAmount: acc.paidAmount + Number(item.paidAmount || 0),
      debtAmount: acc.debtAmount + Number(item.debtAmount || 0),
    }),
    { quantity: 0, totalCost: 0, paidAmount: 0, debtAmount: 0 },
  );

  const rows = purchases
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.invoiceNumber || "-")}</td>
          <td>${escapeHtml(item.productName || "-")}</td>
          <td>${escapeHtml(item.productModel || "-")}</td>
          <td>${escapeHtml(getSupplierName(item))}</td>
          <td>${escapeHtml(item.entryType || "-")}</td>
          <td>${escapeHtml(item.quantity || 0)}</td>
          <td>${escapeHtml(formatMoneyWithCurrency(item.totalCost))}</td>
          <td>${escapeHtml(formatMoneyWithCurrency(item.paidAmount))}</td>
          <td>${escapeHtml(formatMoneyWithCurrency(item.debtAmount))}</td>
          <td>${escapeHtml(formatDateTime(item.purchasedAt))}</td>
        </tr>
      `,
    )
    .join("");

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #999; padding: 8px 10px; text-align: left; }
          th { background: #3f5f99; color: #fff; }
          .summary td { font-weight: 700; background: #eef3ff; }
        </style>
      </head>
      <body>
        <h2>Kirim tarixi</h2>
        <p>Hujjatlar: ${escapeHtml(purchases.length)}</p>
        <table>
          <thead>
            <tr>
              <th>Hujjat</th>
              <th>Mahsulot</th>
              <th>Kod/Model</th>
              <th>Supplier</th>
              <th>Turi</th>
              <th>Miqdori</th>
              <th>Jami</th>
              <th>To'langan</th>
              <th>Qarz</th>
              <th>Sana</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            <tr class="summary">
              <td colspan="5">Jami</td>
              <td>${escapeHtml(totals.quantity)}</td>
              <td>${escapeHtml(formatMoneyWithCurrency(totals.totalCost))}</td>
              <td>${escapeHtml(formatMoneyWithCurrency(totals.paidAmount))}</td>
              <td>${escapeHtml(formatMoneyWithCurrency(totals.debtAmount))}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `kirim_tarixi_${stamp}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function PurchasesPage() {
  const [filter, setFilter] = useState({
    supplierId: "",
    entryType: "",
    q: "",
    dateFrom: "",
    dateTo: "",
  });

  const { data: suppliersRes } = useGetSuppliersQuery();
  const { data, isLoading } = useGetPurchasesQuery(filter);
  const purchases = data?.purchases || [];

  if (isLoading) return <PageLoader />;

  return (
    <div className="page-stack">
      <PageHeader
        title="Kirim tarixi"
        subtitle="Barcha prihod hujjatlari va supplier kirimlari"
        actions={
          <button
            type="button"
            className="success-btn"
            onClick={() => downloadPurchasesExcel(purchases)}
            disabled={!purchases.length}
          >
            Excel yuklab olish
          </button>
        }
      />
      <section className="filters-row wrap">
        <input className="search-input" placeholder="Qidirish..." value={filter.q} onChange={(event) => setFilter((prev) => ({ ...prev, q: event.target.value }))} />
        <select className="search-input narrow" value={filter.supplierId} onChange={(event) => setFilter((prev) => ({ ...prev, supplierId: event.target.value }))}>
          <option value="">Barcha supplierlar</option>
          {(suppliersRes?.suppliers || []).map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
        </select>
        <select className="search-input narrow" value={filter.entryType} onChange={(event) => setFilter((prev) => ({ ...prev, entryType: event.target.value }))}>
          <option value="">Barcha turlar</option>
          <option value="initial">initial</option>
          <option value="restock">restock</option>
          <option value="opening_balance">opening_balance</option>
          <option value="stock_out">stock_out</option>
        </select>
        <input className="search-input narrow" type="date" value={filter.dateFrom} onChange={(event) => setFilter((prev) => ({ ...prev, dateFrom: event.target.value }))} />
        <input className="search-input narrow" type="date" value={filter.dateTo} onChange={(event) => setFilter((prev) => ({ ...prev, dateTo: event.target.value }))} />
      </section>
      <PurchasesTable purchases={purchases} />
    </div>
  );
}
