import Reveal from '../Reveal';
import { Kicker, SectionHead, Tick } from '../ui';
import { Spotlights } from '../Backdrop';
import { PANELS } from '../Panels';
import { DEEP_DIVE } from '@/lib/content';

export default function DeepDive() {
  return (
    <section className="band" style={{ position: 'relative', isolation: 'isolate' }}>
      <Spotlights
        items={[
          { size: 480, top: '4%', right: '-8%', color: 'var(--c-cyan)', strength: 18 },
          { size: 420, bottom: '6%', left: '-8%', color: 'var(--c-amber)', strength: 16 },
        ]}
      />

      <div className="wrap sec">
        <SectionHead
          kicker="In Detail"
          title="Three things you will feel in week one"
          lead="Small pieces of the product, shown rather than described."
        />

        <div style={{ display: 'grid', gap: 'clamp(48px, 6vw, 90px)' }}>
          {DEEP_DIVE.map((d, i) => {
            const Panel = PANELS[d.panel];
            const flip = i % 2 === 1;

            return (
              <div key={d.title} className={`split${flip ? ' split-flip' : ''}`}>
                <Reveal dir={flip ? 'from-right' : 'from-left'}>
                  <Kicker>{d.kicker}</Kicker>
                  <h3 className="h3">{d.title}</h3>
                  <p className="lead" style={{ marginBottom: 24, fontSize: 'var(--fs-md)' }}>{d.lead}</p>
                  <ul style={{ display: 'grid', gap: 13 }}>
                    {d.points.map((p) => <Tick key={p}>{p}</Tick>)}
                  </ul>
                </Reveal>

                <Reveal dir={flip ? 'from-left' : 'from-right'} delay={0.1}>
                  <Panel />
                </Reveal>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
