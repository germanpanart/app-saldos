import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server.js';
import { getLookups } from '@/lib/queries.js';
import TramiteForm from '@/components/TramiteForm.jsx';

export const dynamic = 'force-dynamic';

export default async function NuevoTramitePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!(profile?.role === 'editor' || profile?.role === 'admin')) redirect('/');

  const lookups = await getLookups(supabase);
  return <TramiteForm lookups={lookups} />;
}
