import { LuBadgeCheck, LuArrowRight, LuTimer, LuPercent, LuUserCheck } from 'react-icons/lu';
import Reveal from '../Reveal';
import DemoButton from '../DemoButton';
import { SectionHead, IconChip, tone } from '../ui';
import { PROCESS, DEMO_PROMISES } from '@/lib/content';

const PROMISE_ICONS = [LuTimer, LuPercent, LuUserCheck];

export function Process() {
  return (
    <section className="sec">
      <div className="wrap">
        <SectionHead
          kicker="Work Process"
          title="Our simple, efficient work process"
          lead="Four stages from the first conversation to a plant running on it — with a named person on our side at every one."
        />

        <ol className="g g-4">
          {PROCESS.map((p, i) => (
            <Reveal as="li" key={p.step} delay={i * 0.09}>
              <div style={{ position: 'relative', textAlign: 'center', padding: '0 8px' }}>
                {/* connector to the next step, hidden on the last and on narrow screens */}
                {i < PROCESS.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="connector hide-narrow"
                    style={{
                      position: 'absolute',
                      top: 37,
                      left: 'calc(50% + 48px)',
                      right: -24,
                      height: 2,
                      background: 'var(--border)',
                    }}
                  />
                )}

                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, position: 'relative', zIndex: 1 }}>
                  <IconChip icon={p.icon} tone={tone('primary')} size={74} fontSize="1.7rem" />
                </div>

                <div style={{ fontSize: 'var(--fs-2xs)', fontWeight: 800, letterSpacing: '0.12em', color: 'var(--primary)', marginBottom: 6 }}>
                  STEP {p.step}
                </div>

                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 8, letterSpacing: '-0.02em' }}>
                  {p.title}
                </h3>

                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-md)', lineHeight: 1.6, marginBottom: 13 }}>
                  {p.desc}
                </p>

                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '5px 13px',
                    borderRadius: 'var(--radius-control)',
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                    fontSize: 'var(--fs-xs)',
                    fontWeight: 600,
                  }}
                >
                  <LuBadgeCheck style={{ color: 'var(--c-green)' }} /> {p.out}
                </span>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function CtaBand() {
  return (
    <section style={{ paddingInline: 'var(--page-pad)' }}>
      <Reveal style={{ maxWidth: 'var(--page-max)', marginInline: 'auto' }}>
        {/* on-brand: solid primary fill, so white text and white rules are correct */}
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            isolation: 'isolate',
            borderRadius: 'var(--radius-3xl)',
            background: 'var(--primary)',
            padding: 'clamp(40px, 5.5vw, 76px) clamp(24px, 5vw, 56px)',
            textAlign: 'center',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {/* blueprint rules drawn on the solid primary fill */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: -1,
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.09) 1px, transparent 1px)',
              backgroundSize: '34px 34px',
              maskImage: 'radial-gradient(ellipse at 50% 50%, #000 18%, transparent 74%)',
              WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%, #000 18%, transparent 74%)',
            }}
          />

          <h2 style={{ fontSize: 'clamp(1.7rem, 3.2vw, 2.6rem)', color: '#fff', marginBottom: 14 }}>
            Get your free demo today
          </h2>

          <p
            style={{
              color: 'rgba(255,255,255,0.92)',
              fontSize: 'var(--fs-lg)',
              maxWidth: 620,
              margin: '0 auto 28px',
              lineHeight: 1.65,
            }}
          >
            We will walk you through your own floor — gate, production, quality, store
            and dispatch — using your products and your racks.
          </p>

          <DemoButton variant="invert" size="lg" iconRight={<LuArrowRight />} />

          <ul
            style={{
              display: 'flex',
              gap: 'clamp(16px, 3vw, 40px)',
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginTop: 30,
              paddingTop: 26,
              borderTop: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            {DEMO_PROMISES.map((t, i) => {
              const Icon = PROMISE_ICONS[i];
              return (
                <li
                  key={t}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 9,
                    color: 'rgba(255,255,255,0.94)',
                    fontSize: 'var(--fs-md)',
                    fontWeight: 600,
                  }}
                >
                  <Icon /> {t}
                </li>
              );
            })}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}
