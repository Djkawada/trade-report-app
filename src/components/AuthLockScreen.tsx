import React, { useState } from 'react';
import { Lock, KeyRound, ShieldAlert, ArrowRight, Building } from 'lucide-react';

interface AuthLockScreenProps {
  onAuthenticated: () => void;
}

export const AuthLockScreen: React.FC<AuthLockScreenProps> = ({ onAuthenticated }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().toUpperCase() === 'CORETRADE') {
      localStorage.setItem('trade_report_authenticated', 'true');
      onAuthenticated();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-orange-950 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-white/20 text-slate-900 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Logo & Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-orange-600 text-white font-black text-2xl flex items-center justify-center mx-auto shadow-lg shadow-orange-600/30">
            TR
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            TradeReport CoreTrade
          </h1>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Plateforme interne de reporting et suivi des visites sur les salons professionnels
          </p>
        </div>

        {/* Formulaire de déverrouillage */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-orange-600" />
              <span>Code d'accès requis</span>
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Entrez le code d'accès"
                className={`w-full bg-slate-50 border rounded-2xl pl-10 pr-4 py-3 text-sm font-bold tracking-wider focus:outline-hidden focus:ring-2 focus:bg-white transition-all ${
                  error
                    ? 'border-red-500 focus:ring-red-500 text-red-600'
                    : 'border-slate-300 focus:ring-orange-500 text-slate-900'
                }`}
              />
            </div>
            {error && (
              <p className="text-xs text-red-600 font-bold mt-1.5 flex items-center gap-1 animate-in fade-in">
                <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Code d'accès incorrect. Veuillez réessayer.</span>
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-2xl font-bold text-sm shadow-md shadow-orange-600/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98"
          >
            <span>Accéder à l'application</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400">
            Accès réservé aux équipes du groupe CoreTrade
          </p>
        </div>

      </div>
    </div>
  );
};
