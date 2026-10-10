import { useId } from 'react';

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
  className = 'h-full w-full',
}: {
  seed: string;
  colour?: string | null;
  label: string;
  className?: string;
}) {
  const uid = useId().replace(/:/g, '');
  const [from, to] = BACKDROPS[hash(seed) % BACKDROPS.length];
  const body = bodyColour(colour);
  const dark = body === '#1f2937';
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
      <path
        id={`${uid}-body`}
        d="M38 214c0-17 12-27 34-31l36-52c8-11 18-17 32-17h96c15 0 27 7 36 20l30 47c26 4 42 15 42 33v14H38v-14Z"
        fill={body}
      />
      <path
        d="M38 214c0-17 12-27 34-31l36-52c8-11 18-17 32-17h96c15 0 27 7 36 20l30 47c26 4 42 15 42 33v14H38v-14Z"
        fill={`url(#${uid}-sheen)`}
      />
      <path d="M122 176l26-42c4-6 9-9 16-9h38v51H122Z" fill={`url(#${uid}-glass)`} />
      <path d="M210 125h30c8 0 14 3 19 10l22 41h-71v-51Z" fill={`url(#${uid}-glass)`} />
      <path
        d="M205 125v51"
        stroke={dark ? '#475569' : '#0f172a'}
        strokeOpacity="0.35"
        strokeWidth="3"
      />
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
