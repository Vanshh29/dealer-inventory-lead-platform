'use client';

import { useState, type FormEvent } from 'react';
import { eurosToCents } from '@/lib/money';
import type { Facets } from '@dealer/shared';
import { FUEL_TYPES, GEARBOXES, CATALOG_SORTS } from '@dealer/shared';
import type { CatalogState } from '@/lib/catalog-params';
import { FUEL_LABEL, GEARBOX_LABEL } from '@/lib/format';
import { catalogHref } from '@/lib/catalog-params';
import type { FuelType, Gearbox } from '@dealer/shared';
import { CloseIcon } from './icons';
import { buttonClass, inputClass, LinkButton } from './ui';

const SORT_LABEL: Record<(typeof CATALOG_SORTS)[number], string> = {
  relevance: 'Best match',
  newest: 'Newest first',
  price_asc: 'Price: low to high',
  price_desc: 'Price: high to low',
  year_desc: 'Year: newest first',
  mileage_asc: 'Mileage: lowest first',
};

function Select({
  name,
  label,
  value,
  children,
}: {
  name: string;
  label: string;
  value?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={`f-${name}`} className="mb-1 block text-sm font-medium text-slate-800">
        {label}
      </label>
      <select id={`f-${name}`} name={name} defaultValue={value ?? ''} className={inputClass}>
        {children}
      </select>
    </div>
  );
}

function NumberInput({
  name,
  label,
  value,
  placeholder,
  inputMode = 'numeric',
  onValue,
  invalid,
  describedBy,
}: {
  name: string;
  label: string;
  value?: string;
  placeholder?: string;
  inputMode?: 'numeric' | 'decimal';
  /** When given, the input is controlled by the caller. */
  onValue?: (v: string) => void;
  invalid?: boolean;
  describedBy?: string;
}) {
  return (
    <div>
      <label htmlFor={`f-${name}`} className="mb-1 block text-sm font-medium text-slate-800">
        {label}
      </label>
      <input
        id={`f-${name}`}
        name={name}
        type="text"
        inputMode={inputMode}
        {...(onValue
          ? {
              value: value ?? '',
              onChange: (e: { target: { value: string } }) => onValue(e.target.value),
            }
          : { defaultValue: value ?? '' })}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={inputClass}
        autoComplete="off"
      />
    </div>
  );
}

/**
 * A plain GET form: works without JavaScript, the URL is the single source of truth, and results
 * are rendered on the server.
 */
