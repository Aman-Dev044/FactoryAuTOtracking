/**
 * The page backdrop.
 *
 * Four layers, all decorative and all pointer-events:none:
 *
 *   1. mesh   — a drifting aurora of brand-coloured radial gradients, fixed to
 *               the viewport so it costs nothing on scroll
 *   2. grid   — a fine engineering rule, masked away towards the edges
 *   3. grain  — film noise, which stops the wide gradients banding
 *   4. ribbons— flowing strokes at full document height, so they scroll with
 *               the page and give the fixed layers something to move against
 */

/** Fixed layers: aurora, rule and grain. Rendered once, near the top of body. */
export function BackdropLayers() {
  return (
    <div className="backdrop" aria-hidden="true">
      <div className="backdrop-mesh" />
      <div className="backdrop-grid" />
      <div className="backdrop-grain" />
    </div>
  );
}

/**
 * Ribbons stretched over the full document height.
 *
 * The viewBox is tall and `preserveAspectRatio="none"` stretches it to
 * whatever the page turns out to be. That would squash the stroke too, so
 * every path carries `vector-effect="non-scaling-stroke"` to keep an even
 * width at any page length.
 */
export function Ribbons() {
  const paths = [
    { d: 'M1180 -40 C 820 420, 1180 900, 840 1380 C 520 1840, 1080 2260, 820 2760 C 600 3180, 1060 3500, 900 4040', stroke: 'var(--c-cyan)', w: 160, o: 0.12 },
    { d: 'M1320 140 C 980 620, 1300 1060, 980 1560 C 700 2000, 1220 2420, 960 2920 C 760 3320, 1180 3640, 1040 4060', stroke: 'var(--c-pink)', w: 120, o: 0.09 },
    { d: 'M-120 -60 C 240 400, -80 880, 300 1340 C 620 1760, 60 2220, 340 2700 C 560 3100, 100 3460, 260 4040', stroke: 'var(--primary)', w: 140, o: 0.11 },
    { d: 'M-260 220 C 120 700, -180 1120, 200 1600 C 500 2000, -60 2440, 220 2900 C 420 3260, 40 3620, 180 4060', stroke: 'var(--c-green)', w: 100, o: 0.09 },
    { d: 'M600 -80 C 760 480, 420 960, 640 1460 C 860 1940, 380 2380, 620 2880 C 800 3280, 460 3640, 600 4060', stroke: 'var(--c-violet)', w: 80, o: 0.07 },
  ];

  return (
    <div className="ribbons" aria-hidden="true">
      <svg viewBox="0 0 1200 4000" preserveAspectRatio="none" fill="none">
        {paths.map((p, i) => (
          <path
            key={i}
            d={p.d}
            stroke={p.stroke}
            strokeWidth={p.w}
            strokeOpacity={p.o}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    </div>
  );
}

/** Soft coloured glows placed behind one section. */
export function Spotlights({ items }) {
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: -1, overflow: 'hidden' }}>
      {items.map((s, i) => (
        <span
          key={i}
          className={`spotlight${i === 1 ? ' s2' : i === 2 ? ' s3' : ''}`}
          style={{
            width: s.size,
            height: s.size,
            top: s.top,
            bottom: s.bottom,
            left: s.left,
            right: s.right,
            background: `color-mix(in srgb, ${s.color} ${s.strength || 22}%, transparent)`,
          }}
        />
      ))}
    </div>
  );
}

/** Confetti dots over the hero, echoing the brand site accents. */
export function Specks() {
  const dots = [
    { t: '12%', l: '7%', s: 9, c: 'var(--primary)', d: '0s' },
    { t: '24%', l: '93%', s: 7, c: 'var(--c-cyan)', d: '1.2s' },
    { t: '66%', l: '4%', s: 11, c: 'var(--c-amber)', d: '2.1s' },
    { t: '80%', l: '90%', s: 8, c: 'var(--c-green)', d: '0.6s' },
    { t: '44%', l: '47%', s: 6, c: 'var(--c-pink)', d: '1.8s' },
    { t: '8%', l: '62%', s: 6, c: 'var(--c-violet)', d: '2.6s' },
  ];

  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: -1, overflow: 'hidden' }}>
      {dots.map((d, i) => (
        <span
          key={i}
          className="speck"
          style={{
            top: d.t,
            left: d.l,
            width: d.s,
            height: d.s,
            background: d.c,
            opacity: 0.5,
            animationDelay: d.d,
          }}
        />
      ))}
    </div>
  );
}
