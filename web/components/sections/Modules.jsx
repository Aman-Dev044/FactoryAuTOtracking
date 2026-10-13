import { LuArrowUpRight } from 'react-icons/lu';
import Reveal from '../Reveal';
import DemoButton from '../DemoButton';
import { SectionHead, IconChip, MiniPoints, tone } from '../ui';
import { Spotlights } from '../Backdrop';
import { MODULES } from '@/lib/content';

export default function Modules() {
  return (
    <section id="modules" className="band" style={{ position: 'relative', isolation: 'isolate' }}>
      <Spotlights
        items={[
          { size: 460, top: '6%', left: '-8%', color: 'var(--c-violet)', strength: 18 },
          { size: 400, bottom: '2%', right: '-6%', color: 'var(--primary)', strength: 18 },
        ]}
      />

      <div className="wrap sec">
        <SectionHead
          kicker="Modules"
          title="Twelve modules, one shared record"
          lead="Turn on what your plant needs and leave the rest off. Whatever is on reads and writes the same data — so a gate entry becomes stock, and stock becomes an invoice, without anyone re-typing it."
        />

        <ul className="g g-4">
          {MODULES.map((m, i) => {
            const t = tone(m.tone);
            return (
              <Reveal as="li" key={m.title} delay={(i % 4) * 0.05}>
                <article
                  className="card lift mod-card"
                  style={{ height: '100%', padding: '24px 22px', '--tone': t.fg }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 14 }}>
                    <IconChip icon={m.icon} tone={t} size={44} radius="var(--radius-lg)" fontSize="1.2rem" />
                    <h3 style={{ fontSize: '1.08rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.25 }}>
                      {m.title}
                    </h3>
                  </div>

                  <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', lineHeight: 1.6, marginBottom: 16 }}>
                    {m.desc}
                  </p>

                  <MiniPoints points={m.points} fg={t.fg} />
                </article>
              </Reveal>
            );
          })}
        </ul>

        <Reveal style={{ textAlign: 'center', marginTop: 40 }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-md)', marginBottom: 16 }}>
            Need a module that is not on this list? The Domain Builder adds it without a code change.
          </p>
          <DemoButton variant="primary" size="lg" iconRight={<LuArrowUpRight />}>
            Talk to us about your modules
          </DemoButton>
        </Reveal>
      </div>
    </section>
  );
}
