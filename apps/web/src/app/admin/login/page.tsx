import { Suspense } from 'react';
import { LoginForm } from '@/components/login-form';
import { CarArt } from '@/components/car-art';
import { CarIcon } from '@/components/icons';

export default function LoginPage() {
  return (
    <div className="mx-auto grid max-w-4xl overflow-hidden glass-strong rounded-3xl shadow-lift md:grid-cols-2">
      <div
        aria-hidden="true"
        className="relative hidden bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 p-8 text-white md:flex md:flex-col md:justify-between"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
          <CarIcon className="h-6 w-6" />
        </span>
        <div>
          <div className="mb-6 overflow-hidden rounded-2xl ring-1 ring-white/20">
            <div className="aspect-[4/3]">
              <CarArt seed="login" colour="silver" label="" />
            </div>
          </div>
          <p className="text-2xl font-bold leading-snug">
            Manage stock and enquiries in one place.
          </p>
          <p className="mt-2 text-sm text-blue-100">
            Work every lead from first contact to a signed deal.
          </p>
        </div>
      </div>
      <div className="p-6 sm:p-10">
        <Suspense>
          <LoginForm />
        </Suspense>
        <p className="mt-6 rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
          <span className="font-semibold">Demo accounts (local seed):</span> admin@dealer.test,
          sales@dealer.test, viewer@dealer.test
        </p>
      </div>
    </div>
  );
}
