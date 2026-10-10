'use client';

import { Button, ErrorState } from '@/components/ui';

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg py-12">
      <ErrorState message="Something went wrong while loading this page." />
      <Button className="mt-4" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
