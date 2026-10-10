import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { InboxIcon } from './icons';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50';
const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-sm shadow-blue-900/20 hover:from-blue-700 hover:to-blue-800 hover:shadow-md',
  secondary:
    'border border-slate-300 bg-white text-slate-900 shadow-sm hover:border-slate-400 hover:bg-slate-50',
  danger: 'bg-red-700 text-white shadow-sm hover:bg-red-800',
  ghost: 'text-slate-700 hover:bg-slate-100',
};

export const buttonClass = (variant: Variant = 'primary'): string => `${base} ${variants[variant]}`;

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type={type} className={`${buttonClass(variant)} ${className}`} {...props} />;
}

export function LinkButton({
  href,
  variant = 'primary',
  children,
}: {
  href: string;
  variant?: Variant;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant)}>
      {children}
    </Link>
  );
}

export const inputClass =
  'block w-full rounded-lg border border-slate-400 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-500 hover:border-slate-500 focus-visible:border-blue-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-700 disabled:bg-slate-100';

/** Label + control + error text, wired together with ids for screen readers. */
export function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: (aria: {
    id: string;
    'aria-invalid': boolean;
    'aria-describedby'?: string;
  }) => ReactNode;
}) {
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ');
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-800">
        {label}
      </label>
      {children({
        id,
        'aria-invalid': Boolean(error),
        'aria-describedby': describedBy || undefined,
      })}
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-slate-600">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

const badgeTones = {
  slate: 'bg-slate-100 text-slate-800 ring-slate-300/70',
  blue: 'bg-blue-50 text-blue-900 ring-blue-300/70',
  amber: 'bg-amber-50 text-amber-900 ring-amber-300/70',
  green: 'bg-green-50 text-green-900 ring-green-300/70',
  red: 'bg-red-50 text-red-900 ring-red-300/70',
  violet: 'bg-violet-50 text-violet-900 ring-violet-300/70',
} as const;
export type Tone = keyof typeof badgeTones;

export function Badge({ tone = 'slate', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${badgeTones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 py-8 text-slate-600">
      <span
        aria-hidden="true"
        className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-700"
      />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center">
      <span
        aria-hidden="true"
        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-700"
      >
        <InboxIcon className="h-6 w-6" />
      </span>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {children && <div className="mt-2 text-slate-600">{children}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-6 py-6 shadow-sm">
      <p className="font-medium text-red-900">{message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/** Link-based pager: works without JavaScript and keeps filters in the URL. */
export function Pagination({
  page,
  limit,
  total,
  hrefFor,
}: {
  page: number;
  limit: number;
  total: number;
  hrefFor: (page: number) => string;
}) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) return null;
  const linkClass =
    'rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:border-slate-400 hover:bg-slate-50';
  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-between gap-4">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} rel="prev" className={linkClass}>
          ← Previous
        </Link>
      ) : (
        <span />
      )}
      <p className="text-sm text-slate-700" aria-live="polite">
        Page {page} of {pages}
      </p>
      {page < pages ? (
        <Link href={hrefFor(page + 1)} rel="next" className={linkClass}>
          Next →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