export function CatalogFilters({ facets, state }: { facets: Facets | null; state: CatalogState }) {
  const hasFilters = Object.keys(state).some((k) => k !== 'sort');
  const [make, setMake] = useState(state.make ?? '');
  const [model, setModel] = useState(state.model ?? '');
  const [minPrice, setMinPrice] = useState(state.minPrice ?? '');
  const [maxPrice, setMaxPrice] = useState(state.maxPrice ?? '');

  // Models follow the chosen make; without a make every model is offered, grouped by make.
  const makes = facets?.makes ?? [];
  const modelGroups = make ? makes.filter((m) => m.make === make) : makes;
  const modelsOfMake = (name: string) =>
    new Set(makes.find((m) => m.make === name)?.models.map((mo) => mo.model));

  const lo = eurosToCents(minPrice);
  const hi = eurosToCents(maxPrice);
  const priceInverted = lo !== null && hi !== null && lo > hi;

  function onSubmit(e: FormEvent) {
    if (priceInverted) e.preventDefault();
  }

  return (
    <form
      onSubmit={onSubmit}
      method="get"
      action="/vehicles"
      role="search"
      aria-label="Filter cars"
      className="space-y-4"
    >
      <div>
        <label htmlFor="f-q" className="mb-1 block text-sm font-medium text-slate-800">
          Search
        </label>
        <input
          id="f-q"
          name="q"
          type="search"
          defaultValue={state.q ?? ''}
          maxLength={100}
          placeholder="e.g. golf diesel, black, 2.0 TDI"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="f-make" className="mb-1 block text-sm font-medium text-slate-800">
          Make
        </label>
        <select
          id="f-make"
          name="make"
          value={make}
          onChange={(e) => {
            const next = e.target.value;
            setMake(next);
            // Drop a model that does not belong to the newly chosen make.
            if (next && model && !modelsOfMake(next).has(model)) setModel('');
          }}
          className={inputClass}
        >
          <option value="">All makes</option>
          {makes.map((m) => (
            <option key={m.make} value={m.make}>{`${m.make} (${m.count})`}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="f-model" className="mb-1 block text-sm font-medium text-slate-800">
          Model
        </label>
        <select
          id="f-model"
          name="model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className={inputClass}
        >
          <option value="">All models</option>
          {modelGroups.map((m) => (
            <optgroup key={m.make} label={m.make}>
              {m.models.map((mo) => (
                <option
                  key={`${m.make}-${mo.model}`}
                  value={mo.model}
                >{`${mo.model} (${mo.count})`}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select name="fuel" label="Fuel" value={state.fuel}>
          <option value="">Any</option>
          {FUEL_TYPES.map((f) => (
            <option key={f} value={f}>
              {FUEL_LABEL[f]}
            </option>
          ))}
        </Select>
        <Select name="gearbox" label="Gearbox" value={state.gearbox}>
          <option value="">Any</option>
          {GEARBOXES.map((g) => (
            <option key={g} value={g}>
              {GEARBOX_LABEL[g]}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NumberInput
          name="minPrice"
          label="Min. price (€)"
          value={minPrice}
          onValue={setMinPrice}
          invalid={priceInverted}
          describedBy={priceInverted ? 'f-price-hint' : undefined}
          inputMode="decimal"
          placeholder="e.g. 5000"
        />
        <NumberInput
          name="maxPrice"
          label="Max. price (€)"
          value={maxPrice}
          onValue={setMaxPrice}
          invalid={priceInverted}
          describedBy={priceInverted ? 'f-price-hint' : undefined}
          inputMode="decimal"
          placeholder="e.g. 30000"
        />
        {priceInverted && (
          <p id="f-price-hint" role="alert" className="col-span-2 text-sm text-red-700">
            The minimum price is higher than the maximum. Adjust one of them to search.
          </p>
        )}
        <NumberInput
          name="minYear"
          label="Year from"
          value={state.minYear}
          placeholder="e.g. 2018"
        />
        <NumberInput name="maxYear" label="Year to" value={state.maxYear} placeholder="e.g. 2025" />
      </div>
      <NumberInput
        name="maxKm"
        label="Max. mileage (km)"
        value={state.maxKm}
        placeholder="e.g. 100000"
      />

      <Select name="sort" label="Sort by" value={state.sort}>
        <option value="">Default</option>
        {CATALOG_SORTS.map((s) => (
          <option key={s} value={s}>
            {SORT_LABEL[s]}
          </option>
        ))}
      </Select>

      <div className="flex gap-2">
        <button type="submit" className={buttonClass('primary')}>
          Show results
        </button>
        {hasFilters && (
          <LinkButton href="/vehicles" variant="secondary">
            Reset
          </LinkButton>
        )}
      </div>
    </form>
  );
}

function activeFilters(state: CatalogState): { key: keyof CatalogState; label: string }[] {
  const out: { key: keyof CatalogState; label: string }[] = [];
  const add = (key: keyof CatalogState, label: (v: string) => string) => {
    const v = state[key];
    if (v) out.push({ key, label: label(v) });
  };
  add('q', (v) => `Search: ${v}`);
  add('make', (v) => v);
  add('model', (v) => v);
  add('fuel', (v) => FUEL_LABEL[v as FuelType] ?? v);
  add('gearbox', (v) => GEARBOX_LABEL[v as Gearbox] ?? v);
  add('minPrice', (v) => `From € ${v}`);
  add('maxPrice', (v) => `Up to € ${v}`);
  add('minYear', (v) => `Year from ${v}`);
  add('maxYear', (v) => `Year to ${v}`);
  add('maxKm', (v) => `Up to ${v} km`);
  return out;
}

/** Applied filters as removable chips; each is a plain link so it works without JavaScript. */
export function ActiveFilters({ state }: { state: CatalogState }) {
  const items = activeFilters(state);
  if (items.length === 0) return null;
  return (
    <ul aria-label="Active filters" className="mt-3 flex flex-wrap gap-2">
      {items.map(({ key, label }) => {
        const rest = { ...state };
        delete rest[key];
        return (
          <li key={key}>
            <a
              href={catalogHref(rest)}
              aria-label={`Remove filter: ${label}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-indigo-900 transition hover:border-indigo-400 hover:bg-indigo-50"
            >
              {label}
              <CloseIcon className="h-3.5 w-3.5" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
