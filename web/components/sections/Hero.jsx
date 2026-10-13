import { LuFactory, LuArrowRight, LuCheck } from 'react-icons/lu';
import Reveal from '../Reveal';
import CountUp from '../CountUp';
import ModuleWheel from '../ModuleWheel';
import DemoButton from '../DemoButton';
import { Kicker } from '../ui';
import { Specks, Spotlights } from '../Backdrop';
import { HERO_TAGS, HERO_PROOF, STATS, MARQUEE } from '@/lib/content';
import { site } from '@/lib/site';

export default function Hero() {
  return (
    <>
      {/* ==================================================== HERO ===== */}
      <section style={{ position: 'relative', isolation: 'isolate' }}>
        <Specks />
        <Spotlights
          items={[
            { size: 520, top: '-16%', right: '-6%', color: 'var(--primary)', strength: 26 },
            { size: 420, bottom: '-20%', left: '-8%', color: 'var(--c-cyan)', strength: 22 },
            { size: 340, top: '30%', left: '40%', color: 'var(--c-amber)', strength: 16 },
          ]}
        />

        <div className="wrap sec split split-hero">
          <Reveal dir="from-left">
            <Kicker icon={LuFactory} className="pulse-ring">Factory Automation</Kicker>

            <h1 className="h1">
              Grow your factory with{' '}
              <span className="grad-text">{site.name} ERP</span>
            </h1>

            <p className="lead" style={{ marginBottom: 30, fontSize: 'clamp(1.05rem, 1.45vw, 1.3rem)' }}>
              From the moment a vehicle reaches your gate to the day the order ships —
              production, quality, stock and dispatch run on one connected system that
              the whole plant can see.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 26 }}>
              <DemoButton variant="primary" size="lg" iconRight={<LuArrowRight />} />
              <a href="#solution" className="btn btn-secondary btn-lg">Explore Solutions</a>
            </div>

            <ul style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
              {HERO_TAGS.map((t) => {
                const Icon = t.icon;
                return (
                  <li
                    key={t.label}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 16px',
                      borderRadius: 'var(--radius-control)',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-secondary)',
                      fontSize: 'var(--fs-md)',
                      fontWeight: 600,
                    }}
                  >
                    <span style={{ color: 'var(--primary)', display: 'flex' }}><Icon /></span>
                    {t.label}
                  </li>
                );
              })}
            </ul>

            <ul
              style={{
                display: 'flex',
                gap: 'clamp(14px, 2.2vw, 30px)',
                flexWrap: 'wrap',
                paddingTop: 20,
                borderTop: '1px solid var(--border)',
              }}
            >
              {HERO_PROOF.map((p) => {
                const Icon = p.icon;
                return (
                  <li
                    key={p.text}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      color: 'var(--text-muted)',
                      fontSize: 'var(--fs-sm)',
                      fontWeight: 600,
                    }}
                  >
                    <span style={{ color: 'var(--c-green)', display: 'flex' }}><Icon /></span>
                    {p.text}
                  </li>
                );
              })}
            </ul>
          </Reveal>

          <Reveal dir="from-right" delay={0.12}>
            <ModuleWheel />
          </Reveal>
        </div>
      </section>

      {/* ================================================== STATS ===== */}
      <section className="band" aria-label="At a glance">
        <div className="wrap" style={{ paddingTop: 'clamp(30px, 3.4vw, 46px)', paddingBottom: 'clamp(24px, 2.6vw, 34px)' }}>
          <Reveal>
            <p
              style={{
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: 'var(--fs-sm)',
                fontWeight: 600,
                letterSpacing: '0.04em',
              }}
            >
              Trusted across Manufacturing, Retail &amp; Services
            </p>

            <ul className="g g-5" style={{ marginTop: 24 }}>
              {STATS.map((s) => {
                const Icon = s.icon;
                return (
                  <li key={s.l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '4px 8px' }}>
                    <span style={{ color: 'var(--primary)', fontSize: '1.2rem', display: 'flex', marginBottom: 5, opacity: 0.85 }}>
                      <Icon />
                    </span>
                    <div
                      style={{
                        fontFamily: 'var(--font-display), sans-serif',
                        fontSize: 'clamp(1.8rem, 2.8vw, 2.6rem)',
                        fontWeight: 800,
                        color: 'var(--primary)',
                        letterSpacing: '-0.03em',
                        fontVariantNumeric: 'tabular-nums',
                        lineHeight: 1.1,
                      }}
                    >
                      <CountUp value={s.v} />
                    </div>
                    <div style={{ fontSize: 'var(--fs-md)', color: 'var(--text-muted)', textAlign: 'center' }}>{s.l}</div>
                  </li>
                );
              })}
            </ul>
          </Reveal>
        </div>

        {/* capability strip — full bleed, so it reads edge to edge */}
        <div className="marquee-mask" style={{ borderTop: '1px solid var(--border)', paddingBlock: 20 }}>
          <ul className="marquee-track">
            {[...MARQUEE, ...MARQUEE].map((m, i) => (
              <li
                key={`${m}-${i}`}
                aria-hidden={i >= MARQUEE.length}
                style={{
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 17px',
                  borderRadius: 'var(--radius-control)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-secondary)',
                  fontSize: 'var(--fs-sm)',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ color: 'var(--primary)', display: 'flex', fontSize: 12 }}><LuCheck /></span>
                {m}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
