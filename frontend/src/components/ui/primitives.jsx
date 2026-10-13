import React from 'react';
import { LuChevronLeft, LuChevronRight, LuInbox } from 'react-icons/lu';

/* ------------------------------------------------------------------ Button */
export const Button = ({
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
}) => (
  <button
    type="button"
    className={`btn btn-${variant}${size !== 'md' ? ` btn-${size}` : ''}${block ? ' btn-block' : ''} ${className}`.trim()}
    disabled={disabled || loading}
    {...rest}
  >
    {loading ? <span className="spinner-sm" /> : icon}
    {children}
    {!loading && iconRight}
  </button>
);

/* ------------------------------------------------------------------- Badge */
/** tone: neutral | success | warning | danger | info | running */
export const Badge = ({ tone = 'neutral', icon, className = '', children }) => (
  <span className={`badge ${tone === 'neutral' ? '' : tone} ${className}`.trim()}>
    {icon}
    {children}
  </span>
);

/* ---------------------------------------------------------------- Skeleton */
export const Skeleton = ({ w = '100%', h = 12, radius, style, className = '' }) => (
  <div
    className={`skeleton ${className}`.trim()}
    style={{ width: w, height: h, borderRadius: radius, ...style }}
  />
);

/** Placeholder rows that mirror the grid while data loads. */
export const SkeletonRows = ({ rows = 6, cols = 5 }) => (
  <tbody>
    {Array.from({ length: rows }).map((_, r) => (
      <tr key={r}>
        {Array.from({ length: cols }).map((__, c) => (
          <td key={c}>
            <Skeleton h={10} w={c === 0 ? '62%' : '44%'} />
          </td>
        ))}
      </tr>
    ))}
  </tbody>
);

/* -------------------------------------------------------------- EmptyState */
export const EmptyState = ({ icon, title = 'Nothing here yet', text, action }) => (
  <div className="empty">
    <div className="empty-icon">{icon || <LuInbox />}</div>
    <div className="empty-title">{title}</div>
    {text && <p className="empty-text">{text}</p>}
    {action}
  </div>
);

/* -------------------------------------------------------------------- Tabs */
/** items: [{ key, label, icon?, count? }] */
export const Tabs = ({ items = [], value, onChange, className = '' }) => (
  <div className={`tabs ${className}`.trim()} role="tablist">
    {items.map((t) => (
      <button
        key={t.key}
        role="tab"
        aria-selected={value === t.key}
        className={`tab${value === t.key ? ' active' : ''}`}
        onClick={() => onChange && onChange(t.key)}
      >
        {t.icon}
        {t.label}
        {t.count !== undefined && t.count !== null && (
          <span className="tab-count">{t.count}</span>
        )}
      </button>
    ))}
  </div>
);

/* ------------------------------------------------------------------- Pager */
/** Windowed pagination: first, last, and a run around the current page. */
export const Pager = ({ page = 1, pageCount = 1, onChange }) => {
  if (pageCount <= 1) return null;

  const go = (p) => onChange && onChange(Math.min(Math.max(p, 1), pageCount));

  const pages = [];
  const push = (p) => { if (!pages.includes(p)) pages.push(p); };
  push(1);
  for (let p = page - 1; p <= page + 1; p++) if (p > 1 && p < pageCount) push(p);
  push(pageCount);
  pages.sort((a, b) => a - b);

  const out = [];
  let prev = 0;
  for (const p of pages) {
    if (p - prev > 1) out.push('gap-' + p);
    out.push(p);
    prev = p;
  }

  return (
    <div className="pager">
      <button onClick={() => go(page - 1)} disabled={page <= 1} aria-label="Previous page">
        <LuChevronLeft />
      </button>
      {out.map((p) =>
        typeof p === 'string' ? (
          <span key={p} style={{ padding: '0 3px', color: 'var(--text-ghost)' }}>…</span>
        ) : (
          <button key={p} className={p === page ? 'active' : ''} onClick={() => go(p)}>
            {p}
          </button>
        )
      )}
      <button onClick={() => go(page + 1)} disabled={page >= pageCount} aria-label="Next page">
        <LuChevronRight />
      </button>
    </div>
  );
};
