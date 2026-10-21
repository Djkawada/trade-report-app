import React, { useState, useEffect } from 'react';
import { TradeShow } from '../types';
import { formatToFrenchDate } from '../utils/dateUtils';
import { X, Calendar, MapPin, Globe, Palette, Layers, Check, Sparkles } from 'lucide-react';

interface TradeShowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (tradeShowData: Omit<TradeShow, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdate?: (tradeShow: TradeShow) => Promise<void>;
  tradeShowToEdit?: TradeShow | null;
}

const COLOR_PRESETS = [
  { label: 'Rouge SIAL', hex: '#E2001A' },
  { label: 'Orange CoreTrade', hex: '#EA580C' },
  { label: 'Bleu Sirha', hex: '#0284C7' },
  { label: 'Ambre Anuga', hex: '#D97706' },
  { label: 'Émeraude Bio', hex: '#059669' },
  { label: 'Violet Gourmet', hex: '#7C3AED' }
];

export const TradeShowModal: React.FC<TradeShowModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  onUpdate,
  tradeShowToEdit
}) => {
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('France');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [color, setColor] = useState('#EA580C');
  const [hallsInput, setHallsInput] = useState('Hall 1, Hall 2, Hall 3, Hall 4, Hall 5');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (tradeShowToEdit) {
        setName(tradeShowToEdit.name || '');
        setShortName(tradeShowToEdit.shortName || '');
        setCity(tradeShowToEdit.city || '');
        setCountry(tradeShowToEdit.country || 'France');
        setStartDate(tradeShowToEdit.startDate || '');
        setEndDate(tradeShowToEdit.endDate || '');
        setColor(tradeShowToEdit.color || '#EA580C');
        setHallsInput((tradeShowToEdit.halls || []).join(', '));
        setWebsiteUrl(tradeShowToEdit.websiteUrl || '');
        setNotes(tradeShowToEdit.notes || '');
      } else {
        setName('');
        setShortName('');
        setCity('');
        setCountry('France');
        setStartDate('');
        setEndDate('');
        setColor('#EA580C');
        setHallsInput('Hall 1, Hall 2, Hall 3, Hall 4, Hall 5');
        setWebsiteUrl('');
        setNotes('');
      }
    }
  }, [isOpen, tradeShowToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      const halls = hallsInput
        .split(',')
        .map((h) => h.trim())
        .filter((h) => h.length > 0);

      if (tradeShowToEdit && onUpdate) {
        await onUpdate({
          ...tradeShowToEdit,
          name: name.trim(),
          shortName: shortName.trim().toUpperCase() || name.slice(0, 6).toUpperCase(),
          city: city.trim() || 'France',
          country: country.trim() || 'France',
          startDate: startDate || new Date().toISOString().slice(0, 10),
          endDate: endDate || startDate || new Date().toISOString().slice(0, 10),
          color,
          halls: halls.length > 0 ? halls : ['Principal'],
          websiteUrl: websiteUrl.trim(),
          notes: notes.trim(),
          updatedAt: Date.now()
        });
      } else {
        await onCreate({
          name: name.trim(),
          shortName: shortName.trim().toUpperCase() || name.slice(0, 6).toUpperCase(),
          city: city.trim() || 'France',
          country: country.trim() || 'France',
          startDate: startDate || new Date().toISOString().slice(0, 10),
          endDate: endDate || startDate || new Date().toISOString().slice(0, 10),
          color,
          halls: halls.length > 0 ? halls : ['Principal'],
          websiteUrl: websiteUrl.trim(),
          notes: notes.trim()
        });
      }

      onClose();
    } catch (err) {
      console.error('Erreur enregistrement salon:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-600/30 text-orange-400">
              <Calendar className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {tradeShowToEdit ? `Modifier le Salon : ${tradeShowToEdit.shortName || tradeShowToEdit.name}` : 'Nouveau Salon / Événement'}
              </h2>
              <p className="text-[11px] text-slate-300">
                {tradeShowToEdit ? 'Ajustez les dates, informations et halls du salon' : 'Créez un nouvel espace de reporting pour votre équipe'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          
          {/* Nom du Salon */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
              Nom officiel du salon *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!shortName) {
                  setShortName(e.target.value.split(' ')[0] || '');
                }
              }}
              placeholder="Ex: Sirha Lyon 2027, Anuga 2027, CoreTrade Japan..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
            />
          </div>

          {/* Nom court & Couleur */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                Sigle / Nom court
              </label>
              <input
                type="text"
                value={shortName}
                onChange={(e) => setShortName(e.target.value.toUpperCase())}
                placeholder="Ex: SIRHA, ANUGA"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                Couleur de thème
              </label>
              <div className="flex items-center gap-1.5 pt-1">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setColor(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform ${
                      color === c.hex ? 'scale-110 ring-2 ring-offset-2 ring-slate-800' : 'hover:scale-105'
                    }`}
                    title={c.label}
                  >
                    {color === c.hex && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Lieu & Pays */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                Ville / Lieu
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: Eurexpo Lyon, Tokyo Big Sight"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                Pays
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Ex: France, Japon, Allemagne"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1 flex items-center justify-between">
                <span>Date de début</span>
                {startDate && <span className="font-mono text-[10px] text-orange-600 font-bold">({formatToFrenchDate(startDate)})</span>}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1 flex items-center justify-between">
                <span>Date de fin</span>
                {endDate && <span className="font-mono text-[10px] text-orange-600 font-bold">({formatToFrenchDate(endDate)})</span>}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Halls / Secteurs */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
              Halls / Secteurs (séparés par des virgules)
            </label>
            <input
              type="text"
              value={hallsInput}
              onChange={(e) => setHallsInput(e.target.value)}
              placeholder="Ex: Hall 1, Hall 2, Hall 3, Pavillon International"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Ces halls apparaîtront dans les listes déroulantes pour classer vos visites.
            </p>
          </div>

          {/* Site Web */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
              Site web officiel (optionnel)
            </label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://www.exemple-salon.com"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
            />
          </div>

          {/* Objectifs / Notes */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
              Objectifs de l'équipe CoreTrade sur ce salon
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Sourcing sauces asiatiques, rencontre partenaires européens, veille packaging..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50"
            >
              {isSubmitting
                ? 'Enregistrement en cours...'
                : tradeShowToEdit
                  ? 'Enregistrer les modifications'
                  : 'Créer et basculer sur ce salon'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
