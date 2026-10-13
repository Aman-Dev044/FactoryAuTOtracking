import React from 'react';

export const WORKFLOW_9_STEPS = [
  { step: 1, key: 'lead', label: '1. Lead', icon: '🎯', color: 'var(--primary)', bg: 'color-mix(in srgb, var(--primary) 15%, transparent)', desc: 'Inquiry' },
  { step: 2, key: 'quotation', label: '2. Quotation', icon: '📜', color: 'var(--c-blue)', bg: 'color-mix(in srgb, var(--c-blue) 15%, transparent)', desc: 'Specs & Quote' },
  { step: 3, key: 'customer_po', label: '3. PO', icon: '📑', color: 'var(--c-violet)', bg: 'color-mix(in srgb, var(--c-violet) 15%, transparent)', desc: 'Customer PO' },
  { step: 4, key: 'pi', label: '4. PI', icon: '🧾', color: 'var(--warning)', bg: 'color-mix(in srgb, var(--warning) 15%, transparent)', desc: 'Proforma Inv' },
  { step: 5, key: 'invoice', label: '5. Invoice', icon: '🏷️', color: 'var(--c-cyan)', bg: 'color-mix(in srgb, var(--c-cyan) 15%, transparent)', desc: 'Tax Bill / DC' },
  { step: 6, key: 'payment', label: '6. Payment', icon: '💳', color: 'var(--success)', bg: 'color-mix(in srgb, var(--success) 15%, transparent)', desc: 'Pay / Credit' },
  { step: 7, key: 'assemble', label: '7. Assembly', icon: '🔧', color: 'var(--warning)', bg: 'color-mix(in srgb, var(--warning) 15%, transparent)', desc: '(Store) Assembly' },
  { step: 8, key: 'packing', label: '8. Packing', icon: '📦', color: 'var(--primary)', bg: 'color-mix(in srgb, var(--primary) 15%, transparent)', desc: 'Carton Packing' },
  { step: 9, key: 'dispatched', label: '9. Dispatch', icon: '🚚', color: 'var(--success)', bg: 'color-mix(in srgb, var(--success) 15%, transparent)', desc: 'LR & Outward' }
];

export function determineOrderStep(record) {
  if (!record) return 1;

  // Check if dispatch record
  if (record.status === 'dispatched' || record.dispatchedAt) return 9;
  if (record.status === 'packing' || record.packedAt) return 8;
  if (record.status === 'assemble' || record.assembledAt) return 7;

  // Check sales record / pipeline
  if (record.stage === 'sales_order') {
    if (record.dispatchId?.status === 'dispatched') return 9;
    if (record.dispatchId?.status === 'packing') return 8;
    if (record.dispatchId?.status === 'assemble') return 7;
    if (record.paymentStatus === 'paid' || record.paymentStatus === 'partial' || record.approvalStatus === 'approved') return 6;
    return 5;
  }
  if (record.stage === 'customer_po') return 3;
  if (record.stage === 'pi') return 4;
  if (record.stage === 'quotation') return 2;
  return 1;
}

export default function OrderWorkflowBanner({ activeStep = 1, currentStageKey = '', onStepClick }) {
  let currentNum = activeStep;
  if (currentStageKey) {
    const found = WORKFLOW_9_STEPS.find(s => s.key === currentStageKey);
    if (found) currentNum = found.step;
  }

  return (
    <div className="surface" style={{ padding: '14px 16px', marginBottom: 18 }}>
      <div
        style={{
          display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap',
          paddingBottom: 10, marginBottom: 12,
          borderBottom: '1px solid var(--border-light)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-display)', fontSize: 'var(--fs-base)',
            fontWeight: 700, color: 'var(--text-primary)',
          }}
        >
          Order lifecycle
        </span>
        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
          Step {currentNum} of {WORKFLOW_9_STEPS.length}
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))',
          gap: 8,
        }}
      >
        {WORKFLOW_9_STEPS.map((s) => {
          const isActive = currentNum === s.step;
          const isCompleted = currentNum > s.step;

          const accent = isActive ? s.color : isCompleted ? 'var(--success)' : 'var(--text-ghost)';
          const bg = isActive
            ? s.bg
            : isCompleted
              ? 'color-mix(in srgb, var(--success) 8%, transparent)'
              : 'var(--bg-subtle)';
          const border = isActive || isCompleted
            ? `1px solid color-mix(in srgb, ${accent} 40%, transparent)`
            : '1px solid var(--border)';

          return (
            <div
              key={s.step}
              onClick={() => onStepClick && onStepClick(s)}
              style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '8px 10px', borderRadius: 'var(--radius-md)',
                background: bg, border,
                cursor: onStepClick ? 'pointer' : 'default',
                transition: 'var(--transition-fast)',
                minWidth: 0,
              }}
            >
              <span
                style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 'var(--fs-2xs)', fontWeight: 800,
                  background: isActive || isCompleted ? accent : 'var(--bg-card)',
                  color: isActive || isCompleted ? '#fff' : 'var(--text-ghost)',
                  border: isActive || isCompleted ? 'none' : '1px solid var(--border-strong)',
                }}
              >
                {isCompleted ? '✓' : s.step}
              </span>

              <span style={{ minWidth: 0 }}>
                <span
                  style={{
                    display: 'block', fontWeight: 600, fontSize: 'var(--fs-sm)',
                    color: isActive || isCompleted ? accent : 'var(--text-secondary)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}
                >
                  {s.label.split('. ')[1]}
                </span>
                <span
                  style={{
                    display: 'block', fontSize: 'var(--fs-2xs)', color: 'var(--text-ghost)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}
                >
                  {s.desc}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function OrderStepBadge({ record }) {
  const stepNum = determineOrderStep(record);
  const stepConfig = WORKFLOW_9_STEPS.find(s => s.step === stepNum) || WORKFLOW_9_STEPS[0];

  return (
    <span
      className="badge"
      style={{
        background: stepConfig.bg,
        color: stepConfig.color,
        borderColor: `color-mix(in srgb, ${stepConfig.color} 40%, transparent)`,
      }}
    >
      {stepConfig.step}/9 {stepConfig.label.split('. ')[1]}
    </span>
  );
}
