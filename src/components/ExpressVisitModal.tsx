import React, { useState, useMemo } from 'react';
import { Exhibitor, TradeShow, BuyerProfile, VisitReport } from '../types';
import { X, Zap, Search, Building } from 'lucide-react';

interface ExpressVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  tradeShow: TradeShow | null;
  currentBuyer: BuyerProfile | null;
  exhibitors: Exhibitor[];
  onSelectAndOpenNotes: (initialVisitData: Omit<VisitReport, 'id' | 'updatedAt'>) => void;
}

export const ExpressVisitModal: React.FC<ExpressVisitModalProps> = ({
  isOpen,
  onClose,
  tradeShow,
  currentBuyer,
  exhibitors,
  onSelectAndOpenNotes
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Suggestions filtrées
  const filteredSuggestions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (q.length < 1) return [];

    return exhibitors
      .filter((e) => {
        const standMatch = e.standNumber.toLowerCase().includes(q);
        const nameMatch = e.name.toLowerCase().includes(q);
        const actMatch = e.activity?.toLowerCase().includes(q);
        return standMatch || nameMatch || actMatch;
      })
      .slice(0, 8);
  }, [searchTerm, exhibitors]);

  const getCurrentTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  const getInitialDate = () => {
    const today = new Date().toISOString().slice(0, 10);
    if (!tradeShow?.startDate) return today;
    if (today >= tradeShow.startDate && (!tradeShow.endDate || today <= tradeShow.endDate)) {
      return today;
    }
    return tradeShow.startDate;
  };

  const handleSelectExhibitor = (ex: Exhibitor) => {
    onSelectAndOpenNotes({
      tradeShowId: tradeShow?.id || 'default',
      buyerId: currentBuyer?.id || 'ppl',
      exhibitorName: ex.name,
      standNumber: ex.standNumber,
      hall: ex.hall || 'Principal',
      date: getInitialDate(),
      timeSlot: getCurrentTime(),
      durationMinutes: 20,
      status: 'spontaneous',
      product: ex.activity || '',
      contact: ex.contactName ? `Contact : ${ex.contactName}` : '',
      notes: '',
      rating: 3
    });
    onClose();
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    onSelectAndOpenNotes({
      tradeShowId: tradeShow?.id || 'default',
      buyerId: currentBuyer?.id || 'ppl',
      exhibitorName: searchTerm.trim(),
      standNumber: '',
      hall: tradeShow?.halls[0] || 'Principal',
      date: getInitialDate(),
      timeSlot: getCurrentTime(),
      durationMinutes: 20,
      status: 'spontaneous',
      product: '',
      contact: '',
      notes: '',
      rating: 3
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-amber-200 fill-amber-200" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">Visite Express</h2>
              <p className="text-[11px] text-white/80">Enregistrez votre stand en 5 secondes en arrivant sur place</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input */}
        <div className="p-4 sm:p-5 space-y-4">
          <form onSubmit={handleManualSubmit}>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Nom de l'exposant ou Numéro de stand :
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ex: Shibanuma, 5A B042, Fromagerie..."
                className="w-full text-sm bg-slate-50 border border-slate-300 rounded-2xl pl-10 pr-4 py-2.5 text-slate-900 font-semibold focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
              />
            </div>
          </form>

          {/* Suggestions */}
          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
            {filteredSuggestions.length > 0 ? (
              filteredSuggestions.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => handleSelectExhibitor(ex)}
                  className="w-full text-left p-3 rounded-2xl border border-slate-200 hover:border-orange-400 hover:bg-orange-50/50 transition-all flex items-center justify-between group"
                >
                  <div className="space-y-0.5 min-w-0 flex-1 pr-2">
                    <p className="text-xs font-bold text-slate-900 group-hover:text-orange-950 truncate">
                      {ex.name}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">{ex.activity || 'Exposant'}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 font-mono text-[11px]">
                    {ex.standNumber && (
                      <span className="bg-red-600 text-white font-bold px-2 py-0.5 rounded shadow-2xs">
                        {ex.standNumber}
                      </span>
                    )}
                    <span className="text-slate-400 text-xs">{ex.hall}</span>
                  </div>
                </button>
              ))
            ) : searchTerm.trim().length > 0 ? (
              <button
                type="button"
                onClick={handleManualSubmit}
                className="w-full p-3 rounded-2xl border border-dashed border-orange-400 bg-orange-50/40 text-orange-950 hover:bg-orange-100 transition-all text-left flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-bold">Créer la visite « {searchTerm.trim()} »</p>
                  <p className="text-[10px] text-orange-700">Non trouvé dans le catalogue, création à la volée</p>
                </div>
                <span className="text-xs font-bold bg-orange-600 text-white px-2.5 py-1 rounded-xl">
                  Créer ➔
                </span>
              </button>
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">
                Commencez à taper pour rechercher dans les exposants du salon ou créer un stand libre.
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
