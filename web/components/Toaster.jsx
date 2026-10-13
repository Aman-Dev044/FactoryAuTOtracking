'use client';

import { useEffect, useState } from 'react';
import { LuCircleCheck, LuCircleAlert } from 'react-icons/lu';
import { TOAST_EVENT } from '@/lib/demo';

/**
 * A three-line toast stack. Mounted once in the layout; any component raises
 * one by calling toast() from lib/demo, so no provider has to wrap the tree.
 */
export default function Toaster() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let id = 0;

    const onToast = (e) => {
      const entry = { id: ++id, ...e.detail };
      setItems((prev) => [...prev, entry]);
      setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== entry.id));
      }, 4500);
    };

    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  // The live region stays mounted even when empty — a screen reader only
  // announces additions to a region that already existed.
  return (
    <div className="toast-wrap" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`}>
          <span className="toast-ico">
            {t.kind === 'err' ? <LuCircleAlert /> : <LuCircleCheck />}
          </span>
          {t.message}
        </div>
      ))}
    </div>
  );
}
