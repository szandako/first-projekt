import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, UserPlus, Loader2 } from 'lucide-react';

interface AuthFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onSignup: (email: string, password: string, name: string) => Promise<void>;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onLogin, onSignup }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await onLogin(email, password);
      } else {
        if (!name.trim()) {
          setError('A név megadása kötelező');
          setLoading(false);
          return;
        }
        await onSignup(email, password, name);
      }
    } catch (err: any) {
      setError(err.message || 'Hiba történt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-lg shadow-xl border border-stone-200 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">📸</div>
            <h1 className="text-3xl font-bold mb-2 text-stone-900">
              Instagram Feed Planner
            </h1>
            <p className="text-stone-600">
              {isLogin ? 'Jelentkezz be a folytatáshoz' : 'Hozz létre egy fiókot'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Név
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-stone-300 focus:border-stone-600 focus:ring-2 focus:ring-stone-200 outline-none transition-all"
                  placeholder="Teljes neved"
                  disabled={loading}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Email cím
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-stone-300 focus:border-stone-600 focus:ring-2 focus:ring-stone-200 outline-none transition-all"
                placeholder="pelda@email.com"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Jelszó
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-stone-300 focus:border-stone-600 focus:ring-2 focus:ring-stone-200 outline-none transition-all"
                placeholder="••••••••"
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-stone-800 text-white py-3 rounded-lg font-semibold hover:bg-stone-900 hover:shadow-lg transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Betöltés...</span>
                </>
              ) : (
                <>
                  {isLogin ? (
                    <>
                      <LogIn className="w-5 h-5" />
                      <span>Bejelentkezés</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      <span>Regisztráció</span>
                    </>
                  )}
                </>
              )}
            </button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-sm text-stone-600 hover:text-stone-900 transition-colors"
              disabled={loading}
            >
              {isLogin ? (
                <>
                  Nincs még fiókod?{' '}
                  <span className="font-semibold">Regisztrálj most</span>
                </>
              ) : (
                <>
                  Már van fiókod?{' '}
                  <span className="font-semibold">Jelentkezz be</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Info */}
        <p className="text-center text-xs text-stone-500 mt-6">
          Az adatokat biztonságosan tároljuk, de ez egy demonstrációs alkalmazás.
        </p>
      </motion.div>
    </div>
  );
};