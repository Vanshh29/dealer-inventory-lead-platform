'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useId, useState, type FormEvent } from 'react';
import { describeError, isApiError } from '@/lib/api';
import { useSession } from '@/lib/session';
import { Button, Field, inputClass, Spinner } from './ui';

/** Only allow redirects back into the back office (no open redirect). */
export function safeNext(next: string | null): string {
  return next && /^\/admin(\/|$|\?)/.test(next) && !next.startsWith('//') ? next : '/admin';
}

export function LoginForm() {
  const uid = useId();
  const router = useRouter();
  const target = safeNext(useSearchParams().get('next'));
  const { session, login } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session.status === 'authenticated') router.replace(target);
  }, [session.status, router, target]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
      router.replace(target);
    } catch (err) {
      // Same message for unknown email and wrong password, like the API.
      setError(
        isApiError(err) && err.isUnauthorized ? 'Invalid email or password.' : describeError(err),
      );
      setBusy(false);
    }
  }

  if (session.status === 'loading') return <Spinner label="Checking session…" />;

  return (
    <form onSubmit={onSubmit} className="space-y-4" aria-labelledby={`${uid}-t`}>
      <h1 id={`${uid}-t`} className="text-2xl font-bold">
        Staff login
      </h1>
      {error && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900"
        >
          {error}
        </div>
      )}
      <Field id={`${uid}-email`} label="Email">
        {(aria) => (
          <input
            {...aria}
            name="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        )}
      </Field>
      <Field id={`${uid}-pw`} label="Password">
        {(aria) => (
          <input
            {...aria}
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        )}
      </Field>
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
