import React from 'react';
import { LuSearch, LuCornerDownLeft } from 'react-icons/lu';

/**
 * ⌘K / Ctrl-K launcher.
 *
 * commands: [{ key, label, group, icon?, hint?, run: () => void }]
 * Matching is a simple subsequence test, so "stinv" finds "Store › Inventory".
 */
const matches = (needle, haystack) => {
  if (!needle) return true;
  const n = needle.toLowerCase().replace(/\s+/g, '');
  const h = haystack.toLowerCase();
  let i = 0;
  for (const ch of h) {
    if (ch === n[i]) i++;
    if (i === n.length) return true;
  }
  return false;
};

export const CommandPalette = ({ open, onClose, commands = [] }) => {
  const [query, setQuery] = React.useState('');
  const [cursor, setCursor] = React.useState(0);
  const listRef = React.useRef(null);

  React.useEffect(() => {
    if (open) { setQuery(''); setCursor(0); }
  }, [open]);

  const results = React.useMemo(
    () => commands.filter((c) => matches(query, `${c.group || ''} ${c.label}`)),
    [commands, query]
  );

  React.useEffect(() => { setCursor(0); }, [query]);

  // Keep the highlighted row in view while arrowing through a long list.
  React.useEffect(() => {
    const el = listRef.current?.querySelector('.cmdk-item.active');
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  React.useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCursor((c) => Math.min(c + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCursor((c) => Math.max(c - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const hit = results[cursor];
        if (hit) { onClose(); hit.run(); }
      }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, results, cursor, onClose]);

  if (!open) return null;

  // Preserve the order groups first appear in, rather than sorting them.
  const groups = [];
  for (const r of results) {
    const g = r.group || 'Actions';
    let bucket = groups.find((x) => x.name === g);
    if (!bucket) { bucket = { name: g, items: [] }; groups.push(bucket); }
    bucket.items.push(r);
  }

  let flat = -1;

  return (
    <div className="cmdk-scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cmdk" role="dialog" aria-modal="true" aria-label="Command palette">
        <div className="cmdk-input-row">
          <span className="cmdk-icon"><LuSearch /></span>
          <input
            autoFocus
            value={query}
            placeholder="Jump to a screen or run an action…"
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search commands"
          />
        </div>

        <div className="cmdk-list" ref={listRef}>
          {results.length === 0 && (
            <div style={{ padding: '26px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>
              No matches for “{query}”
            </div>
          )}

          {groups.map((g) => (
            <div key={g.name}>
              <div className="cmdk-group-title">{g.name}</div>
              {g.items.map((item) => {
                flat += 1;
                const idx = flat;
                return (
                  <button
                    key={item.key}
                    className={`cmdk-item${idx === cursor ? ' active' : ''}`}
                    onMouseEnter={() => setCursor(idx)}
                    onClick={() => { onClose(); item.run(); }}
                  >
                    {item.icon && <span className="cmdk-item-icon">{item.icon}</span>}
                    <span>{item.label}</span>
                    {item.hint && <span className="cmdk-item-hint">{item.hint}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="cmdk-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd><LuCornerDownLeft style={{ verticalAlign: '-1px' }} /></kbd> open</span>
          <span><kbd>esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
};

/** Opens on ⌘K / Ctrl-K anywhere except while typing in a field. */
export const useCommandPalette = () => {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        const t = e.target;
        const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
        if (typing && !open) return;
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return { open, setOpen };
};
