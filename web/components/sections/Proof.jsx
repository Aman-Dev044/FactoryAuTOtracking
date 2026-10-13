import { LuCheck, LuX, LuPlus } from 'react-icons/lu';
import Reveal from '../Reveal';
import { Kicker, SectionHead, Tick } from '../ui';
import { MFG_TILES, MANUFACTURING, COMPARE, FAQ } from '@/lib/content';
import { site } from '@/lib/site';

export function Manufacturing() {
  return (
    <section className="sec">
      <div className="wrap split">
        <Reveal dir="from-left">
          <div className="card" style={{ borderRadius: 'var(--radius-2xl)', padding: 26, boxShadow: 'var(--shadow-md)' }}>
            <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
              {MFG_TILES.map((x) => {
                const Icon = x.icon;
                return (
                  <li
                    key={x.l}
                    style={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '20px 12px',
                      textAlign: 'center',
                    }}
                  >
                    <span style={{ color: 'var(--primary)', fontSize: '1.35rem', display: 'flex', justifyContent: 'center', marginBottom: 9 }}>
                      <Icon />
                    </span>
                    <div style={{ fontFamily: 'var(--font-display), sans-serif', fontWeight: 800, color: 'var(--text-primary)', fontSize: 'var(--fs-lg)' }}>
                      {x.v}
                    </div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: 3 }}>{x.l}</div>
                  </li>
                );
              })}
            </ul>
          </div>
        </Reveal>

        <Reveal dir="from-right" delay={0.1}>
          <Kicker>Manufacturing</Kicker>
          <h2 className="h2">{site.name} ERP for manufacturing</h2>
          <p className="lead" style={{ marginBottom: 26 }}>
            Built around how a plant actually runs — machines, batches, racks and
            inspections — rather than around a chart of accounts.
          </p>
          <ul style={{ display: 'grid', gap: 15 }}>
            {MANUFACTURING.map((t) => <Tick key={t} size={27}>{t}</Tick>)}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

export function Compare() {
  return (
    <section className="band">
      <div className="wrap sec">
        <SectionHead
          kicker="Before & After"
          title="The same plant, six weeks apart"
          lead="Nothing here is exotic. It is the ordinary friction of running a factory on registers and WhatsApp, removed."
        />

        <Reveal>
          <div className="card" style={{ borderRadius: 'var(--radius-2xl)', overflow: 'hidden' }}>
            <div
              className="cmp-head hide-narrow"
              style={{
                padding: '16px 24px',
                background: 'var(--bg-subtle)',
                borderBottom: '1px solid var(--border)',
                fontSize: 'var(--fs-xs)',
                fontWeight: 800,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>What</span>
              <span style={{ color: 'var(--c-red)', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <LuX /> Before
              </span>
              <span style={{ color: 'var(--c-green)', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <LuCheck /> With {site.name}
              </span>
            </div>

            <ul>
              {COMPARE.map((c, i) => (
                <li
                  key={c.what}
                  className="cmp-row"
                  style={{
                    padding: '16px 24px',
                    borderBottom: i < COMPARE.length - 1 ? '1px solid var(--border-light)' : 'none',
                  }}
                >
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--fs-md)' }}>
                    {c.what}
                  </span>
                  <span style={{ display: 'flex', gap: 9, alignItems: 'flex-start', color: 'var(--text-muted)', fontSize: 'var(--fs-md)' }}>
                    <span style={{ color: 'var(--c-red)', display: 'flex', marginTop: 4, fontSize: 11, flexShrink: 0 }}><LuX /></span>
                    {c.before}
                  </span>
                  <span style={{ display: 'flex', gap: 9, alignItems: 'flex-start', color: 'var(--text-secondary)', fontSize: 'var(--fs-md)', fontWeight: 600 }}>
                    <span style={{ color: 'var(--c-green)', display: 'flex', marginTop: 4, fontSize: 11, flexShrink: 0 }}><LuCheck /></span>
                    {c.after}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function Faq() {
  return (
    <section id="faq" className="sec">
      <div className="wrap">
        <SectionHead
          kicker="FAQ"
          title="Questions we are asked before every demo"
          lead="If yours is not here, the form below reaches a person, not a queue."
        />

        {/* Native <details>: no JavaScript, keyboard accessible by default, and
            the answers are in the HTML for both readers and crawlers. */}
        <div className="g g-2" style={{ alignItems: 'start' }}>
          {FAQ.map((f, i) => (
            <Reveal key={f.q} delay={(i % 2) * 0.05}>
              {/* deliberately not an exclusive accordion — the two columns
                  read badly when opening one answer closes another */}
              <details className="faq-item" open={i === 0}>
                <summary>
                  <span>{f.q}</span>
                  <span className="faq-plus" aria-hidden="true"><LuPlus /></span>
                </summary>
                <div className="faq-answer">{f.a}</div>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
