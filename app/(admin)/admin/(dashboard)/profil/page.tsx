import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { isAdminRole } from '@/auth.config';
import { getAdminProfile } from '@/lib/data/admin/profile';
import { ProfileForm } from './ProfileForm';

export const metadata: Metadata = {
  title: 'Profil',
};

export default async function AdminProfilePage() {
  const session = await auth();
  const user = session?.user;

  if (!user?.id || !isAdminRole(user.role)) {
    redirect('/admin/login');
  }

  const profile = await getAdminProfile(Number(user.id));
  if (!profile) {
    redirect('/admin/login');
  }

  return (
    <main className="max-w-4xl mx-auto px-6 sm:px-8 py-8 sm:py-10">
      <div className="mb-6">
        <span className="text-[10px] uppercase tracking-[0.24em] text-[#8B7355] font-medium block mb-1.5">
          Modul
        </span>
        <h1 className="text-2xl font-light text-[#1A1A1A] tracking-tight">
          Profil Admin
        </h1>
        <p className="text-xs text-[#999999] mt-1 max-w-2xl leading-relaxed">
          Ubah nama, email, dan password akun Anda.
        </p>
      </div>

      <ProfileForm
        name={profile.name}
        email={profile.email}
      />
    </main>
  );
}