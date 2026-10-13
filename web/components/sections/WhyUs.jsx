import Reveal from '../Reveal';
import { Kicker, SectionHead, Tick, tone } from '../ui';
import { ProductMock } from '../Panels';
import { WHY_US, ROLES } from '@/lib/content';
import { site } from '@/lib/site';

export function WhyUs() {
  return (
    <section id="why-us" className="sec">
      <div className="wrap split">
        <Reveal dir="from-left">
          <Kicker>Why Us</Kicker>
          <h2 className="h2">Why choose {site.name} ERP</h2>

          <p className="lead" style={{ marginBottom: 28 }}>
            Generic ERP asks your factory to change shape. This one already knows what a
            pitch, a bending radius and a GRN are.
          </p>

          <ul style={{ display: 'grid', gap: 15 }}>
            {WHY_US.map((t) => <Tick key={t} solid size={27}>{t}</Tick>)}
          </ul>
        </Reveal>

        <Reveal dir="from-right" delay={0.1}>
          <div className="float-slow"><ProductMock /></div>
        </Reveal>
      </div>
    </section>
  );
}

export function Roles() {
  return (
    <section id="roles" className="band">
      <div className="wrap sec">
        <SectionHead
          kicker="Role Workspaces"
          title="Everyone gets their own screen, not the whole system"
          lead="A guard opens the app and sees gate passes. A checker sees inspections. Nobody scrolls past nine modules to reach the one they need — and nobody sees what they should not."
        />

        <ul className="g g-4 g-roles">
          {ROLES.map((r, i) => {
            const t = tone(r.tone);
            const Icon = r.icon;
            return (
              <Reveal as="li" key={r.title} delay={(i % 4) * 0.04}>
                <div
                  className="role-card"
                  style={{
                    height: '100%',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 18,
                    display: 'flex',
                    gap: 13,
                    alignItems: 'flex-start',
                  }}
                >
                  <span
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 'var(--radius-md)',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: t.bg,
                      color: t.fg,
                      fontSize: '1.05rem',
                    }}
                  >
                    <Icon />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ fontWeight: 700, fontSize: 'var(--fs-md)', marginBottom: 4, letterSpacing: '-0.01em' }}>
                      {r.title}
                    </h3>
                    <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', lineHeight: 1.55 }}>
                      {r.desc}
                    </p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
