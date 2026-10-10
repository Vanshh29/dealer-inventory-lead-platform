'use client';

import { useId, useState } from 'react';
import type { Vehicle } from '@dealer/shared';
import { api, assetUrl, describeError } from '@/lib/api';
import { Button } from './ui';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGES = 10;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Client-side pre-check for a friendlier message; the API re-validates by file signature. */
export function checkImageFile(file: { type: string; size: number }): string | null {
  if (!TYPES.includes(file.type)) return 'Only JPEG, PNG or WebP images are allowed.';
  if (file.size > MAX_IMAGE_BYTES) return 'Images must be 5 MB or smaller.';
  return null;
}

export function VehicleImages({
  vehicle,
  canEdit,
  onChanged,
}: {
  vehicle: Vehicle;
  canEdit: boolean;
  onChanged: () => void;
}) {
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setBusy(true);
    try {
      let count = vehicle.images.length;
      for (const file of Array.from(files)) {
        if (count >= MAX_IMAGES)
          throw new Error(`A vehicle can have at most ${MAX_IMAGES} photos.`);
        const problem = checkImageFile(file);
        if (problem) throw new Error(`${file.name}: ${problem}`);
        await api.admin.vehicles.uploadImage(vehicle.id, file, file.name);
        count++;
      }
    } catch (e) {
      setError(e instanceof Error && !('status' in e) ? e.message : describeError(e));
    } finally {
      setBusy(false);
      onChanged();
    }
  }

  async function remove(imageId: string) {
    if (!window.confirm('Delete this photo?')) return;
    setBusy(true);
    setError(null);
    try {
      await api.admin.vehicles.removeImage(vehicle.id, imageId);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
      onChanged();
    }
  }

  return (
    <section
      aria-labelledby={`${inputId}-h`}
      className="rounded-lg border border-slate-200 bg-white p-4"
    >
      <h2 id={`${inputId}-h`} className="text-lg font-semibold">
        Photos ({vehicle.images.length}/{MAX_IMAGES})
      </h2>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-800">
          {error}
        </p>
      )}
      {vehicle.images.length === 0 && (
        <p className="mt-2 text-sm text-slate-700">
          No photos yet. The first photo is the cover image.
        </p>
      )}
      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {vehicle.images.map((img, i) => (
          <li key={img.id} className="overflow-hidden rounded-md border border-slate-200">
            <img
              src={assetUrl(img.url)}
              alt={`Photo ${i + 1}`}
              className="aspect-[4/3] w-full object-cover"
            />
            <div className="flex items-center justify-between p-2 text-xs text-slate-700">
              <span>{i === 0 ? 'Cover' : `#${i + 1}`}</span>
              {canEdit && (
                <Button
                  variant="ghost"
                  className="!px-2 !py-1 text-red-800"
                  disabled={busy}
                  onClick={() => void remove(img.id)}
                  aria-label={`Delete photo ${i + 1}`}
                >
                  Delete
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {canEdit && (
        <div className="mt-4">
          <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-slate-800">
            Add photos (JPEG, PNG, WebP · max 5 MB each)
          </label>
          <input
            id={inputId}
            type="file"
            accept={TYPES.join(',')}
            multiple
            disabled={busy || vehicle.images.length >= MAX_IMAGES}
            onChange={(e) => {
              void upload(e.target.files);
              e.target.value = '';
            }}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue-700 file:px-4 file:py-2 file:text-white hover:file:bg-blue-800"
          />
          {busy && (
            <p role="status" className="mt-2 text-sm text-slate-700">
              Working…
            </p>
          )}
        </div>
      )}
    </section>
  );
}
