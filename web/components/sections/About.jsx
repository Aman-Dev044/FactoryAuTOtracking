import { LuSmartphone } from 'react-icons/lu';
import Reveal from '../Reveal';
import { Kicker, SectionHead, Tick, IconChip, tone } from '../ui';
import { ABOUT_TILES, ABOUT_POINTS, WHY_ERP } from '@/lib/content';
import { site } from '@/lib/site';

export function About() {
  return (
    <section id="about" className="band">
      <div className="wrap sec split">
        <Reveal dir="from-left">
          <Kicker>About Us</Kicker>
          <h2 className="h2">Built on the shop floor, not in a boardroom</h2>

          <p className="lead" style={{ marginBottom: 18 }}>
            {site.fullName} began with a simple observation: most factory software is written
            for accountants, then handed to operators. So we built the opposite — a system
            designed around the person doing the job, whether that is a guard logging a
            truck at 6am or a checker rejecting a batch at the final inspection.
          </p>

          <p className="lead" style={{ marginBottom: 26 }}>
            Today {site.fullName} runs the full manufacturing cycle for drag chain and allied
            engineering plants — gate to godown, lead to dispatch — with each company&apos;s
            data isolated at the database layer.
          </p>

          <ul style={{ display: 'grid', gap: 13 }}>
            {ABOUT_POINTS.map((p) => <Tick key={p}>{p}</Tick>)}
          </ul>
        </Reveal>

        <Reveal dir="from-right" delay={0.1}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
            {ABOUT_TILES.map((c) => {
              const t = tone(c.tone);
              return (
                <div
                  key={c.l}
                  className="card lift"
                  style={{ background: 'var(--bg-primary)', borderRadius: 'var(--radius-xl)', padding: '26px 18px', textAlign: 'center' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                    <IconChip icon={c.icon} tone={t} size={42} fontSize="1.1rem" />
                  </div>
                  <div style={{ fontFamily: 'var(--font-display), sans-serif', fontWeight: 800, fontSize: 'var(--fs-md)', color: t.fg, letterSpacing: '-0.02em' }}>
                    {c.v}
                  </div>
                  <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', marginTop: 5 }}>{c.l}</div>
                </div>
              );
            })}

            <div
              className="card"
              style={{
                gridColumn: '1 / -1',
                background: 'var(--bg-primary)',
                borderRadius: 'var(--radius-xl)',
                padding: '20px 22px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <IconChip icon={LuSmartphone} tone={tone('primary')} size={44} fontSize="1.15rem" />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--fs-md)' }}>
                  Runs where the work happens
                </div>
                <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', lineHeight: 1.55 }}>
                  Desk, tablet at the gate, or a phone used as a barcode scanner.
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function WhyErp() {
  return (
    <section id="why-erp" className="sec">
      <div className="wrap">
        <SectionHead
          kicker="Why ERP"
          title="What changes when the floor shares one system"
          lead="Not features — outcomes. These are the four things plants notice in the first month."
        />

        <ul className="g g-4">
          {WHY_ERP.map((w, i) => (
            <Reveal as="li" key={w.title} delay={i * 0.07}>
              <article className="card lift" style={{ height: '100%', padding: 26, display: 'flex', flexDirection: 'column' }}>
                <IconChip icon={w.icon} tone={tone('primary')} size={48} fontSize="1.3rem" />

                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '18px 0 9px', letterSpacing: '-0.02em' }}>
                  {w.title}
                </h3>

                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-md)', lineHeight: 1.62, marginBottom: 18 }}>
                  {w.desc}
                </p>

                <span
                  style={{
                    marginTop: 'auto',
                    alignSelf: 'flex-start',
                    padding: '5px 13px',
                    borderRadius: 'var(--radius-control)',
                    background: 'var(--primary-soft)',
                    color: 'var(--primary)',
                    fontSize: 'var(--fs-xs)',
                    fontWeight: 700,
                  }}
                >
                  {w.metric}
                </span>
              </article>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
