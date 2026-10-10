import type { Facets } from '@dealer/shared';
import { FUEL_TYPES, GEARBOXES, CATALOG_SORTS } from '@dealer/shared';
import type { CatalogState } from '@/lib/catalog-params';
import { FUEL_LABEL, GEARBOX_LABEL } from '@/lib/format';
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
}: {
  name: string;
  label: string;
  value?: string;
  placeholder?: string;
  inputMode?: 'numeric' | 'decimal';
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
        defaultValue={value ?? ''}
        placeholder={placeholder}
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
  return (
    <form
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

      <Select name="make" label="Make" value={state.make}>
        <option value="">All makes</option>
        {facets?.makes.map((m) => (
          <option key={m.make} value={m.make}>{`${m.make} (${m.count})`}</option>
        ))}
      </Select>

      <Select name="model" label="Model" value={state.model}>
        <option value="">All models</option>
        {facets?.makes.map((m) => (
          <optgroup key={m.make} label={m.make}>
            {m.models.map((mo) => (
              <option
                key={`${m.make}-${mo.model}`}
                value={mo.model}
              >{`${mo.model} (${mo.count})`}</option>
            ))}
          </optgroup>
        ))}
      </Select>

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
          value={state.minPrice}
          inputMode="decimal"
        />
        <NumberInput
          name="maxPrice"
          label="Max. price (€)"
          value={state.maxPrice}
          inputMode="decimal"
        />
        <NumberInput name="minYear" label="Year from" value={state.minYear} placeholder="2018" />
        <NumberInput name="maxYear" label="Year to" value={state.maxYear} placeholder="2025" />
      </div>
      <NumberInput
        name="maxKm"
        label="Max. mileage (km)"
        value={state.maxKm}
        placeholder="100000"
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
