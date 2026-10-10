'use client';

import { useId, useRef, useState, type FormEvent } from 'react';
import { api, describeError } from '@/lib/api';
import { Button, Field, inputClass } from './ui';

export interface LeadFormValues {
  name: string;
  email: string;
  phone: string;
  message: string;
}
type Errors = Partial<Record<keyof LeadFormValues, string>>;

// Mirrors the API rules (the server remains the authority).
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[+()\d\s-]{6,25}$/;

export function validateLead(v: LeadFormValues): Errors {
  const e: Errors = {};
  if (!v.name.trim()) e.name = 'Please enter your name.';
  else if (v.name.trim().length > 100) e.name = 'Name must be 100 characters or fewer.';
  if (!EMAIL.test(v.email.trim())) e.email = 'Please enter a valid email address.';
  if (v.phone.trim() && !PHONE.test(v.phone.trim())) e.phone = 'Please enter a valid phone number.';
  if (!v.message.trim()) e.message = 'Please write a short message.';
  else if (v.message.trim().length > 2000) e.message = 'Message must be 2000 characters or fewer.';
  return e;
}

export function LeadForm({ vehicleId, vehicleTitle }: { vehicleId: string; vehicleTitle: string }) {
  const uid = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<LeadFormValues>({
    name: '',
    email: '',
    phone: '',
    message: `Hello, I am interested in the ${vehicleTitle}. Is it still available?`,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [state, setState] = useState<'idle' | 'submitting' | 'sent'>('idle');
  const [failure, setFailure] = useState<string | null>(null);

  const set = (k: keyof LeadFormValues) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFailure(null);
    const found = validateLead(values);
    setErrors(found);
    const firstInvalid = (Object.keys(found) as (keyof LeadFormValues)[])[0];
    if (firstInvalid) {
      formRef.current?.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus();
      return;
    }
    // Honeypot value is read from the DOM: a bot that fills it gets silently dropped by the API.
    const website =
      (formRef.current?.elements.namedItem('website') as HTMLInputElement | null)?.value ?? '';
    setState('submitting');
    try {
      await api.leads.submit({
        vehicleId,
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim() || undefined,
        message: values.message.trim(),
        website,
      });
      setState('sent');
    } catch (err) {
      setFailure(describeError(err));
      setState('idle');
    }
  }

  if (state === 'sent') {
    return (
      <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-5">
        <h3 className="font-semibold text-green-900">Thank you, your request has been sent.</h3>
        <p className="mt-1 text-sm text-green-900">We will get back to you as soon as possible.</p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      aria-labelledby={`${uid}-title`}
      className="space-y-4"
    >
      <h2 id={`${uid}-title`} className="text-lg font-semibold text-slate-900">
        Interested? Send us a message
      </h2>

      {failure && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900"
        >
          {failure}
        </div>
      )}

      <Field id={`${uid}-name`} label="Name" error={errors.name}>
        {(aria) => (
          <input
            {...aria}
            name="name"
            autoComplete="name"
            value={values.name}
            onChange={set('name')}
            className={inputClass}
            required
          />
        )}
      </Field>
      <Field id={`${uid}-email`} label="Email" error={errors.email}>
        {(aria) => (
          <input
            {...aria}
            name="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={set('email')}
            className={inputClass}
            required
          />
        )}
      </Field>
      <Field id={`${uid}-phone`} label="Phone (optional)" error={errors.phone}>
        {(aria) => (
          <input
            {...aria}
            name="phone"
            type="tel"
            autoComplete="tel"
            value={values.phone}
            onChange={set('phone')}
            className={inputClass}
          />
        )}
      </Field>
      <Field id={`${uid}-message`} label="Message" error={errors.message}>
        {(aria) => (
          <textarea
            {...aria}
            name="message"
            rows={4}
            value={values.message}
            onChange={set('message')}
            className={inputClass}
            required
          />
        )}
      </Field>

      {/* Honeypot: invisible and unreachable for people and assistive tech; bots fill every field. */}
      <div
        aria-hidden="true"
        style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}
      >
        <label>
          Website
          <input name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <p className="text-xs text-slate-600">We only use your details to answer this request.</p>
      <Button type="submit" disabled={state === 'submitting'}>
        {state === 'submitting' ? 'Sending…' : 'Send request'}
      </Button>
    </form>
  );
}
