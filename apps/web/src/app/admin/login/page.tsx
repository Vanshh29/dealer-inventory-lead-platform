import { Suspense } from 'react';
import { LoginForm } from '@/components/login-form';

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm rounded-lg border border-slate-200 bg-white p-6">
      <Suspense>
        <LoginForm />
      </Suspense>
      <p className="mt-4 text-xs text-slate-600">
        Demo accounts (local seed): admin@dealer.test, sales@dealer.test, viewer@dealer.test
      </p>
    </div>
  );
}
