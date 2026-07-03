import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server.js';
import LoginForm from '@/components/LoginForm.jsx';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/');
  return <LoginForm />;
}
