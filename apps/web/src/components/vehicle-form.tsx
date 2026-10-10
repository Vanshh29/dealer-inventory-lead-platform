'use client';

import { useRouter } from 'next/navigation';
import { useId, useState, type FormEvent } from 'react';
import { FUEL_TYPES, GEARBOXES, VEHICLE_STATUSES } from '@dealer/shared';
import type { Vehicle, VehicleInput } from '@dealer/shared';
import { api, describeError, isApiError } from '@/lib/api';
import { FUEL_LABEL, GEARBOX_LABEL, VEHICLE_STATUS_LABEL } from '@/lib/format';
import { centsToEuroInput, eurosToCents } from '@/lib/money';
import { Button, Field, inputClass } from './ui';

interface FormValues {
  vin: string;
  make: string;
  model: string;
  variant: string;
  year: string;
  mileage: string;
  price: string;
  fuel: string;
  gearbox: string;
  color: string;
  description: string;
  status: string;
}
type Errors = Partial<Record<keyof FormValues, string>>;

const empty: FormValues = {
  vin: '',
  make: '',
  model: '',
  variant: '',
  year: String(new Date().getFullYear()),
  mileage: '',
  price: '',
  fuel: 'PETROL',
  gearbox: 'MANUAL',
  color: '',
  description: '',
  status: 'DRAFT',
};

const fromVehicle = (v: Vehicle): FormValues => ({
  vin: v.vin,
  make: v.make,
  model: v.model,
  variant: v.variant ?? '',
  year: String(v.year),
  mileage: String(v.mileage),
  price: centsToEuroInput(v.priceCents),
  fuel: v.fuel,
  gearbox: v.gearbox,
  color: v.color,
  description: v.description,
  status: v.status,
});

const wholeNumber = (s: string): number | null => (/^\d{1,9}$/.test(s.trim()) ? Number(s) : null);

/** Returns field errors, or the API payload when everything is valid. Money goes through string maths only. */
export function toInput(v: FormValues): { errors: Errors } | { input: VehicleInput } {
  const errors: Errors = {};
  const vin = v.vin.trim().toUpperCase();
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin))
    errors.vin = 'A VIN has 17 characters (letters and digits, no I, O or Q).';
  if (!v.make.trim()) errors.make = 'Required.';
  if (!v.model.trim()) errors.model = 'Required.';
  if (!v.color.trim()) errors.color = 'Required.';
  const year = wholeNumber(v.year);
  if (year === null || year < 1950 || year > new Date().getFullYear() + 1)
    errors.year = 'Enter a valid year.';
  const mileage = wholeNumber(v.mileage);
  if (mileage === null || mileage > 2_000_000) errors.mileage = 'Enter the mileage in km.';
  const priceCents = eurosToCents(v.price);
  if (priceCents === null || priceCents > 100_000_000)
    errors.price = 'Enter a price in euros, e.g. 15999 or 15.999,90.';
  if (Object.keys(errors).length > 0) return { errors };
  return {
    input: {
      vin,
      make: v.make.trim(),
      model: v.model.trim(),
      variant: v.variant.trim() || undefined,
      year: year!,
      mileage: mileage!,
      priceCents: priceCents!,
      fuel: v.fuel as VehicleInput['fuel'],
      gearbox: v.gearbox as VehicleInput['gearbox'],
      color: v.color.trim(),
      description: v.description.trim(),
      status: v.status as VehicleInput['status'],
    },
  };
}

export function VehicleForm({
  vehicle,
  readOnly = false,
  onSaved,
}: {
  vehicle?: Vehicle;
  readOnly?: boolean;
  onSaved?: () => void;
}) {
  const uid = useId();
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(vehicle ? fromVehicle(vehicle) : empty);
  const [errors, setErrors] = useState<Errors>({});
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (k: keyof FormValues) => (e: { target: { value: string } }) => {
    setSaved(false);
    setValues((v) => ({ ...v, [k]: e.target.value }));
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setServerErrors([]);
    setSaved(false);
    const result = toInput(values);
    if ('errors' in result) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      if (vehicle) {
        await api.admin.vehicles.update(vehicle.id, result.input);
        setSaved(true);
        onSaved?.();
      } else {
        const created = await api.admin.vehicles.create(result.input);
        router.push(`/admin/vehicles/${created.id}`);
      }
    } catch (err) {
      setServerErrors(
        isApiError(err) && err.details.length > 0 ? err.details : [describeError(err)],
      );
    } finally {
      setBusy(false);
    }
  }

  const text = (k: keyof FormValues, label: string, extra: Record<string, unknown> = {}) => (
    <Field id={`${uid}-${k}`} label={label} error={errors[k]}>
      {(aria) => (
        <input
          {...aria}
          name={k}
          value={values[k]}
          onChange={set(k)}
          className={inputClass}
          {...extra}
        />
      )}
    </Field>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {serverErrors.length > 0 && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900"
        >
          <ul className="list-disc pl-5">
            {serverErrors.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}
      {saved && (
        <p
          role="status"
          className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900"
        >
          Saved.
        </p>
      )}

      <fieldset disabled={readOnly || busy} className="grid gap-4 sm:grid-cols-2">
        <legend className="sr-only">Vehicle details</legend>
        {text('vin', 'VIN', { maxLength: 17, autoCapitalize: 'characters' })}
        {text('color', 'Colour')}
        {text('make', 'Make')}
        {text('model', 'Model')}
        {text('variant', 'Variant (optional)')}
        {text('year', 'Year', { inputMode: 'numeric' })}
        {text('mileage', 'Mileage (km)', { inputMode: 'numeric' })}
        {text('price', 'Price (€)', { inputMode: 'decimal' })}
        <Field id={`${uid}-fuel`} label="Fuel">
          {(aria) => (
            <select {...aria} value={values.fuel} onChange={set('fuel')} className={inputClass}>
              {FUEL_TYPES.map((f) => (
                <option key={f} value={f}>
                  {FUEL_LABEL[f]}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field id={`${uid}-gearbox`} label="Gearbox">
          {(aria) => (
            <select
              {...aria}
              value={values.gearbox}
              onChange={set('gearbox')}
              className={inputClass}
            >
              {GEARBOXES.map((g) => (
                <option key={g} value={g}>
                  {GEARBOX_LABEL[g]}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field
          id={`${uid}-status`}
          label="Status"
          hint="Only “Published” vehicles appear on the public site."
        >
          {(aria) => (
            <select {...aria} value={values.status} onChange={set('status')} className={inputClass}>
              {VEHICLE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {VEHICLE_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          )}
        </Field>
        <div className="sm:col-span-2">
          <Field id={`${uid}-description`} label="Description">
            {(aria) => (
              <textarea
                {...aria}
                rows={5}
                maxLength={5000}
                value={values.description}
                onChange={set('description')}
                className={inputClass}
              />
            )}
          </Field>
        </div>
      </fieldset>

      {!readOnly && (
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : vehicle ? 'Save changes' : 'Create vehicle'}
        </Button>
      )}
    </form>
  );
}
