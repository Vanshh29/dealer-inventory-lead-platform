import type { VehicleImage } from '@dealer/shared';
import { assetUrl } from '@/lib/api';
import { bodyTypeOf } from '@/lib/body-type';
import { CarArt } from './car-art';

/** The demo seed links to placehold.co grey boxes; those are shown as a drawn car instead. */
export const isPlaceholderImage = (url: string): boolean => {
  try {
    return new URL(url).hostname === 'placehold.co';
  } catch {
    return false;
  }
};

/** One vehicle photo: a real image, or the drawn car when the image is only a placeholder. */
export function VehiclePhoto({
  image,
  vehicle,
  alt,
  loading,
  className = 'h-full w-full object-cover',
}: {
  image: Pick<VehicleImage, 'url'>;
  vehicle: { id: string; color?: string | null; model?: string; variant?: string | null };
  alt: string;
  loading?: 'lazy';
  className?: string;
}) {
  if (isPlaceholderImage(image.url)) {
    return (
      <CarArt
        seed={`${vehicle.id}${image.url}`}
        colour={vehicle.color}
        body={bodyTypeOf(vehicle)}
        label={alt}
        className={className}
      />
    );
  }
  return <img src={assetUrl(image.url)} alt={alt} loading={loading} className={className} />;
}
