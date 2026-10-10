import { Suspense } from 'react';
import { Spinner } from '@/components/ui';
import { VehiclesView } from '@/components/vehicles-admin';

export default function VehiclesPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <VehiclesView />
    </Suspense>
  );
}
