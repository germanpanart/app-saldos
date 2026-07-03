import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server.js';
import Header from '@/components/Header.jsx';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const role = profile?.role || 'lector';

  return (
    <div className="min-h-screen">
      <Header email={user.email} role={role} />
      <main className="max-w-[1400px] mx-auto px-5 py-5">{children}</main>
    </div>
  );
}
