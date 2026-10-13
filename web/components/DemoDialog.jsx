'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { LuX } from 'react-icons/lu';
import EnquiryForm from './EnquiryForm';
import { Button } from './ui';
import { DEMO_EVENT } from '@/lib/demo';

/**
 * The "Register for a Demo" dialog.
 *
 * Mounted once in the layout and opened by the DEMO_EVENT that openDemo()
 * raises, so any button on the page can trigger it. Escape and a backdrop
 * click close it, focus moves in on open and returns to the trigger on close,
 * and the page behind it is locked from scrolling.
 */
export default function DemoDialog() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const returnTo = useRef(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onOpen = () => {
      returnTo.current = document.activeElement;
      setOpen(true);
    };
    window.addEventListener(DEMO_EVENT, onOpen);
    return () => window.removeEventListener(DEMO_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) {
      // hand focus back to whatever opened the dialog
      if (returnTo.current instanceof HTMLElement) returnTo.current.focus();
      return undefined;
    }

    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);

    // move focus into the panel so a keyboard visitor lands inside it
    panelRef.current?.querySelector('input, textarea, button')?.focus();

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  if (!open) return null;

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-dialog-title"
        ref={panelRef}
      >
        <div className="dialog-head">
          <div>
            <h2 id="demo-dialog-title" style={{ fontSize: '1.3rem', marginBottom: 4 }}>
              Register for a Demo
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-md)' }}>
              Tell us about your plant and we will get back to you.
            </p>
          </div>
          <button type="button" className="dialog-close" onClick={close} aria-label="Close dialog">
            <LuX />
          </button>
        </div>

        {/* The submit button stays inside the form rather than in a footer, so
            it owns the loading state instead of mirroring it across elements. */}
        <div className="dialog-body">
          <EnquiryForm id="demo-dialog-form" onDone={close} submitLabel="Submit request" />
        </div>

        <div className="dialog-foot">
          <Button variant="ghost" onClick={close}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}
