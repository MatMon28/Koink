import { createLucideIcon } from 'lucide-react';

/**
 * The Koink pig as a line icon: the logo's pig (src/brand/art.js: round head, two open triangle ears,
 * two dot eyes, an outlined snout with two nostrils) simplified for 24 px. It takes the same props as a
 * Lucide icon (`size`, `strokeWidth`, `className`...), so it can replace `PiggyBank` anywhere.
 *
 * Coordinates are the logo's, mapped into a 24 x 24 box: x' = (x - 682.6) * 0.0575 + 12 and
 * y' = (y - 617.5) * 0.0575 + 12. The coin of the logo is left out.
 */
export const PigIcon = createLucideIcon('koink-pig', [
  ['circle', { cx: '12', cy: '13.64', r: '7.46', key: 'head' }],
  ['path', { d: 'M5.47 10.04 5.95 2.93 9.3 6.69', key: 'ear-l' }],
  ['path', { d: 'M18.53 10.04 18.05 2.93 14.7 6.69', key: 'ear-r' }],
  ['ellipse', { cx: '12', cy: '16.43', rx: '3.26', ry: '2.33', key: 'snout' }],
  ['path', { d: 'M9.21 12.26h.01M14.79 12.26h.01', strokeWidth: '2.4', key: 'eyes' }],
  ['path', { d: 'M10.7 16.43h.01M13.3 16.43h.01', strokeWidth: '1.6', key: 'nostrils' }],
]);
