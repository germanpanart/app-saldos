'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, LogIn, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client.js';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pass });
    setBusy(false);
    if (error) { setError('Email o contraseña incorrectos.'); return; }
    router.push('/');
    router.refresh();
  };

  const field = 'w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700">
      <form onSubmit={submit} className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-7">
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center mb-3"><Lock size={22} /></div>
          <h1 className="text-lg font-bold text-slate-800">Saldos de Órdenes de Compra</h1>
          <p className="text-xs text-slate-500">Compras y Contrataciones · acceso restringido</p>
        </div>
        <div className="space-y-3">
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-3 text-slate-400" />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" autoFocus className={field} />
          </div>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-3 text-slate-400" />
            <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Contraseña" className={field} />
          </div>
        </div>
        {error && <div className="mt-3 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</div>}
        <button type="submit" disabled={busy} className="mt-5 w-full inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium rounded-lg py-2.5 text-sm">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />} Ingresar
        </button>
        <p className="mt-4 text-center text-[11px] text-slate-400">Usuarios gestionados en Supabase Auth</p>
      </form>
    </div>
  );
}
