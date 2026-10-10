import { Suspense } from 'react';
import { LeadsView } from '@/components/leads-view';
import { Spinner } from '@/components/ui';

export default function LeadsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <LeadsView />
    </Suspense>
  );
}
