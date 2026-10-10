'use client';

import { useState, type KeyboardEvent } from 'react';
import type { VehicleImage } from '@dealer/shared';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';
import { VehiclePhoto } from './vehicle-photo';

export function Gallery({
  images,
  title,
  vehicle,
}: {
  images: VehicleImage[];
  title: string;
  vehicle: { id: string; color: string | null };
}) {
  const [index, setIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
        No photos yet
      </div>
    );
  }

  const go = (i: number) => setIndex((i + images.length) % images.length);
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') go(index + 1);
    if (e.key === 'ArrowLeft') go(index - 1);
  };
  const current = images[index];

  return (
    <section
      aria-roledescription="carousel"
      aria-label={`Photos of ${title}`}
      onKeyDown={onKeyDown}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100 shadow-card">
        <VehiclePhoto
          image={current}
          vehicle={vehicle}
          alt={`${title}, photo ${index + 1} of ${images.length}`}
        />
        {images.length > 1 && (
          <span
            aria-hidden="true"
            className="absolute bottom-3 right-3 rounded-full bg-slate-900/70 px-2.5 py-1 text-xs font-medium text-white"
          >
            {index + 1} / {images.length}
          </span>
        )}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-slate-800 shadow-md transition hover:scale-110 hover:bg-white focus-visible:outline-2 focus-visible:outline-blue-700"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-slate-800 shadow-md transition hover:scale-110 hover:bg-white focus-visible:outline-2 focus-visible:outline-blue-700"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <ul className="mt-3 grid grid-cols-5 gap-2">
          {images.map((img, i) => (
            <li key={img.id}>
              <button
                type="button"
                onClick={() => go(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index ? 'true' : undefined}
                className={`block w-full overflow-hidden rounded-lg border-2 transition focus-visible:outline-2 focus-visible:outline-blue-700 ${i === index ? 'border-blue-700 shadow-md' : 'border-transparent opacity-70 hover:opacity-100'}`}
              >
                <VehiclePhoto
                  image={img}
                  vehicle={vehicle}
                  alt=""
                  loading="lazy"
                  className="aspect-[4/3] w-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
