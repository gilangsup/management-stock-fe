import { terbilangUpper, formatDateLong, formatIdrAmountLine } from "@/lib/format";

export type KwitansiPrintData = {
  receiptNumber: string;
  receivedFrom: string;
  totalAmount: string;
};

type Props = {
  data: KwitansiPrintData;
};

/** Layout kwitansi formal (landscape) — field manual dibiarkan kosong untuk ditulis pen. */
export function KwitansiPrintLayout({ data }: Props) {
  const amountWords = terbilangUpper(data.totalAmount);
  const amountNumeric = formatIdrAmountLine(data.totalAmount);

  return (
    <div className="kwitansi-root">
      <div className="kwitansi-frame">
        <aside className="kwitansi-sidebar" aria-hidden>
          <span className="kwitansi-sidebar-text">KWITANSI</span>
        </aside>

        <main className="kwitansi-body">
          <div className="kwitansi-row">
            <span className="kwitansi-label">NO.</span>
            <span className="kwitansi-colon">:</span>
            <span className="kwitansi-value kwitansi-underline">{data.receiptNumber}</span>
          </div>

          <div className="kwitansi-row">
            <span className="kwitansi-label">TELAH DITERIMA DARI</span>
            <span className="kwitansi-colon">:</span>
            <span className="kwitansi-value kwitansi-underline">{data.receivedFrom}</span>
          </div>

          <div className="kwitansi-row kwitansi-row-amount-words">
            <span className="kwitansi-label">UANG SEJUMLAH</span>
            <span className="kwitansi-colon">:</span>
            <span className="kwitansi-value kwitansi-shade kwitansi-italic">{amountWords}</span>
          </div>

          <div className="kwitansi-row">
            <span className="kwitansi-label">UNTUK PEMBAYARAN</span>
            <span className="kwitansi-colon">:</span>
            <span className="kwitansi-value kwitansi-underline kwitansi-manual">&nbsp;</span>
          </div>

          <div className="kwitansi-footer">
            <div className="kwitansi-amount-numeric">
              <span className="kwitansi-rp">Rp.</span>
              <span className="kwitansi-shade kwitansi-numeric">{amountNumeric}</span>
            </div>

            <div className="kwitansi-sign-block">
              <p className="kwitansi-place-date kwitansi-manual">&nbsp;</p>
              <div className="kwitansi-sign-space" />
              <p className="kwitansi-sign-name kwitansi-manual">(&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)</p>
            </div>
          </div>
        </main>
      </div>

      <style jsx global>{`
        @page {
          size: A4 landscape;
          margin: 10mm;
        }

        @media print {
          body {
            margin: 0;
            background: #fff !important;
          }
          .kwitansi-print-toolbar {
            display: none !important;
          }
        }

        .kwitansi-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          background: #f4f4f5;
          color: #111;
          font-family: Arial, Helvetica, sans-serif;
        }

        @media print {
          .kwitansi-root {
            min-height: auto;
            padding: 0;
            background: #fff;
          }
        }

        .kwitansi-frame {
          display: flex;
          width: min(100%, 960px);
          min-height: 520px;
          border: 2px solid #111;
          background: #fff;
        }

        @media print {
          .kwitansi-frame {
            width: 100%;
            min-height: 180mm;
            border-width: 1.5px;
          }
        }

        .kwitansi-sidebar {
          width: 72px;
          flex-shrink: 0;
          border-right: 2px solid #111;
          background: repeating-radial-gradient(circle at 2px 2px, #bbb 0 1px, transparent 1px 6px);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .kwitansi-sidebar-text {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          font-size: 28px;
          font-weight: 700;
          letter-spacing: 0.35em;
          color: #111;
        }

        .kwitansi-body {
          flex: 1;
          padding: 2.5rem 2.75rem 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.35rem;
        }

        .kwitansi-row {
          display: grid;
          grid-template-columns: 220px 16px 1fr;
          align-items: baseline;
          gap: 0.25rem;
          font-size: 15px;
        }

        .kwitansi-row-amount-words {
          align-items: stretch;
        }

        .kwitansi-label {
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        .kwitansi-colon {
          font-weight: 700;
        }

        .kwitansi-value {
          min-height: 1.6rem;
          padding: 0.15rem 0.35rem 0.2rem;
        }

        .kwitansi-underline {
          border-bottom: 1px solid #111;
        }

        .kwitansi-manual {
          min-height: 1.6rem;
        }

        .kwitansi-shade {
          background: repeating-radial-gradient(circle at 2px 2px, #ccc 0 0.8px, transparent 0.8px 5px);
          border: 1px solid #111;
          padding: 0.45rem 0.6rem;
        }

        .kwitansi-italic {
          font-style: italic;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          line-height: 1.45;
        }

        .kwitansi-footer {
          margin-top: auto;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 2rem;
          padding-top: 1.5rem;
        }

        .kwitansi-amount-numeric {
          display: flex;
          align-items: baseline;
          gap: 0.35rem;
          font-size: 18px;
          font-weight: 700;
        }

        .kwitansi-rp {
          white-space: nowrap;
        }

        .kwitansi-numeric {
          min-width: 180px;
          font-size: 20px;
          letter-spacing: 0.02em;
          border-bottom: 3px solid #111;
          padding-bottom: 0.15rem;
        }

        .kwitansi-sign-block {
          min-width: 280px;
          text-align: center;
        }

        .kwitansi-place-date {
          margin: 0;
          min-height: 1.4rem;
          border-bottom: 1px solid #111;
        }

        .kwitansi-sign-space {
          height: 72px;
        }

        .kwitansi-sign-name {
          margin: 0;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.06em;
        }
      `}</style>
    </div>
  );
}
