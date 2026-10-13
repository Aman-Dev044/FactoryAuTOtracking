import { Fragment } from 'react';
import { LuArrowRight } from 'react-icons/lu';
import Reveal from '../Reveal';
import { SectionHead, IconChip, tone } from '../ui';
import { WORKFLOW } from '@/lib/content';

export default function Workflow() {
  return (
    <section id="workflow" className="sec">
      <div className="wrap">
        <SectionHead
          kicker="Order Lifecycle"
          title="Nine stages from first call to proof of delivery"
          lead="Every order carries its own stage. Sales can see where it is without walking to the floor, and the floor can see what is coming without waiting for an email."
        >
          {/* compact flow rail, wide screens only — the cards below say the
              same thing in a layout that works at any width */}
          <ol
            className="hide-narrow"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              flexWrap: 'wrap',
              marginTop: 30,
            }}
          >
            {WORKFLOW.map((w, i) => (
              <Fragment key={w.n}>
                <li
                  style={{
                    padding: '7px 14px',
                    borderRadius: 'var(--radius-control)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-card)',
                    fontSize: 'var(--fs-xs)',
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {w.title}
                </li>
                {i < WORKFLOW.length - 1 && (
                  <li aria-hidden="true" style={{ color: 'var(--text-ghost)', display: 'flex', fontSize: 12 }}>
                    <LuArrowRight />
                  </li>
                )}
              </Fragment>
            ))}
          </ol>
        </SectionHead>

        <ol className="g g-3">
          {WORKFLOW.map((w, i) => {
            const t = tone(w.tone);
            return (
              <Reveal as="li" key={w.n} delay={(i % 3) * 0.06}>
                {/* .flow-card turns this into icon-beside-copy from 1280px up,
                    so a wide card fills rather than stacking into empty space */}
                <article
                  className="card lift flow-card"
                  style={{
                    height: '100%',
                    padding: '26px 24px',
                    position: 'relative',
                    overflow: 'hidden',
                    borderLeft: `3px solid ${t.fg}`,
                    '--tone': t.fg,
                  }}
                >
                  <span className="ghost-num" aria-hidden="true">{w.n}</span>

                  <IconChip icon={w.icon} tone={t} size={52} fontSize="1.35rem" />

                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 'var(--fs-2xs)',
                        fontWeight: 800,
                        letterSpacing: '0.12em',
                        color: t.fg,
                        textTransform: 'uppercase',
                        marginBottom: 5,
                      }}
                    >
                      Stage {w.n}
                    </div>

                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 9, letterSpacing: '-0.02em' }}>
                      {w.title}
                    </h3>

                    <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-md)', lineHeight: 1.65 }}>
                      {w.desc}
                    </p>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
