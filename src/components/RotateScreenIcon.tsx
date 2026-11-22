import type { SVGProps } from 'react';

/**
 * "Turn the device sideways": a phone with an arrow bending over it. It replaces Lucide's RotateCw in the
 * chart's full view, which looked like reload / reset (and the chart now has a real reset button).
 * Drawn like the Lucide icons (24 px box, 2 px round strokes, `currentColor`).
 */
export function RotateScreenIcon({ size = 16, strokeWidth = 2, ...rest }: { size?: number; strokeWidth?: number } & Omit<SVGProps<SVGSVGElement>, 'width' | 'height' | 'strokeWidth'>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {/* the phone, upright, with its speaker line */}
      <rect x="3" y="9" width="10" height="13" rx="2" />
      <path d="M7 19.5h2" />
      {/* the arrow over it: a quarter turn, clockwise */}
      <path d="M14 5a7 7 0 0 1 7 7" />
      <path d="m18.5 9.5 2.5 2.5 2.5-2.5" />
    </svg>
  );
}
