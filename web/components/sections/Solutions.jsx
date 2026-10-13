import Reveal from '../Reveal';
import { SectionHead, IconChip, MiniPoints, tone } from '../ui';
import { SOLUTIONS } from '@/lib/content';

export default function Solutions() {
  return (
    <section id="solution" className="sec">
      <div className="wrap">
        <SectionHead
          kicker="What We Do"
          title="One platform for the whole operation"
          lead="Each module is built for the people who actually use it — and they all share the same data, so nobody reconciles spreadsheets at the end of the day."
        />

        <ul className="g g-4">
          {SOLUTIONS.map((s, i) => {
            const t = tone(s.tone);
            return (
              <Reveal as="li" key={s.title} delay={i * 0.07}>
                <article
                  className="card lift mod-card"
                  style={{ height: '100%', padding: 26, display: 'flex', flexDirection: 'column', '--tone': t.fg }}
                >
                  <IconChip icon={s.icon} tone={t} size={50} radius="var(--radius-lg)" fontSize="1.35rem" />

                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '18px 0 9px', letterSpacing: '-0.02em' }}>
                    {s.title}
                  </h3>

                  <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-md)', lineHeight: 1.62, marginBottom: 16 }}>
                    {s.desc}
                  </p>

                  <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--border-light)' }}>
                    <MiniPoints points={s.points} fg={t.fg} />
                  </div>
                </article>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
