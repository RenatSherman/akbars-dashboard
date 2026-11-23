'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError('Неверный email или пароль');
      setLoading(false);
    } else {
      // Переадресация на дашборд
      window.location.href = '/dashboard'; 
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-ak-green p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] pointer-events-none"></div>

      <div className="w-full max-w-md space-y-8 rounded-xl border border-ak-silver/30 bg-ak-green-dark/80 p-10 shadow-2xl relative z-10 backdrop-blur-sm">
        
        <div className="space-y-2 text-center">
          <h1 className="text-4xl font-black tracking-wider text-ak-white uppercase font-sans">
            Ак Барс
          </h1>
          <p className="text-xs font-bold text-ak-silver uppercase tracking-widest">
            Хоккейный трекер
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6 mt-8">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-ak-silver uppercase tracking-wider">Email тренера</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-ak-silver/50 bg-ak-green px-4 py-3 text-ak-white placeholder-ak-silver/40 focus:border-ak-red focus:outline-none focus:ring-2 focus:ring-ak-red transition-all"
              placeholder="coach@akbars.ru"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-ak-silver uppercase tracking-wider">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-ak-silver/50 bg-ak-green px-4 py-3 text-ak-white placeholder-ak-silver/40 focus:border-ak-red focus:outline-none focus:ring-2 focus:ring-ak-red transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="rounded-md bg-ak-red/20 p-3 text-sm font-bold text-ak-red border border-ak-red">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-ak-red py-3.5 text-sm font-black uppercase tracking-wider text-ak-white transition-all hover:bg-[#9a0c23] focus:outline-none focus:ring-2 focus:ring-ak-red focus:ring-offset-2 focus:ring-offset-ak-green-dark disabled:opacity-50"
          >
            {loading ? 'Вход...' : 'Войти в систему'}
          </button>
        </form>

        <div className="text-center text-[10px] text-ak-silver/50 mt-4">
          Вход для игроков будет доступен по PIN-коду
        </div>
      </div>
    </main>
  );
}