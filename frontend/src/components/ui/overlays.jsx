import React from 'react';
import { LuX } from 'react-icons/lu';

/** Close on Escape and lock body scroll while an overlay is open. */
const useOverlay = (open, onClose) => {
  React.useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose && onClose(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);
};

/* ------------------------------------------------------------------ Drawer */
/** Right-side record detail. Preferred over a dialog for inspecting a row. */
export const Drawer = ({ open, onClose, title, subtitle, wide, footer, children }) => {
  useOverlay(open, onClose);
  if (!open) return null;

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className={`drawer${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : 'Details'}>
        <div className="drawer-head">
          <div style={{ minWidth: 0 }}>
            <h3>{title}</h3>
            {subtitle && <div className="drawer-sub">{subtitle}</div>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <LuX />
          </button>
        </div>
        <div className="drawer-body">{children}</div>
        {footer && <div className="drawer-foot">{footer}</div>}
      </aside>
    </>
  );
};

/* ------------------------------------------------------------------ Dialog */
/** size: sm | md | lg | xl */
export const Dialog = ({ open, onClose, title, subtitle, size = 'md', footer, children }) => {
  useOverlay(open, onClose);
  if (!open) return null;

  return (
    <div
      className="dialog-scrim"
      onClick={(e) => e.target === e.currentTarget && onClose && onClose()}
    >
      <div
        className={`dialog${size !== 'md' ? ` ${size}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Dialog'}
      >
        <div className="dialog-head">
          <div style={{ minWidth: 0 }}>
            <h3>{title}</h3>
            {subtitle && <div className="dialog-sub">{subtitle}</div>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <LuX />
          </button>
        </div>
        <div className="dialog-body">{children}</div>
        {footer && <div className="dialog-foot">{footer}</div>}
      </div>
    </div>
  );
};

/** Dialog preset for destructive confirmations. */
export const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  text,
  confirmLabel = 'Confirm',
  tone = 'danger',
  loading,
}) => (
  <Dialog
    open={open}
    onClose={onClose}
    title={title}
    size="sm"
    footer={
      <>
        <button className="btn btn-cancel" onClick={onClose}>Cancel</button>
        <button className={`btn btn-${tone}`} onClick={onConfirm} disabled={loading}>
          {loading ? <span className="spinner-sm" /> : null}
          {confirmLabel}
        </button>
      </>
    }
  >
    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--fs-base)', lineHeight: 1.6 }}>
      {text}
    </p>
  </Dialog>
);
