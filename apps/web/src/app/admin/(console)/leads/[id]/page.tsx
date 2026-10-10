import { LeadDetail } from '@/components/lead-detail';

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  return <LeadDetail id={(await params).id} />;
}
