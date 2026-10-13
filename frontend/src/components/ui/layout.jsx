import React from 'react';

/* -------------------------------------------------------------------- Page */
export const Page = ({ children, className = '' }) => (
  <div className={`page ${className}`.trim()}>{children}</div>
);

/** Page title block with optional subtitle and right-aligned actions. */
export const PageHeader = ({ title, subtitle, actions, children }) => (
  <div className="page-head">
    <div style={{ minWidth: 0 }}>
      <h1 className="page-title">{title}</h1>
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
      {children}
    </div>
    {actions && <div className="page-actions">{actions}</div>}
  </div>
);

/* ----------------------------------------------------------------- Section */
export const Section = ({ title, actions, children, className = '' }) => (
  <section className={`section ${className}`.trim()}>
    {(title || actions) && (
      <div className="section-head">
        {title ? <h3>{title}</h3> : <span />}
        {actions}
      </div>
    )}
    {children}
  </section>
);

/* ----------------------------------------------------------------- Surface */
export const Surface = ({ pad = true, className = '', style, children }) => (
  <div className={`surface${pad ? ' surface-pad' : ''} ${className}`.trim()} style={style}>
    {children}
  </div>
);

/* --------------------------------------------------------------- StatTiles */
export const StatRow = ({ children, className = '' }) => (
  <div className={`stat-row ${className}`.trim()}>{children}</div>
);

/**
 * tone drives the icon chip colour and maps to the --c-* token family.
 * delta: { value: string, dir: 'up' | 'down' | 'flat' }
 */
export const StatTile = ({ label, value, icon, tone = 'primary', delta, hint, onClick }) => {
  const toneVar =
    tone === 'primary'
      ? { bg: 'var(--primary-soft)', fg: 'var(--primary)' }
      : { bg: `var(--c-${tone}-soft)`, fg: `var(--c-${tone})` };

  return (
    <div
      className="tile"
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      <div className="tile-top">
        {icon && (
          <span className="tile-icon" style={{ background: toneVar.bg, color: toneVar.fg }}>
            {icon}
          </span>
        )}
        <span className="tile-label">{label}</span>
      </div>
      <div className="tile-value">{value}</div>
      {delta && (
        <div className={`tile-delta ${delta.dir || 'flat'}`}>
          {delta.dir === 'up' ? '▲' : delta.dir === 'down' ? '▼' : '—'} {delta.value}
        </div>
      )}
      {hint && !delta && (
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-ghost)', marginTop: 4 }}>
          {hint}
        </div>
      )}
    </div>
  );
};

/* --------------------------------------------------------------- FormGrid */
export const FormGrid = ({ children, className = '', style }) => (
  <div className={`form-grid ${className}`.trim()} style={style}>{children}</div>
);

/** Label/value pairs, used inside drawers and detail panes. */
export const DescList = ({ items = [], className = '' }) => (
  <dl className={`dl ${className}`.trim()}>
    {items
      .filter((i) => i && i.value !== undefined && i.value !== null && i.value !== '')
      .map((i, idx) => (
        <React.Fragment key={i.label || idx}>
          <dt>{i.label}</dt>
          <dd>{i.value}</dd>
        </React.Fragment>
      ))}
  </dl>
);
