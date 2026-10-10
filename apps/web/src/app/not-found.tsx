import { EmptyState, LinkButton } from '@/components/ui';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-12">
      <EmptyState title="Page not found">
        This page does not exist, or the car has been sold.
        <div className="mt-4">
          <LinkButton href="/vehicles">Browse cars</LinkButton>
        </div>
      </EmptyState>
    </div>
  );
}
