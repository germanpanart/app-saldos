import { createClient } from '@/lib/supabase/server.js';
import { getTramites } from '@/lib/queries.js';
import Dashboard from '@/components/Dashboard.jsx';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const canEdit = profile?.role === 'editor' || profile?.role === 'admin';

  let ocs = [];
  let error = null;
  try {
    ocs = await getTramites(supabase);
  } catch (e) {
    error = e.message;
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm">
        No se pudieron leer los datos: {error}
        <div className="text-xs text-rose-500 mt-1">Verificá que las migraciones (vistas v_tramite_saldo / v_orden_pago_saldo) estén aplicadas y que haya datos cargados (seed).</div>
      </div>
    );
  }

  return <Dashboard ocs={ocs} canEdit={canEdit} />;
}
