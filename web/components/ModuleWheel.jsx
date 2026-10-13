import { WHEEL } from '@/lib/content';
import { site } from '@/lib/site';

/**
 * Modules orbiting a static brand hub.
 *
 * The ring rotates; each item's inner box counter-rotates at the same
 * duration, so a label is never upside down. Pure CSS, so this stays a server
 * component and ships no JavaScript.
 */
export default function ModuleWheel() {
  return (
    <div
      className="wheel"
      role="img"
      aria-label={`${site.name} modules: ${WHEEL.map((w) => w.label).join(', ')}`}
    >
      <div className="wheel-ring">
        {WHEEL.map((w, i) => {
          const Icon = w.icon;
          return (
            <div
              key={w.label}
              className="wheel-item"
              style={{ '--angle': `${(360 / WHEEL.length) * i}deg`, '--tone': w.tone }}
            >
              {/* the arm rotates; this box un-rotates so it stays upright */}
              <div className="wheel-item-pos">
                <div className="wheel-item-inner">
                  <span className="wheel-num">{i + 1}</span>
                  <span className="wheel-icon"><Icon /></span>
                  <span className="wheel-label">{w.label}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* static hub — it must not turn, so it sits outside .wheel-ring */}
      <div className="wheel-hub">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt={site.fullName} width={360} height={233} />
        <span
          style={{
            fontSize: 'clamp(8px, 1.3vw, 10px)',
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--text-ghost)',
          }}
        >
          Factory ERP
        </span>
      </div>
    </div>
  );
}
