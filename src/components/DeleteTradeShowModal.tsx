import React, { useState } from 'react';
import { TradeShow } from '../types';
import { X, AlertTriangle, Trash2, KeyRound } from 'lucide-react';

interface DeleteTradeShowModalProps {
  isOpen: boolean;
  onClose: () => void;
  tradeShow: TradeShow | null;
  visitsCount: number;
  onConfirmDelete: (tradeShowId: string) => Promise<void>;
}

export const DeleteTradeShowModal: React.FC<DeleteTradeShowModalProps> = ({
  isOpen,
  onClose,
  tradeShow,
  visitsCount,
  onConfirmDelete
}) => {
  const [code, setCode] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !tradeShow) return null;

  const isCodeValid = code.trim().toUpperCase() === 'CORETRADE';

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCodeValid) {
      setErrorMsg('Code incorrect. Vous devez taper le mot CORETRADE.');
      return;
    }

    try {
      setIsDeleting(true);
      await onConfirmDelete(tradeShow.id);
      setCode('');
      setErrorMsg('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la suppression.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-red-200 overflow-hidden flex flex-col">
        
        {/* Header Danger */}
        <div className="px-5 py-4 bg-red-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/20 text-white">
              <AlertTriangle className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Supprimer ce salon</h2>
              <p className="text-[11px] text-red-100">Zone d'action sécurisée</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleDelete} className="p-5 space-y-4 text-xs">
          
          <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-red-900 space-y-1">
            <p className="font-bold text-xs">
              Attention : vous allez supprimer « {tradeShow.name} »
            </p>
            <p className="text-[11px] text-red-700 leading-relaxed">
              Cette action est irréversible. L'ensemble des <strong>{visitsCount} fiche(s) de visites</strong>, photos de cartes et de stands associées à ce salon seront définitivement effacées de la base locale.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1.5">
              Pour confirmer la suppression, tapez le code <span className="font-mono text-red-600 font-black">CORETRADE</span> :
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Tapez CORETRADE"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono font-bold uppercase tracking-wider focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:bg-white"
              />
            </div>
            {errorMsg && (
              <p className="text-[11px] text-red-600 font-bold mt-1">{errorMsg}</p>
            )}
          </div>

          {/* Footer Submit */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!isCodeValid || isDeleting}
              className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-40 flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? 'Suppression...' : 'Supprimer définitivement'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
