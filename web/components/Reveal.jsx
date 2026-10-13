'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Fades content in as it scrolls into view.
 *
 * The markup is rendered on the server either way — only the `shown` class is
 * added in the browser — so a crawler receives the full HTML regardless. If
 * IntersectionObserver is missing the element starts visible, so copy can
 * never be stranded hidden.
 */
export default function Reveal({
  children,
  dir = '',
  delay = 0,
  as: Tag = 'div',
  className = '',
  style,
  ...rest
}) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return undefined;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`reveal ${dir} ${shown ? 'shown' : ''} ${className}`.replace(/\s+/g, ' ').trim()}
      // caller styles are merged in, not spread over the delay variable
      style={{ '--reveal-delay': `${delay}s`, ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
