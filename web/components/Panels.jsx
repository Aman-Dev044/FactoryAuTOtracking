import {
  LuFactory, LuGauge, LuScanLine, LuCog, LuWarehouse, LuTruck,
  LuQrCode, LuCircleCheck, LuTriangleAlert,
} from 'react-icons/lu';

/**
 * Miniatures of the real product.
 *
 * All decorative — each is aria-hidden, because the copy beside it already
 * says everything the picture shows. Figures are illustrative.
 */

/* ------------------------------------------------------------- chrome --- */

function Panel({ title, children }) {
  return (
    <div className="mini-panel" aria-hidden="true">
      <div className="mini-panel-bar">
        <span className="mini-dot" style={{ background: 'var(--c-red)' }} />
        <span className="mini-dot" style={{ background: 'var(--c-amber)' }} />
        <span className="mini-dot" style={{ background: 'var(--c-green)' }} />
        <span style={{ marginLeft: 8 }}>{title}</span>
      </div>
      <div style={{ padding: 18 }}>{children}</div>
    </div>
  );
}

/* ------------------------------------------------------- valuation --- */

export function ValuationPanel() {
  const rows = [
    ['Chain link 45.5 OP', '2,400 pcs', 'A-12', '₹3,84,000'],
    ['Nylon granules', '860 kg', 'B-04', '₹2,15,000'],
    ['Bracket LSR(P)', '1,120 pcs', 'C-09', '₹1,34,400'],
    ['Separator HS-35', '3,600 pcs', 'A-04', '₹1,08,000'],
  ];

  return (
    <Panel title="Store • Unified Inventory">
      <div
        style={{
          borderRadius: 'var(--radius-lg)',
          padding: '16px 18px',
          marginBottom: 16,
          background: 'var(--primary-soft)',
          border: '1px solid var(--border-primary)',
        }}
      >
        <div
          style={{
            fontSize: 'var(--fs-2xs)',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--primary)',
          }}
        >
          Total stock valuation
        </div>
        <div
          style={{
            fontFamily: 'var(--font-display), sans-serif',
            fontSize: '2.1rem',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: 'var(--text-primary)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          ₹ 12,41,820
        </div>
      </div>

      {rows.map((r, i) => (
        <div
          key={r[0]}
          style={{
            display: 'grid',
            gridTemplateColumns: '1.7fr 0.9fr 0.55fr 1fr',
            gap: 8,
            padding: '10px 0',
            fontSize: 'var(--fs-sm)',
            color: 'var(--text-secondary)',
            borderTop: i === 0 ? 'none' : '1px solid var(--border-light)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{r[0]}</span>
          <span>{r[1]}</span>
          <span>{r[2]}</span>
          <span style={{ textAlign: 'right', fontWeight: 700, color: 'var(--c-green)' }}>{r[3]}</span>
        </div>
      ))}
    </Panel>
  );
}

/* ------------------------------------------------------------- scan --- */

export function ScanPanel() {
  const fields = [
    ['Vendor', 'Shakti Polymers Pvt Ltd'],
    ['Invoice no.', 'SP/2026/4417'],
    ['Total', '₹1,84,260'],
    ['Tax (18%)', '₹28,107'],
  ];

  return (
    <Panel title="Gate • Inward Entry">
      <div style={{ display: 'flex', gap: 16, alignItems: 'stretch' }}>
        <div
          style={{
            width: 108,
            flexShrink: 0,
            borderRadius: 'var(--radius-lg)',
            border: '1px dashed var(--border-strong)',
            background: 'var(--bg-subtle)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            color: 'var(--text-ghost)',
          }}
        >
          <span style={{ fontSize: '1.8rem', color: 'var(--primary)' }}><LuQrCode /></span>
          <span style={{ fontSize: 'var(--fs-2xs)', fontWeight: 700, textAlign: 'center', lineHeight: 1.3 }}>
            BILL<br />SCANNED
          </span>
        </div>

        <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 10, alignContent: 'center' }}>
          {fields.map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 'var(--fs-sm)' }}>
              <span style={{ color: 'var(--text-muted)' }}>{k}</span>
              <span
                style={{
                  color: 'var(--text-primary)',
                  fontWeight: 650,
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {v}
              </span>
            </div>
          ))}

          <span
            style={{
              marginTop: 4,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              justifySelf: 'start',
              padding: '6px 13px',
              borderRadius: 'var(--radius-control)',
              background: 'var(--c-green-soft)',
              color: 'var(--c-green)',
              fontSize: 'var(--fs-xs)',
              fontWeight: 700,
            }}
          >
            <LuCircleCheck /> GRN-2026-0184 generated
          </span>
        </div>
      </div>
    </Panel>
  );
}

/* ----------------------------------------------------------- credit --- */

