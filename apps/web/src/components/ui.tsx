import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { InboxIcon } from './icons';

type Variant = 'primary' | 'secondary' | 'danger' | 'danger-outline' | 'ghost';

const base =
  'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 active:translate-y-px active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50';
const variants: Record<Variant, string> = {
  primary:
    'bg-brand bg-[length:140%_100%] text-white shadow-md shadow-indigo-900/25 hover:bg-right hover:shadow-lg hover:shadow-indigo-700/40 hover:-translate-y-px',
  secondary: 'glass text-slate-900 hover:bg-white hover:border-indigo-300 hover:-translate-y-px',
  danger:
    'bg-gradient-to-b from-red-600 to-red-700 text-white shadow-md shadow-red-900/20 hover:from-red-700 hover:to-red-800',
  'danger-outline':
    'border border-red-300 bg-white/60 text-red-800 hover:border-red-500 hover:bg-red-50',
  ghost: 'text-slate-700 hover:bg-white/70',
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
  'block w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-600 placeholder:italic hover:border-indigo-300 focus-visible:border-indigo-600 focus-visible:bg-white focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-700';

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
        className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600"
      />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({
  title,
  children,
  as: Heading = 'h2',
}: {
  title: string;
  children?: ReactNode;
  as?: 'h1' | 'h2';
}) {
  return (
    <div className="glass animate-rise rounded-2xl border-dashed px-6 py-14 text-center">
      <span
        aria-hidden="true"
        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white shadow-glow animate-pop"
      >
        <InboxIcon className="h-6 w-6" />
      </span>
      <Heading className="text-lg font-semibold text-slate-900">{title}</Heading>
      {children && <div className="mt-2 text-slate-600">{children}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="animate-rise rounded-2xl border border-red-200 bg-red-50/90 px-6 py-6 shadow-sm backdrop-blur"
    >
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
    'glass rounded-xl px-4 py-2.5 text-sm font-medium transition hover:-translate-y-px hover:bg-white';
  // First, last and the neighbours of the current page; gaps become an ellipsis.
  const shown = Array.from({ length: pages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === pages || Math.abs(p - page) <= 1,
  );
  return (
    <nav aria-label="Pagination" className="mt-8 flex flex-col items-center gap-3">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {page > 1 && (
          <Link href={hrefFor(page - 1)} rel="prev" className={linkClass}>
            ← Previous
          </Link>
        )}
        <ol className="flex items-center gap-1.5">
          {shown.map((p, i) => (
            <li key={p} className="flex items-center gap-1.5">
              {i > 0 && p - shown[i - 1] > 1 && (
                <span aria-hidden="true" className="px-1 text-slate-600">
                  …
                </span>
              )}
              {p === page ? (
                <span
                  aria-current="page"
                  aria-label={`Page ${p}`}
                  className="flex h-11 min-w-11 items-center justify-center rounded-xl bg-brand px-3 text-sm font-semibold tabular-nums text-white"
                >
                  {p}
                </span>
              ) : (
                <Link
                  href={hrefFor(p)}
                  aria-label={`Page ${p}`}
                  className={`${linkClass} flex h-11 min-w-11 items-center justify-center !px-3 tabular-nums`}
                >
                  {p}
                </Link>
              )}
            </li>
          ))}
        </ol>
        {page < pages && (
          <Link href={hrefFor(page + 1)} rel="next" className={linkClass}>
            Next →
          </Link>
        )}
      </div>
      <p className="text-sm text-slate-700" aria-live="polite">
        Page {page} of {pages}
      </p>
    </nav>
  );
}
