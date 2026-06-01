import {
  APP_NAME,
  COMPANY_ADDRESS,
  COMPANY_PHONES,
} from "@/lib/brand";
import {
  formatInvoiceAmount,
  formatInvoiceDateTime,
  terbilangLower,
} from "@/lib/format";
import {
  type SalesInvoiceDetail,
  salesLineProductName,
  salesLineUnitPrice,
} from "@/types/sales";

type Props = {
  data: SalesInvoiceDetail;
};

export function FakturPenjualanPrintLayout({ data }: Props) {
  const totalQty = data.lines.reduce((s, l) => s + Number(l.qty), 0);
  const pelanggan = data.hotelCode
    ? `${data.hotelCode}-${data.hotelName}`
    : data.hotelName;
  const terbilangText = terbilangLower(data.grandTotal);

  return (
    <div className="faktur-root">
      <div className="faktur-sheet">
        <header className="faktur-header">
          <div className="faktur-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo_soka.png" alt="Soka Frozen Food" className="faktur-logo" />
            <div>
              <h1 className="faktur-title">FAKTUR PENJUALAN</h1>
              <p className="faktur-company">{APP_NAME}</p>
              <p className="faktur-meta-line">{COMPANY_ADDRESS}</p>
              <p className="faktur-meta-line">{COMPANY_PHONES}</p>
            </div>
          </div>

          <div className="faktur-info">
            <div className="faktur-info-row">
              <span>No Transaksi</span>
              <span>:</span>
              <span>{data.transactionCode}</span>
            </div>
            <div className="faktur-info-row">
              <span>Tanggal</span>
              <span>:</span>
              <span>{formatInvoiceDateTime(data.saleDate, data.createdAt)}</span>
            </div>
            <div className="faktur-info-row">
              <span>Pelanggan</span>
              <span>:</span>
              <span>{pelanggan}</span>
            </div>
            <div className="faktur-info-row">
              <span>Alamat</span>
              <span>:</span>
              <span>{data.hotelAddress?.trim() || "\u00A0"}</span>
            </div>
          </div>
        </header>

        <table className="faktur-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>Kode Item</th>
              <th>Nama Item</th>
              <th className="num">Jml</th>
              <th>Satuan</th>
              <th className="num">Harga</th>
              <th className="num">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.lines.map((line, i) => (
              <tr key={line.itemCode + i}>
                <td className="num">{i + 1}</td>
                <td>{line.itemCode}</td>
                <td>{salesLineProductName(line)}</td>
                <td className="num">{formatInvoiceAmount(line.qty)}</td>
                <td>{line.unit.code}</td>
                <td className="num">{formatInvoiceAmount(salesLineUnitPrice(line))}</td>
                <td className="num">{formatInvoiceAmount(line.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <footer className="faktur-footer">
          <div className="faktur-footer-left">
            <div className="faktur-signatures">
              <div className="faktur-sign-box">
                <p>Hormat Kami</p>
                <div className="faktur-sign-space" />
                <p className="faktur-sign-line">(....................)</p>
              </div>
              <div className="faktur-sign-box">
                <p>Penerima</p>
                <div className="faktur-sign-space" />
                <p className="faktur-sign-line">(....................)</p>
              </div>
            </div>
            <p className="faktur-terbilang">
              <strong>Terbilang</strong> : {terbilangText}
            </p>
          </div>

          <div className="faktur-footer-mid">
            <div className="faktur-summary-row">
              <span>Jml Item</span>
              <span>:</span>
              <span className="num">{formatInvoiceAmount(totalQty)}</span>
            </div>
          </div>

          <div className="faktur-footer-right">
            <div className="faktur-summary-row">
              <span>Sub Total</span>
              <span>:</span>
              <span className="num">{formatInvoiceAmount(data.grandTotal)}</span>
            </div>
            <div className="faktur-summary-row faktur-summary-total">
              <span>Total Akhir</span>
              <span>:</span>
              <span className="num">{formatInvoiceAmount(data.grandTotal)}</span>
            </div>
          </div>
        </footer>
      </div>

      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 8mm;
        }

        @media print {
          body {
            margin: 0;
            background: #fff !important;
          }
          .faktur-print-toolbar {
            display: none !important;
          }
        }

        .faktur-root {
          min-height: 100vh;
          padding: 1rem;
          background: #ececec;
          color: #111;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 11px;
        }

        @media print {
          .faktur-root {
            min-height: auto;
            padding: 0;
            background: #fff;
          }
        }

        .faktur-sheet {
          max-width: 210mm;
          margin: 0 auto;
          background: #fff;
          border: 1px solid #222;
          padding: 10mm 12mm 12mm;
        }

        @media print {
          .faktur-sheet {
            max-width: none;
            border: none;
            padding: 0;
          }
        }

        .faktur-header {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 10px;
        }

        .faktur-brand {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .faktur-logo {
          width: 64px;
          height: 64px;
          object-fit: contain;
          flex-shrink: 0;
        }

        .faktur-title {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        .faktur-company {
          margin: 2px 0 0;
          font-size: 13px;
          font-weight: 700;
        }

        .faktur-meta-line {
          margin: 1px 0 0;
          font-size: 11px;
        }

        .faktur-info {
          min-width: 280px;
          font-size: 11px;
        }

        .faktur-info-row {
          display: grid;
          grid-template-columns: 92px 12px 1fr;
          gap: 4px;
          margin-bottom: 2px;
        }

        .faktur-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
        }

        .faktur-table th,
        .faktur-table td {
          border-top: 1px solid #111;
          border-bottom: 1px solid #111;
          padding: 5px 6px;
          vertical-align: top;
        }

        .faktur-table thead th {
          font-weight: 700;
          text-align: left;
        }

        .faktur-table .num {
          text-align: right;
          white-space: nowrap;
        }

        .faktur-footer {
          display: grid;
          grid-template-columns: 1.4fr 0.7fr 0.9fr;
          gap: 12px;
          margin-top: 14px;
          align-items: start;
        }

        .faktur-signatures {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 12px;
        }

        .faktur-sign-box {
          text-align: center;
        }

        .faktur-sign-box p {
          margin: 0;
        }

        .faktur-sign-space {
          height: 48px;
        }

        .faktur-sign-line {
          font-size: 11px;
        }

        .faktur-terbilang {
          margin: 0;
          line-height: 1.45;
        }

        .faktur-summary-row {
          display: grid;
          grid-template-columns: 1fr 8px auto;
          gap: 4px;
          margin-bottom: 4px;
        }

        .faktur-summary-total {
          font-weight: 700;
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
}