export function CreditPanel() {
  const rows = [
    { c: 'Aarav Engineering', d: 'Due 12 Mar', status: 'paid' },
    { c: 'Neelkanth Automation', d: 'Due 02 Mar', status: 'overdue' },
    { c: 'Sahyadri Machine Tools', d: 'Due 28 Mar', status: 'open' },
    { c: 'Pragati Hydraulics', d: 'Due 05 Mar', status: 'overdue' },
  ];

  const label = { overdue: 'CREDIT OVERDUE', paid: 'PAID', open: 'WITHIN CREDIT' };
  const toneOf = { overdue: 'red', paid: 'green', open: 'slate' };

  return (
    <Panel title="Sales • Pipeline">
      <div style={{ display: 'grid', gap: 9 }}>
        {rows.map((r) => {
          const t = toneOf[r.status];
          const late = r.status === 'overdue';
          return (
            <div
              key={r.c}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                padding: '12px 13px',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${late ? 'var(--c-red)' : 'var(--border)'}`,
                background: late ? 'var(--c-red-soft)' : 'var(--bg-primary)',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 'var(--fs-sm)',
                    fontWeight: 650,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {r.c}
                </div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{r.d}</div>
              </div>

              <span
                style={{
                  flexShrink: 0,
                  padding: '5px 10px',
                  borderRadius: 'var(--radius-control)',
                  background: `var(--c-${t}-soft)`,
                  color: `var(--c-${t})`,
                  fontSize: 'var(--fs-2xs)',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                {late && <LuTriangleAlert />}
                {label[r.status]}
              </span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

export const PANELS = {
  valuation: ValuationPanel,
  scan: ScanPanel,
  credit: CreditPanel,
};

/* ------------------------------------------------------ product mock --- */

function MockTile({ label, value, tone }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '10px 12px',
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-ghost)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display), sans-serif',
          fontSize: 18,
          fontWeight: 800,
          letterSpacing: '-0.02em',
          fontVariantNumeric: 'tabular-nums',
          color: tone ? `var(--c-${tone})` : 'var(--text-primary)',
        }}
      >
        {value}
      </div>
    </div>
  );
}

/** A miniature of the app shell, so a visitor sees the product immediately. */
export function ProductMock() {
  const rows = [
    ['S-45.1', '240', 'A-12', '₹2.1L'],
    ['S-35.2', '180', 'B-04', '₹1.4L'],
    ['S-25.1', '96', 'C-09', '₹0.7L'],
    ['S-18.3', '312', 'D-02', '₹1.9L'],
  ];

  const cols = '1.3fr 0.7fr 0.8fr 1fr';

  return (
    <div
      aria-hidden="true"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-2xl)',
        boxShadow: 'var(--shadow-xl)',
        overflow: 'hidden',
        display: 'flex',
        minHeight: 380,
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: 48,
          flexShrink: 0,
          background: 'var(--bg-subtle)',
          borderRight: '1px solid var(--border)',
          padding: '12px 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 7,
        }}
      >
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 'var(--radius-sm)',
            background: 'var(--primary)',
            color: 'var(--on-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            marginBottom: 6,
          }}
        >
          <LuFactory />
        </span>
        {[LuGauge, LuScanLine, LuCog, LuWarehouse, LuTruck].map((Ico, i) => (
          <span
            key={i}
            style={{
              width: 30,
              height: 28,
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              background: i === 3 ? 'var(--primary-soft)' : 'transparent',
              color: i === 3 ? 'var(--primary)' : 'var(--text-ghost)',
            }}
          >
            <Ico />
          </span>
        ))}
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            height: 38,
            flexShrink: 0,
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 14px',
            gap: 7,
            fontSize: 12,
            color: 'var(--text-muted)',
          }}
        >
          <span>Store</span>
          <span style={{ color: 'var(--text-ghost)' }}>/</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Inventory</span>
        </div>

        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
          <div style={{ display: 'flex', gap: 9 }}>
            <MockTile label="Stock value" value="₹12.4L" tone="green" />
            <MockTile label="Items" value="1,240" />
            <MockTile label="Low stock" value="17" tone="red" />
          </div>

          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', flex: 1 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: cols,
                gap: 8,
                padding: '8px 12px',
                background: 'var(--bg-subtle)',
                borderBottom: '1px solid var(--border)',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
              }}
            >
              <span>Model</span><span>Qty</span><span>Rack</span>
              <span style={{ textAlign: 'right' }}>Value</span>
            </div>

            {rows.map((r, i) => (
              <div
                key={r[0]}
                style={{
                  display: 'grid',
                  gridTemplateColumns: cols,
                  gap: 8,
                  padding: '9px 12px',
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  borderBottom: i < rows.length - 1 ? '1px solid var(--border-light)' : 'none',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{r[0]}</span>
                <span>{r[1]}</span>
                <span>{r[2]}</span>
                <span style={{ textAlign: 'right' }}>{r[3]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
