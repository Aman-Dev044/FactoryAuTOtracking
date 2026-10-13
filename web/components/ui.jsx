import { LuCheck } from 'react-icons/lu';

/**
 * Shared presentational pieces. None of these hold state, so they compile into
 * whichever bundle imports them — a server section renders them to HTML, a
 * client section can additionally hand them an onClick.
 */

/* -------------------------------------------------------------- button --- */

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  block = false,
  className = '',
  children,
  disabled,
  ...rest
}) {
  const cls = [
    'btn',
    `btn-${variant}`,
    size !== 'md' ? `btn-${size}` : '',
    block ? 'btn-block' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button type="button" className={cls} disabled={disabled || loading} {...rest}>
      {loading ? <span className="spinner-sm" /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  );
}

/** A link styled as a button — used for Sign in, which navigates. */
export function LinkButton({ href, variant = 'secondary', size = 'md', className = '', children, ...rest }) {
  const cls = [
    'btn',
    `btn-${variant}`,
    size !== 'md' ? `btn-${size}` : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <a href={href} className={cls} {...rest}>
      {children}
    </a>
  );
}

/* --------------------------------------------------------------- field --- */

export function Field({ label, required, span, htmlFor, children }) {
  return (
    <div className={`field${span === 'all' ? ' span-all' : ''}`}>
      <label className="field-label" htmlFor={htmlFor}>
        {label}
        {required && <span className="req">*</span>}
      </label>
      {children}
    </div>
  );
}

export function Input(props) {
  return <input className="input" {...props} />;
}

export function Textarea(props) {
  return <textarea className="textarea" {...props} />;
}

/* ------------------------------------------------------------ tone map --- */

/**
 * Maps a tone name onto its foreground and soft background token pair.
 * 'primary' is the brand colour; everything else is one of the --c-* accents.
 */
export function tone(name) {
  return name === 'primary'
    ? { fg: 'var(--primary)', bg: 'var(--primary-soft)' }
    : { fg: `var(--c-${name})`, bg: `var(--c-${name}-soft)` };
}

/* ------------------------------------------------------------- pieces --- */

export function Kicker({ icon: Icon, className = '', children }) {
  return (
    <span className={`kicker ${className}`.trim()}>
      {Icon && <Icon />}
      {children}
    </span>
  );
}

/** Centred heading block used by every full-width section. */
export function SectionHead({ kicker, title, lead, children }) {
  return (
    <div className="sec-head">
      <Kicker>{kicker}</Kicker>
      <h2 className="h2">{title}</h2>
      {lead && <p className="lead">{lead}</p>}
      {children}
    </div>
  );
}

/** A ticked bullet — the one list style used across the page. */
export function Tick({ solid = false, size = 24, children }) {
  return (
    <li style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
      <span
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          flexShrink: 0,
          marginTop: 1,
          background: solid ? 'var(--primary)' : 'var(--primary-soft)',
          color: solid ? 'var(--on-primary)' : 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size > 24 ? 13 : 12,
        }}
      >
        <LuCheck />
      </span>
      <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--fs-md)', lineHeight: 1.58 }}>
        {children}
      </span>
    </li>
  );
}

/** Round icon chip in a tone. */
export function IconChip({ icon: Icon, tone: t, size = 46, radius = '50%', fontSize = '1.25rem' }) {
  return (
    <span
      className="chip-icon"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: t.bg,
        color: t.fg,
        fontSize,
      }}
    >
      <Icon />
    </span>
  );
}

/** Small tone-coloured tick used inside dense card bullet lists. */
export function MiniPoints({ points, fg }) {
  return (
    <ul style={{ display: 'grid', gap: 8 }}>
      {points.map((p) => (
        <li key={p} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
          <span style={{ color: fg, display: 'flex', marginTop: 4, fontSize: 11, flexShrink: 0 }}>
            <LuCheck />
          </span>
          <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--fs-sm)', lineHeight: 1.52 }}>
            {p}
          </span>
        </li>
      ))}
    </ul>
  );
}
