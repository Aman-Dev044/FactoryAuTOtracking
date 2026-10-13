'use client';

import { Button } from './ui';
import { openDemo } from '@/lib/demo';

/**
 * Any button that opens the demo dialog. Keeping it in one tiny client
 * component means the sections around it can stay server components and ship
 * no JavaScript of their own.
 */
export default function DemoButton({ children = 'Register for Demo', ...rest }) {
  return (
    <Button onClick={openDemo} {...rest}>
      {children}
    </Button>
  );
}
