import { terbilangUpper, formatIdrAmountLine } from "@/lib/format";

export type KwitansiPrintData = {
  receiptNumber: string;
  receivedFrom: string;
  totalAmount: string;
  untukPembayaran?: string;
};

type Props = {
  data: KwitansiPrintData;
};

/** Layout kwitansi formal — ukuran half-A4 landscape (21.5cm × 14cm). */
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

          <div className="kwitansi-row kwitansi-row-untuk-pembayaran">
            <span className="kwitansi-label">UNTUK PEMBAYARAN</span>
            <span className="kwitansi-colon">:</span>
            <span className="kwitansi-value kwitansi-underline kwitansi-multiline">
              {data.untukPembayaran
                ? data.untukPembayaran.split("\n").map((line, i, arr) => (
                    <span key={i}>
                      {line || "\u00A0"}
                      {i < arr.length - 1 && <br />}
                    </span>
                  ))
                : "\u00A0"}
            </span>
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
          size: 21.5cm 14cm;
          margin: 7mm 9mm;
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
          width: min(100%, 760px);
          min-height: 340px;
          border: 2px solid #111;
          background: #fff;
        }

        @media print {
          .kwitansi-frame {
            width: 100%;
            min-height: auto;
            border-width: 1.5px;
          }
        }

        .kwitansi-sidebar {
          width: 52px;
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
          font-size: 20px;
          font-weight: 700;
          letter-spacing: 0.35em;
          color: #111;
        }

        .kwitansi-body {
          flex: 1;
          padding: 1.5rem 2rem 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
        }

        .kwitansi-row {
          display: grid;
          grid-template-columns: 180px 14px 1fr;
          align-items: baseline;
          gap: 0.2rem;
          font-size: 13px;
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
          min-height: 1.5rem;
          padding: 0.12rem 0.3rem 0.18rem;
        }

        .kwitansi-underline {
          border-bottom: 1px solid #111;
        }

        .kwitansi-manual {
          min-height: 1.5rem;
        }

        .kwitansi-shade {
          background: repeating-radial-gradient(circle at 2px 2px, #ccc 0 0.8px, transparent 0.8px 5px);
          border: 1px solid #111;
          padding: 0.35rem 0.5rem;
        }

        .kwitansi-italic {
          font-style: italic;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          line-height: 1.4;
          font-size: 12px;
        }

        .kwitansi-multiline {
          white-space: pre-line;
          line-height: 1.5;
        }

        .kwitansi-row-untuk-pembayaran {
          align-items: flex-start;
        }

        .kwitansi-footer {
          margin-top: auto;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 1.5rem;
          padding-top: 1rem;
        }

        .kwitansi-amount-numeric {
          display: flex;
          align-items: baseline;
          gap: 0.3rem;
          font-size: 15px;
          font-weight: 700;
        }

        .kwitansi-rp {
          white-space: nowrap;
        }

        .kwitansi-numeric {
          min-width: 150px;
          font-size: 17px;
          letter-spacing: 0.02em;
          border-bottom: 3px solid #111;
          padding-bottom: 0.12rem;
        }

        .kwitansi-sign-block {
          min-width: 220px;
          text-align: center;
        }

        .kwitansi-place-date {
          margin: 0;
          min-height: 1.3rem;
          border-bottom: 1px solid #111;
        }

        .kwitansi-sign-space {
          height: 52px;
        }

        .kwitansi-sign-name {
          margin: 0;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.06em;
        }
      `}</style>
    </div>
  );
}
