import type { SVGProps } from 'react';

/** Small stroke icons (24px grid). Decorative: the text next to them carries the meaning. */
function Icon(props: Omit<SVGProps<SVGSVGElement>, 'd'> & { d: string | string[] }) {
  const { d, className = 'h-4 w-4', ...rest } = props;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...rest}
    >
      {(Array.isArray(d) ? d : [d]).map((p) => (
        <path key={p} d={p} />
      ))}
    </svg>
  );
}

type P = { className?: string };
export const FuelIcon = (p: P) => (
  <Icon
    {...p}
    d={[
      'M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16',
      'M3 21h14',
      'M15 9h2a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V8l-3-3',
    ]}
  />
);
export const BoltIcon = (p: P) => <Icon {...p} d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />;
export const GearIcon = (p: P) => (
  <Icon {...p} d={['M6 4v16', 'M12 4v16', 'M18 4v7', 'M6 12h12', 'M18 11v9']} />
);
export const GaugeIcon = (p: P) => (
  <Icon {...p} d={['M4 18a8 8 0 1 1 16 0', 'M12 18l4-6', 'M12 6v1.5']} />
);
export const CalendarIcon = (p: P) => (
  <Icon
    {...p}
    d={[
      'M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z',
      'M8 3v4',
      'M16 3v4',
      'M4 11h16',
    ]}
  />
);
export const PaletteIcon = (p: P) => (
  <Icon
    {...p}
    d={[
      'M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.5-2-.6-1.2.2-2.5 1.6-2.5H17a4 4 0 0 0 4-4C21 6.5 17 3 12 3Z',
    ]}
  />
);
export const SearchIcon = (p: P) => (
  <Icon {...p} d={['M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z', 'm20 20-4-4']} />
);
export const ShieldIcon = (p: P) => (
  <Icon {...p} d={['M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z', 'm9 12 2 2 4-4']} />
);
export const TagIcon = (p: P) => (
  <Icon {...p} d={['M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Z', 'M8 8h.01']} />
);
export const KeyIcon = (p: P) => (
  <Icon {...p} d={['M14 10a4 4 0 1 1-3.2 6.4L8 19H5v-3l5-5', 'M16 8h.01']} />
);
export const ArrowIcon = (p: P) => <Icon {...p} d="M5 12h14M13 6l6 6-6 6" />;
export const ChevronLeftIcon = (p: P) => <Icon {...p} d="m15 6-6 6 6 6" />;
export const ChevronRightIcon = (p: P) => <Icon {...p} d="m9 6 6 6-6 6" />;
export const InboxIcon = (p: P) => (
  <Icon {...p} d={['M4 13 6 5h12l2 8', 'M4 13v6h16v-6', 'M4 13h5a3 3 0 0 0 6 0h5']} />
);
export const CarIcon = (p: P) => (
  <Icon
    {...p}
    d={[
      'M5 16 6.5 10a2 2 0 0 1 1.9-1.5h7.2A2 2 0 0 1 17.5 10L19 16',
      'M3 16h18v3H3z',
      'M7 19v1.5',
      'M17 19v1.5',
    ]}
  />
);
export const GridIcon = (p: P) => (
  <Icon {...p} d={['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M13 13h7v7h-7z']} />
);
export const MenuIcon = (p: P) => <Icon {...p} strokeWidth={2.2} d="M4 6h16M4 12h16M4 18h16" />;
export const CloseIcon = (p: P) => <Icon {...p} strokeWidth={2.2} d="M6 6l12 12M18 6 6 18" />;
