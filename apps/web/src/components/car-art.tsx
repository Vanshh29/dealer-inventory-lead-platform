import { useId } from 'react';
import type { BodyType } from '@/lib/body-type';

type Shape = {
  body: string;
  windows: string[];
  pillars: number[];
  rails?: string;
  cladding?: string;
};

const SHAPES: Record<BodyType, Shape> = {
  hatch: {
    body: 'M38 214c0-17 12-27 34-31l36-52c8-11 18-17 32-17h96c15 0 27 7 36 20l30 47c26 4 42 15 42 33v14H38v-14Z',
    windows: [
      'M122 176l26-42c4-6 9-9 16-9h38v51H122Z',
      'M210 125h30c8 0 14 3 19 10l22 41h-71v-51Z',
    ],
    pillars: [205],
  },
  sedan: {
    body: 'M38 214c0-12 6-22 22-26l60-6 24-44c4-6 10-9 18-9h90c10 0 18 4 24 11l34 40 46 10c14 3 22 12 22 24v14H38v-14Z',
    windows: ['M132 176l20-36c3-5 7-7 12-7h36v43z', 'M208 133h42c7 0 12 3 16 8l24 35h-82z'],
    pillars: [204],
  },
  wagon: {
    body: 'M38 214c0-12 6-22 22-26l12-46c1-7 7-12 14-12h166c10 0 18 4 24 11l34 39 46 10c14 3 22 12 22 24v14H38v-14Z',
    windows: [
      'M90 176l-4-38c0-3 2-5 5-5h54v43z',
      'M152 133h50v43h-50z',
      'M209 133h41c7 0 12 3 16 8l24 35h-81z',
    ],
    pillars: [148, 205],
    rails: 'M90 125h160',
  },
  suv: {
    body: 'M38 212c0-14 8-24 24-27l8-60c1-8 8-14 16-14h166c9 0 17 5 22 12l32 52c24 3 56 12 56 32v21H38v-16Z',
    windows: [
      'M80 175l6-50c0-4 3-7 7-7h46v57z',
      'M146 118h56v57h-56z',
      'M209 118h40c6 0 10 3 13 7l26 50h-79z',
    ],
    pillars: [142, 205],
    rails: 'M92 106h158',
    cladding: 'M38 212h324v16H38z',
  },
};

const BODY: Record<string, string> = {
  black: '#1f2937',
  white: '#f1f5f9',
  silver: '#cbd5e1',
  grey: '#94a3b8',
  gray: '#94a3b8',
  blue: '#2563eb',
  red: '#dc2626',
  green: '#16a34a',
  yellow: '#facc15',
  orange: '#f97316',
  brown: '#92400e',
  beige: '#e7d9bd',
  gold: '#d4a017',
  purple: '#7c3aed',
};

const BACKDROPS: [string, string][] = [
  ['#e0e7ff', '#f8fafc'],
  ['#dbeafe', '#f0fdfa'],
  ['#ede9fe', '#f8fafc'],
  ['#e2e8f0', '#fff7ed'],
  ['#cffafe', '#f8fafc'],
];

const hash = (s: string): number => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

const bodyColour = (colour: string | null | undefined): string => {
  const key = (colour ?? '').toLowerCase();
  const hit = Object.keys(BODY).find((k) => key.includes(k));
  return hit ? BODY[hit] : '#64748b';
};

/**
 * A drawn car used wherever a vehicle has no real photo (the seeded demo data only has grey
 * placeholder links). The body takes the vehicle's colour; the backdrop varies per vehicle so
 * a grid of cars does not look like one repeated tile.
 */
export function CarArt({
  seed,
  colour,
  label,
  body: bodyType = 'hatch',
  className = 'h-full w-full',
}: {
  seed: string;
  body?: BodyType;
  colour?: string | null;
  label: string;
  className?: string;
}) {
  const uid = useId().replace(/:/g, '');
  const [from, to] = BACKDROPS[hash(seed) % BACKDROPS.length];
  const paint = bodyColour(colour);
  const dark = paint === '#1f2937';
  const shape = SHAPES[bodyType];
  return (
    <svg
      viewBox="0 0 400 300"
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      preserveAspectRatio="xMidYMid slice"
      className={className}
    >
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
        <linearGradient id={`${uid}-sheen`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.28" />
        </linearGradient>
        <linearGradient id={`${uid}-glass`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e0f2fe" />
          <stop offset="1" stopColor="#7dd3fc" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#${uid}-bg)`} />
      <rect y="232" width="400" height="68" fill="#0f172a" opacity="0.06" />
      <ellipse cx="200" cy="246" rx="162" ry="10" fill="#0f172a" opacity="0.18" />
      <path d={shape.body} fill={paint} />
      <path d={shape.body} fill={`url(#${uid}-sheen)`} />
      {shape.cladding && <path d={shape.cladding} fill="#0f172a" opacity="0.28" />}
      {shape.rails && (
        <path
          d={shape.rails}
          stroke="#0f172a"
          strokeOpacity="0.45"
          strokeWidth="4"
          strokeLinecap="round"
        />
      )}
      {shape.windows.map((d) => (
        <path key={d} d={d} fill={`url(#${uid}-glass)`} />
      ))}
      {shape.pillars.map((x) => (
        <path
          key={x}
          d={`M${x} 118v58`}
          stroke={dark ? '#475569' : '#0f172a'}
          strokeOpacity="0.35"
          strokeWidth="3"
        />
      ))}
      <rect x="338" y="190" width="22" height="9" rx="4" fill="#fef9c3" />
      <rect x="40" y="192" width="14" height="8" rx="3" fill="#ef4444" opacity="0.85" />
      <path
        d="M232 196h18"
        stroke="#0f172a"
        strokeOpacity="0.35"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {[104, 296].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="222" r="38" fill="#0f172a" opacity="0.22" />
          <circle cx={cx} cy="222" r="31" fill="#111827" />
          <circle cx={cx} cy="222" r="17" fill="#cbd5e1" />
          <circle cx={cx} cy="222" r="6" fill="#64748b" />
        </g>
      ))}
    </svg>
  );
}
