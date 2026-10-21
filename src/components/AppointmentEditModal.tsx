import React, { useState, useEffect, useMemo, useRef } from 'react';
import { VisitReport, BuyerProfile, Exhibitor, TradeShow, VisitStatus } from '../types';
import { formatToFrenchDate } from '../utils/dateUtils';
import {
  X,
  Calendar,
  Clock,
  Building,
  CheckCircle2,
  Save,
  Trash2,
  Search,
  Camera
} from 'lucide-react';

interface AppointmentEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  tradeShow: TradeShow | null;
  currentBuyer: BuyerProfile | null;
  allBuyers: BuyerProfile[];
  exhibitors: Exhibitor[];
  appointment?: VisitReport | null;
  onSave: (data: Omit<VisitReport, 'id' | 'updatedAt'> & { id?: string }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onOpenVisitNotes?: (visit: VisitReport) => void;
}

export const AppointmentEditModal: React.FC<AppointmentEditModalProps> = ({
  isOpen,
  onClose,
  tradeShow,
  currentBuyer,
  allBuyers,
  exhibitors,
  appointment,
  onSave,
  onDelete,
  onOpenVisitNotes
}) => {
  const [exhibitorSearch, setExhibitorSearch] = useState('');
  const [selectedExhibitor, setSelectedExhibitor] = useState<Exhibitor | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState('');
  const [standNumber, setStandNumber] = useState('');
  const [hall, setHall] = useState('Principal');
  const [buyerId, setBuyerId] = useState(currentBuyer?.id || 'ppl');
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('10:00');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [status, setStatus] = useState<VisitStatus>('confirmed');
  const [product, setProduct] = useState('');
  const [contact, setContact] = useState('');
  const [notes, setNotes] = useState('');

  // Fermer suggestions au clic en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setShowSuggestions(false);
      return;
    }

    setShowSuggestions(false);

    if (appointment) {
      setTitle(appointment.exhibitorName);
      setExhibitorSearch(appointment.exhibitorName);
      setStandNumber(appointment.standNumber || '');
      setHall(appointment.hall || 'Principal');
      setBuyerId(appointment.buyerId || currentBuyer?.id || 'ppl');
      setDate(appointment.date || '');
      setTimeSlot(appointment.timeSlot || '10:00');
      setDurationMinutes(appointment.durationMinutes || 30);
      setStatus(appointment.status || 'confirmed');
      setProduct(appointment.product || '');
      setContact(appointment.contact || '');
      setNotes(appointment.notes || '');

      const found = exhibitors.find(
        (e) => e.standNumber.toLowerCase().trim() === appointment.standNumber.toLowerCase().trim()
      );
      setSelectedExhibitor(found || null);
    } else {
      setTitle('');
      setExhibitorSearch('');
      setSelectedExhibitor(null);
      setStandNumber('');
      setHall(tradeShow?.halls[0] || 'Principal');
      setBuyerId(currentBuyer?.id || 'ppl');
      setDate(tradeShow?.startDate || new Date().toISOString().slice(0, 10));
      setTimeSlot('10:00');
      setDurationMinutes(30);
      setStatus('confirmed');
      setProduct('');
      setContact('');
      setNotes('');
    }
  }, [isOpen, appointment, tradeShow, currentBuyer, exhibitors]);

  // Filtrage des suggestions d'exposants
  const exhibitorSuggestions = useMemo(() => {
    const q = exhibitorSearch.trim().toLowerCase();
    if (q.length < 2) return [];
    return exhibitors
      .filter((e) => e.name.toLowerCase().includes(q) || e.standNumber.toLowerCase().includes(q))
      .slice(0, 6);
  }, [exhibitorSearch, exhibitors]);

  const handleSelectExhibitor = (ex: Exhibitor) => {
    setSelectedExhibitor(ex);
    setTitle(ex.name);
    setExhibitorSearch(ex.name);
    setStandNumber(ex.standNumber);
    setHall(ex.hall);
    setShowSuggestions(false); // Fermeture immédiate de la liste
    if (!product && ex.activity) setProduct(ex.activity);
    if (!contact && ex.contactName) setContact(`Contact : ${ex.contactName}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await onSave({
      id: appointment?.id,
      tradeShowId: tradeShow?.id || 'default',
      buyerId,
      exhibitorName: title.trim(),
      standNumber: standNumber.trim(),
      hall: hall.trim(),
      date,
      timeSlot,
      durationMinutes,
      status,
      product: product.trim(),
      contact: contact.trim(),
      notes: notes.trim(),
      rating: appointment?.rating || 3,
      businessCardUrl: appointment?.businessCardUrl,
      businessCardUrls: appointment?.businessCardUrls,
      standPhotoUrl: appointment?.standPhotoUrl,
      standPhotoUrls: appointment?.standPhotoUrls
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-600/30 text-orange-400">
              <Calendar className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {appointment ? 'Modifier le Rendez-vous' : 'Nouveau Rendez-vous'}
              </h2>
              <p className="text-[11px] text-slate-300">{tradeShow?.name}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 overflow-y-auto flex-1 text-xs">
          
          {/* Recherche Exposant avec Fermeture Instantanée */}
          <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <label className="block text-[11px] font-bold uppercase text-slate-700">
              Recherche Exposant ou Stand *
            </label>
            <div className="relative" ref={searchContainerRef}>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={exhibitorSearch}
                  onFocus={() => {
                    if (exhibitorSuggestions.length > 0) setShowSuggestions(true);
                  }}
                  onChange={(e) => {
                    setExhibitorSearch(e.target.value);
                    setTitle(e.target.value);
                    setShowSuggestions(true);
                    if (selectedExhibitor && selectedExhibitor.name !== e.target.value) {
                      setSelectedExhibitor(null);
                    }
                  }}
                  placeholder="Tapez un nom d'exposant ou stand..."
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 pr-8 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                />
                {exhibitorSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setExhibitorSearch('');
                      setSelectedExhibitor(null);
                      setShowSuggestions(false);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    title="Effacer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Suggestions Dropdown */}
              {showSuggestions && exhibitorSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 z-30 overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {exhibitorSuggestions.map((ex) => (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => handleSelectExhibitor(ex)}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between text-xs transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-bold text-slate-900 truncate">{ex.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{ex.activity}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 font-mono text-[11px]">
                        <span className="bg-red-600 text-white font-bold px-1.5 py-0.5 rounded">
                          {ex.standNumber}
                        </span>
                        <span className="text-slate-400">{ex.hall}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Badge Exposant Validé */}
              {selectedExhibitor && !showSuggestions && (
                <div className="mt-2 flex items-center justify-between gap-2 p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span className="truncate">
                      Exposant validé : <strong className="font-bold">{selectedExhibitor.name}</strong>
                    </span>
                  </div>
                  <span className="font-mono font-bold bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded flex-shrink-0">
                    {selectedExhibitor.standNumber}
                  </span>
                </div>
              )}
            </div>

            {/* Stand & Hall */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  N° de Stand
                </label>
                <input
                  type="text"
                  value={standNumber}
                  onChange={(e) => setStandNumber(e.target.value)}
                  placeholder="Ex: 5a D094"
                  className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Hall / Zone
                </label>
                <input
                  type="text"
                  value={hall}
                  onChange={(e) => setHall(e.target.value)}
                  placeholder="Hall 5a"
                  className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Date, Heure, Durée */}
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1 flex items-center justify-between">
                <span>Date</span>
                {date && <span className="font-mono text-[10px] text-orange-600 font-bold">({formatToFrenchDate(date)})</span>}
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                Heure
              </label>
              <input
                type="time"
                required
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-mono font-semibold focus:outline-hidden focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                Durée (min)
              </label>
              <input
                type="number"
                min={10}
                max={240}
                step={5}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 30)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-mono font-semibold focus:outline-hidden focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Acheteur Assigné & Statut */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                Acheteur assigné
              </label>
              <select
                value={buyerId}
                onChange={(e) => setBuyerId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
              >
                {allBuyers.map((b) => (
                  <option key={b.id} value={b.id}>{b.name} ({b.initials})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                Statut du créneau
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as VisitStatus)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
              >
                <option value="confirmed">RDV Confirmé</option>
                <option value="todo">À visiter</option>
                <option value="spontaneous">Spontané</option>
                <option value="visited">Visité</option>
                <option value="cancelled">Annulé</option>
              </select>
            </div>
          </div>

          {/* Produits & Notes */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
              Produits / Sujet de la réunion
            </label>
            <input
              type="text"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder="Ex: Négociation annuelle tarifs 2027..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
              Notes préparatoires
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Points à aborder, litiges en cours, gammes cibles..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            {appointment && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Supprimer le créneau de ${appointment.exhibitorName} ?`)) {
                    onDelete(appointment.id);
                    onClose();
                  }
                }}
                className="text-red-600 hover:bg-red-50 p-2 rounded-xl text-xs font-bold flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              {appointment && onOpenVisitNotes && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenVisitNotes(appointment);
                  }}
                  className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
                  title="Ouvrir la fiche complète pour prendre des photos et dicter au micro"
                >
                  <Camera className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Photos & Dictée IA</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs"
              >
                Enregistrer le RDV
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
