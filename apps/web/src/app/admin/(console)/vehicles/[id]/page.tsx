import { VehicleEditor } from '@/components/vehicle-editor';

export default async function VehicleAdminPage({ params }: { params: Promise<{ id: string }> }) {
  return <VehicleEditor id={(await params).id} />;
}
