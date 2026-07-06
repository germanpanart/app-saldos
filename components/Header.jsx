'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, LayoutDashboard } from 'lucide-react';
import { createClient } from '@/lib/supabase/client.js';
import { AREA_LABEL } from '@/lib/labels.js';

const roleLabel = { admin: 'Administrador', editor: 'Editor', lector: 'Lector' };

export default function Header({ email, role }) {
  const router = useRouter();
  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };
  return (
    <header className="bg-gradient-to-r from-brand-900 via-brand-800 to-brand-700 text-white shadow-md sticky top-0 z-40">
      <div className="max-w-[1400px] mx-auto px-5 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <LayoutDashboard size={22} />
          <div>
            <h1 className="text-base font-bold leading-tight">Saldos de Órdenes de Compra</h1>
            <p className="text-[11px] text-brand-100/80">Compras y Contrataciones · {AREA_LABEL.obras} · {AREA_LABEL.educacion}</p>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-medium leading-tight">{email}</div>
            <div className="text-[11px] text-brand-100/70">{roleLabel[role] || 'Lector'}</div>
          </div>
          <button onClick={logout} title="Cerrar sesión" className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-sm">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
