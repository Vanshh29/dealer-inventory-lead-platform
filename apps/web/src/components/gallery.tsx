'use client';

import { useState, type KeyboardEvent } from 'react';
import type { VehicleImage } from '@dealer/shared';
import { assetUrl } from '@/lib/api';

export function Gallery({ images, title }: { images: VehicleImage[]; title: string }) {
  const [index, setIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-slate-100 text-slate-600">
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
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-slate-100">
        <img
          src={assetUrl(current.url)}
          alt={`${title}, photo ${index + 1} of ${images.length}`}
          className="h-full w-full object-cover"
        />
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-lg shadow hover:bg-white focus-visible:outline-2 focus-visible:outline-blue-700"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-lg shadow hover:bg-white focus-visible:outline-2 focus-visible:outline-blue-700"
            >
              →
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
                className={`block w-full overflow-hidden rounded-md border-2 focus-visible:outline-2 focus-visible:outline-blue-700 ${i === index ? 'border-blue-700' : 'border-transparent'}`}
              >
                <img
                  src={assetUrl(img.url)}
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
