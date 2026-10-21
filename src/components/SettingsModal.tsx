import React, { useState } from 'react';
import { GeminiService } from '../services/geminiService';
import { X, Key, ShieldCheck, RefreshCw, CheckCircle2 } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState(GeminiService.getApiKey());
  const [saved, setSaved] = useState(false);
  const isCustom = GeminiService.isUsingCustomKey();

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    GeminiService.setApiKey(apiKey);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1200);
  };

  const handleReset = () => {
    GeminiService.resetToDefaultApiKey();
    setApiKey(GeminiService.getDefaultApiKey());
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-600/30 text-orange-400">
              <Key className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Configuration IA Gemini</h2>
              <p className="text-[11px] text-slate-300">Scan des cartes de visite & Import catalogue</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
          {saved && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="font-bold">Clé API mise à jour avec succès !</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
              Clé API Google Gemini
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AQ.Ab8..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
            />
            <p className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline" />
              {isCustom
                ? 'Clé personnelle enregistrée dans votre navigateur.'
                : 'Clé par défaut de l’équipe CoreTrade active.'}
            </p>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            {isCustom && (
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Rétablir clé CoreTrade</span>
              </button>
            )}
            <div className="flex gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs"
              >
                Fermer
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};
