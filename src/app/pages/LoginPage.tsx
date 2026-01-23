import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { motion } from 'motion/react';
import { toast } from 'sonner';

export const LoginPage: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { signIn, signUp } = useAuthContext();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        if (!fullName.trim()) {
          toast.error('Kérlek add meg a neved');
          setIsLoading(false);
          return;
        }
        await signUp(email, password, fullName);
        toast.success('Sikeres regisztráció! Jelentkezz be.');
        setIsSignUp(false);
        setPassword('');
      } else {
        await signIn(email, password);
        toast.success('Sikeres bejelentkezés!');
        navigate('/feeds');
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast.error(error.message || 'Hiba történt');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-stone-900 mb-2">
            Instagram Feed Planner
          </h1>
          <p className="text-stone-600">
            {isSignUp ? 'Hozz létre egy új fiókot' : 'Jelentkezz be a folytatáshoz'}
          </p>
        </div>

        <div className="bg-white border-2 border-stone-200 rounded-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Teljes név
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Kovács János"
                  className="w-full px-4 py-3 border-2 border-stone-200 rounded-lg focus:border-stone-600 focus:ring-2 focus:ring-stone-200 outline-none transition-all"
                  required={isSignUp}
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
                placeholder="email@example.com"
                className="w-full px-4 py-3 border-2 border-stone-200 rounded-lg focus:border-stone-600 focus:ring-2 focus:ring-stone-200 outline-none transition-all"
                required
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
                placeholder="••••••••"
                className="w-full px-4 py-3 border-2 border-stone-200 rounded-lg focus:border-stone-600 focus:ring-2 focus:ring-stone-200 outline-none transition-all"
                required
                minLength={6}
              />
              {isSignUp && (
                <p className="text-xs text-stone-500 mt-1">
                  Minimum 6 karakter
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-6 py-3 bg-stone-800 text-white rounded-lg hover:bg-stone-900 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isLoading
                ? 'Betöltés...'
                : isSignUp
                ? 'Regisztráció'
                : 'Bejelentkezés'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setPassword('');
                setFullName('');
              }}
              className="text-sm text-stone-600 hover:text-stone-900 transition-colors"
            >
              {isSignUp ? (
                <>
                  Már van fiókod?{' '}
                  <span className="font-semibold">Jelentkezz be</span>
                </>
              ) : (
                <>
                  Még nincs fiókod?{' '}
                  <span className="font-semibold">Regisztrálj</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
