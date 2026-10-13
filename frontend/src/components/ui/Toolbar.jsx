import React from 'react';
import { LuSearch, LuX, LuRows2, LuRows3, LuRows4 } from 'react-icons/lu';

/* ----------------------------------------------------------------- Toolbar */
export const Toolbar = ({ children, className = '' }) => (
  <div className={`toolbar ${className}`.trim()}>{children}</div>
);

export const ToolbarSpacer = () => <div className="toolbar-spacer" />;

/* ------------------------------------------------------------- SearchInput */
export const SearchInput = ({
  value,
  onChange,
  placeholder = 'Search…',
  autoFocus,
  className = '',
}) => (
  <div className={`toolbar-search ${className}`.trim()}>
    <span className="search-icon"><LuSearch /></span>
    <input
      type="text"
      value={value}
      autoFocus={autoFocus}
      placeholder={placeholder}
      onChange={(e) => onChange && onChange(e.target.value)}
      aria-label={placeholder}
    />
    {value && (
      <button className="clear-btn" onClick={() => onChange && onChange('')} aria-label="Clear search">
        <LuX />
      </button>
    )}
  </div>
);

/* -------------------------------------------------------------------- Chip */
export const Chip = ({ active, count, icon, onClick, children }) => (
  <button className={`chip${active ? ' active' : ''}`} onClick={onClick}>
    {icon}
    {children}
    {count !== undefined && count !== null && <span className="chip-count">{count}</span>}
  </button>
);

/** items: [{ key, label, count? }] — single-select filter row. */
export const ChipGroup = ({ items = [], value, onChange }) => (
  <div className="chip-group">
    {items.map((it) => (
      <Chip
        key={it.key}
        active={value === it.key}
        count={it.count}
        onClick={() => onChange && onChange(it.key)}
      >
        {it.label}
      </Chip>
    ))}
  </div>
);

/* ----------------------------------------------------------- DensitySwitch */
const DENSITIES = [
  { key: 'compact', icon: <LuRows4 />, label: 'Compact rows' },
  { key: 'normal', icon: <LuRows3 />, label: 'Normal rows' },
  { key: 'comfortable', icon: <LuRows2 />, label: 'Comfortable rows' },
];

/**
 * Writes `data-density` on <html>; the token layer reads it to set --row-height.
 * The choice is remembered per browser.
 */
export const DensitySwitch = () => {
  const [density, setDensity] = React.useState(() => {
    try {
      return localStorage.getItem('trackbells-density') || 'normal';
    } catch (_) {
      return 'normal';
    }
  });

  React.useEffect(() => {
    document.documentElement.setAttribute('data-density', density);
    try {
      localStorage.setItem('trackbells-density', density);
    } catch (_) {
      /* storage blocked — still applies for this session */
    }
  }, [density]);

  return (
    <div className="density-switch" role="group" aria-label="Row density">
      {DENSITIES.map((d) => (
        <button
          key={d.key}
          className={density === d.key ? 'active' : ''}
          onClick={() => setDensity(d.key)}
          title={d.label}
          aria-label={d.label}
          aria-pressed={density === d.key}
        >
          {d.icon}
        </button>
      ))}
    </div>
  );
};
