import React, { useState, useMemo, useEffect } from 'react';
import { VisitReport, BuyerProfile, TradeShow } from '../types';
import {
  formatToFrenchDate,
  formatFrenchDayWithDate,
  formatFrenchFullWeekdayWithDate
} from '../utils/dateUtils';
import {
  Calendar,
  Clock,
  Building,
  User,
  Plus,
  Zap,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  CalendarDays,
  List,
  AlertTriangle,
  Star,
  Layers,
  Sparkles
} from 'lucide-react';

interface GlobalScheduleViewProps {
  visits: VisitReport[];
  tradeShow: TradeShow | null;
  allBuyers: BuyerProfile[];
  currentBuyer: BuyerProfile | null;
  onOpenVisitNotes: (visit: VisitReport) => void;
  onOpenNewAppointment: (defaultDate?: string, defaultTime?: string) => void;
}

// Fonction utilitaire pour mapper n'importe quelle heure (ex: 11:24, 14:15, 08:42) sur un créneau de 30 minutes
function getNearestSlot(timeStr: string | undefined, availableSlots: string[]): string {
  if (!timeStr || !timeStr.trim()) return '10:00';
  if (availableSlots.includes(timeStr)) return timeStr;

  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h)) return '10:00';
  const totalMin = h * 60 + (isNaN(m) ? 0 : m);

  // Si l'heure est antérieure au premier créneau
  const [firstH, firstM] = availableSlots[0].split(':').map(Number);
  if (totalMin <= firstH * 60 + firstM) {
    return availableSlots[0];
  }

  // Si l'heure est postérieure au dernier créneau
  const [lastH, lastM] = availableSlots[availableSlots.length - 1].split(':').map(Number);
  if (totalMin >= lastH * 60 + lastM) {
    return availableSlots[availableSlots.length - 1];
  }

  // Chercher l'intervalle [slotMin, slotMin + 30)
  for (const slot of availableSlots) {
    const [sh, sm] = slot.split(':').map(Number);
    const slotMin = sh * 60 + sm;
    if (totalMin >= slotMin && totalMin < slotMin + 30) {
      return slot;
    }
  }

  // Fallback au créneau le plus proche
  let bestSlot = availableSlots[0];
  let minDiff = Infinity;
  for (const slot of availableSlots) {
    const [sh, sm] = slot.split(':').map(Number);
    const slotMin = sh * 60 + sm;
    const diff = Math.abs(totalMin - slotMin);
    if (diff < minDiff) {
      minDiff = diff;
      bestSlot = slot;
    }
  }
  return bestSlot;
}

export const GlobalScheduleView: React.FC<GlobalScheduleViewProps> = ({
  visits,
  tradeShow,
  allBuyers,
  currentBuyer,
  onOpenVisitNotes,
  onOpenNewAppointment
}) => {
  // Mode d'affichage : 'week' (vue calendrier Outlook semaine) ou 'day' (vue journée timeline)
  const [calendarMode, setCalendarMode] = useState<'week' | 'day'>('week');

  // Filtre acheteur sélectionné : par défaut l'acheteur connecté (ex: Lead Developer)
  const [selectedBuyerId, setSelectedBuyerId] = useState<string>(currentBuyer?.id || 'all');

  // Synchronisation automatique si l'acheteur connecté change (au login / navbar)
  useEffect(() => {
    if (currentBuyer?.id) {
      setSelectedBuyerId(currentBuyer.id);
    }
  }, [currentBuyer?.id]);

  // Filtre par type / statut : 'all' (tous), 'spontaneous' (visites spontanées), 'confirmed' (RDV), 'visited' (visités)
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'spontaneous' | 'confirmed' | 'visited'>('all');

  // Date du jour pour la vue journée
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Pagination semaine si le salon dure plus de 7 jours
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Date du jour actuel (format YYYY-MM-DD)
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Liste ordonnée de tous les jours du salon
  // Liste ordonnée de tous les jours du salon
  const tradeShowDays = useMemo(() => {
    if (!tradeShow?.startDate) {
      const today = new Date().toISOString().slice(0, 10);
      return [{ date: today, label: "Aujourd'hui" }];
    }

    const [startYear, startMonth, startDay] = tradeShow.startDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = (tradeShow.endDate || tradeShow.startDate).split('-').map(Number);

    const start = new Date(startYear, startMonth - 1, startDay, 12, 0, 0);
    const end = new Date(endYear, endMonth - 1, endDay, 12, 0, 0);
    const days: { date: string; label: string }[] = [];

    const current = new Date(start);
    while (current <= end) {
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const d = String(current.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;

      const dayName = current.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '');
      const dayNum = current.getDate();
      days.push({
        date: dateStr,
        label: formatFrenchDayWithDate(dateStr)
      });

      current.setDate(current.getDate() + 1);
    }

    return days.length > 0 ? days : [{ date: tradeShow.startDate, label: 'Jour 1' }];
  }, [tradeShow]);

  // Synchronisation de la date sélectionnée
  useEffect(() => {
    if (tradeShowDays.length > 0 && !tradeShowDays.some((d) => d.date === selectedDate)) {
      setSelectedDate(tradeShowDays[0].date);
    }
  }, [tradeShowDays, selectedDate]);

  // Créneaux horaires de 08:30 à 18:30
  const timeSlots = useMemo(
    () => [
      '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00',
      '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'
    ],
    []
  );

  // Pagination des jours pour la vue semaine (7 jours par page si salon long)
  const daysPerPage = 7;
  const totalPages = Math.ceil(tradeShowDays.length / daysPerPage);
  const displayedWeekDays = useMemo(() => {
    if (tradeShowDays.length <= 7) return tradeShowDays;
    const start = weekOffset * daysPerPage;
    return tradeShowDays.slice(start, start + daysPerPage);
  }, [tradeShowDays, weekOffset]);

  const getBuyerObj = (buyerId: string) => allBuyers.find((b) => b.id === buyerId);

  // Helper pour garantir qu'une visite (même enregistrée pré-salon en test) s'affiche TOUJOURS sur le calendrier
  const getVisitDisplayDate = (v: VisitReport): string => {
    if (!v.date) return tradeShow?.startDate || todayStr;
    // Si la date fait bien partie des jours du salon
    if (tradeShowDays.some((d) => d.date === v.date)) {
      return v.date;
    }
    // Si la date est antérieure au début du salon (ex: test pré-salon créé aujourd'hui)
    if (tradeShow?.startDate && v.date < tradeShow.startDate) {
      return tradeShow.startDate;
    }
    // Si la date est postérieure à la fin du salon
    if (tradeShow?.endDate && v.date > tradeShow.endDate) {
      return tradeShow.endDate;
    }
    return tradeShow?.startDate || v.date;
  };

  // Visites filtrées par acheteur et par type de visite
  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      if (selectedBuyerId !== 'all' && v.buyerId !== selectedBuyerId) return false;
      if (selectedStatusFilter === 'spontaneous' && v.status !== 'spontaneous') return false;
      if (selectedStatusFilter === 'confirmed' && v.status !== 'confirmed') return false;
      if (selectedStatusFilter === 'visited' && v.status !== 'visited') return false;
      return true;
    });
  }, [visits, selectedBuyerId, selectedStatusFilter]);

  // Regroupement rapide des visites par date et créneau (clé: "YYYY-MM-DD___HH:MM")
  const visitsByDateAndSlot = useMemo(() => {
    const map = new Map<string, VisitReport[]>();
    filteredVisits.forEach((v) => {
      const displayDate = getVisitDisplayDate(v);
      const assignedSlot = getNearestSlot(v.timeSlot, timeSlots);
      const key = `${displayDate}___${assignedSlot}`;
      const list = map.get(key) || [];
      list.push(v);
      map.set(key, list);
    });
    return map;
  }, [filteredVisits, timeSlots, tradeShow, tradeShowDays]);

  // Visites du jour sélectionné (vue journée)
  const dayVisits = useMemo(() => {
    return filteredVisits.filter((v) => {
      const displayDate = getVisitDisplayDate(v);
      return displayDate === selectedDate;
    });
  }, [filteredVisits, selectedDate, tradeShow, tradeShowDays]);

  // Regrouper par créneau pour la vue journée
  const dayVisitsBySlot = useMemo(() => {
    const map = new Map<string, VisitReport[]>();
    dayVisits.forEach((v) => {
      const slot = getNearestSlot(v.timeSlot, timeSlots);
      const existing = map.get(slot) || [];
      existing.push(v);
      map.set(slot, existing);
    });
    return map;
  }, [dayVisits, timeSlots]);

  // Statistiques globales de la sélection
  const stats = useMemo(() => {
    const total = visits.filter((v) => selectedBuyerId === 'all' || v.buyerId === selectedBuyerId).length;
    const spontaneous = visits.filter((v) => (selectedBuyerId === 'all' || v.buyerId === selectedBuyerId) && v.status === 'spontaneous').length;
    const confirmed = visits.filter((v) => (selectedBuyerId === 'all' || v.buyerId === selectedBuyerId) && v.status === 'confirmed').length;
    const visited = visits.filter((v) => (selectedBuyerId === 'all' || v.buyerId === selectedBuyerId) && v.status === 'visited').length;
    const cards = visits.filter((v) => selectedBuyerId === 'all' || v.buyerId === selectedBuyerId).reduce((acc, v) => {
      const c = (v.businessCardUrls && v.businessCardUrls.length > 0)
        ? v.businessCardUrls.length
        : (v.businessCardUrl ? 1 : 0);
      return acc + c;
    }, 0);
    return { total, spontaneous, confirmed, visited, cards };
  }, [visits, selectedBuyerId]);

  return (
    <div className="space-y-4">
      
      {/* 1. BARRE D'OUTILS PRINCIPALE : MODE CALENDRIER, FILTRES ET STATS */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3.5">
        
        {/* Ligne Supérieure : Basculeur Vue Semaine / Vue Jour & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          <div className="flex items-center gap-2 flex-wrap">
            {/* Basculeur Outlook Semaine vs Jour */}
            <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setCalendarMode('week')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  calendarMode === 'week'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                title="Vue globale calendrier sur toute la semaine / salon (style Outlook)"
              >
                <CalendarDays className="w-4 h-4 text-orange-600" />
                <span>Vue Semaine (Outlook)</span>
              </button>

              <button
                type="button"
                onClick={() => setCalendarMode('day')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  calendarMode === 'day'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                title="Vue chronologique détaillée d'une journée heure par heure"
              >
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Vue Journée</span>
              </button>
            </div>

            {/* Filtre Type de Visites (Tous, Spontanés, RDV, Visités) */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setSelectedStatusFilter('all')}
                className={`px-2.5 py-1 rounded-xl font-bold transition-all ${
                  selectedStatusFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tous ({stats.total})
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatusFilter('spontaneous')}
                className={`px-2.5 py-1 rounded-xl font-bold transition-all flex items-center gap-1 ${
                  selectedStatusFilter === 'spontaneous'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'text-purple-700 hover:bg-purple-50'
                }`}
                title="Afficher uniquement les visites spontanées"
              >
                <Zap className="w-3 h-3 fill-current" />
                <span>Spontanés ({stats.spontaneous})</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatusFilter('confirmed')}
                className={`px-2.5 py-1 rounded-xl font-bold transition-all flex items-center gap-1 ${
                  selectedStatusFilter === 'confirmed'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-blue-700 hover:bg-blue-50'
                }`}
                title="Afficher uniquement les rendez-vous confirmés"
              >
                <Calendar className="w-3 h-3" />
                <span>RDV ({stats.confirmed})</span>
              </button>
            </div>

            {/* Pagination si plus de 7 jours */}
            {totalPages > 1 && calendarMode === 'week' && (
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1 text-xs font-semibold text-slate-700">
                <button
                  type="button"
                  disabled={weekOffset === 0}
                  onClick={() => setWeekOffset((prev) => Math.max(0, prev - 1))}
                  className="p-1 rounded hover:bg-white text-slate-600 disabled:opacity-30"
                  title="Semaine précédente"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-1 text-[11px] font-mono">
                  Semaine {weekOffset + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={weekOffset >= totalPages - 1}
                  onClick={() => setWeekOffset((prev) => Math.min(totalPages - 1, prev + 1))}
                  className="p-1 rounded hover:bg-white text-slate-600 disabled:opacity-30"
                  title="Semaine suivante"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Droite : Sélecteur Acheteur & Bouton Nouveau RDV */}
          <div className="flex items-center gap-2 flex-wrap justify-between md:justify-end">
            
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Acheteur :</span>
              <select
                value={selectedBuyerId}
                onChange={(e) => setSelectedBuyerId(e.target.value)}
                className="bg-slate-100 border-none rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">Toute l'équipe ({visits.length} RDV)</option>
                {allBuyers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.trigram})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => onOpenNewAppointment(selectedDate || tradeShowDays[0]?.date, '10:00')}
              className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau RDV</span>
            </button>

          </div>

        </div>

        {/* Ligne 2 : Bandeau interactif Acheteurs (Style Calendrier Partagé Outlook) */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase flex-shrink-0 mr-1">
            Équipe :
          </span>

          <button
            type="button"
            onClick={() => setSelectedBuyerId('all')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 ${
              selectedBuyerId === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>Tous</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
              selectedBuyerId === 'all' ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {visits.length}
            </span>
          </button>

          {allBuyers.map((b) => {
            const countForBuyer = visits.filter((v) => v.buyerId === b.id).length;
            const isSelected = selectedBuyerId === b.id;

            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedBuyerId(isSelected ? 'all' : b.id)}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 flex-shrink-0 border ${
                  isSelected
                    ? 'shadow-xs font-bold'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
                style={
                  isSelected
                    ? {
                        borderColor: b.color,
                        boxShadow: `0 0 0 2px ${b.color}`,
                        backgroundColor: `${b.color}15`,
                        color: b.color
                      }
                    : {}
                }
                title={`Afficher uniquement le planning de ${b.name}`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: b.color }}
                />
                <span>{b.name.split(' ')[0]}</span>
                {b.id === currentBuyer?.id && (
                  <span className={`text-[9px] uppercase px-1 py-0.2 rounded font-bold ${
                    isSelected ? 'bg-orange-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    Moi
                  </span>
                )}
                <span className="text-[10px] font-mono opacity-80">({countForBuyer})</span>
              </button>
            );
          })}
        </div>

        {/* Ligne 3 : En mode "Journée", onglets pour choisir le jour */}
        {calendarMode === 'day' && (
          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase flex-shrink-0 mr-1">
              Journée :
            </span>
            {tradeShowDays.map((day) => {
              const countOnDay = filteredVisits.filter((v) => getVisitDisplayDate(v) === day.date).length;
              const isSelected = selectedDate === day.date;
              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => setSelectedDate(day.date)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{day.label}</span>
                  {countOnDay > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {countOnDay}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

      </div>

      {/* 2. CONTENU PRINCIPAL SELON LE MODE CHOISI */}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODE A : VUE CALENDRIER OUTLOOK SUR LA SEMAINE / SALON        */}
      {/* ───────────────────────────────────────────────────────────── */}
      {calendarMode === 'week' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          
          {/* En-tête calendrier style Outlook */}
          <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-orange-600/30 text-orange-400">
                <CalendarDays className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 flex-wrap">
                  <span>
                    {selectedBuyerId === 'all'
                      ? "Planning Hebdomadaire de l'Équipe"
                      : selectedBuyerId === currentBuyer?.id
                      ? `Mon Planning (${currentBuyer.name})`
                      : `Planning de ${allBuyers.find((b) => b.id === selectedBuyerId)?.name || 'Acheteur'}`}
                  </span>
                  {tradeShow?.shortName && (
                    <span className="text-[10px] font-mono bg-white/20 text-white px-2 py-0.5 rounded-md">
                      {tradeShow.shortName}
                    </span>
                  )}
                </h2>
                <p className="text-[11px] text-slate-300">
                  Vue panoramique sur {displayedWeekDays.length} jour{displayedWeekDays.length > 1 ? 's' : ''} • {filteredVisits.length} visite(s) et RDV affiché(s)
                </p>
              </div>
            </div>

            {/* Badges récapitulatifs */}
            <div className="flex items-center gap-2 text-xs font-semibold flex-wrap">
              <span className="px-2.5 py-1 bg-purple-950/60 border border-purple-500/40 text-purple-300 rounded-lg flex items-center gap-1">
                <Zap className="w-3 h-3 fill-current text-purple-300" />
                <span>{stats.spontaneous} Spontanés</span>
              </span>
              <span className="px-2.5 py-1 bg-blue-950/60 border border-blue-500/40 text-blue-300 rounded-lg">
                📅 {stats.confirmed} RDV Confirmés
              </span>
              <span className="px-2.5 py-1 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 rounded-lg">
                ✅ {stats.visited} Visités
              </span>
            </div>
          </div>

          {/* Grille Hebdomadaire Style Outlook avec colonnes strictement fixes */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] table-fixed border-collapse select-none">
              <colgroup>
                <col className="w-20 sm:w-24" />
                {displayedWeekDays.map((day) => (
                  <col key={day.date} />
                ))}
              </colgroup>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 sticky top-0 z-10 shadow-xs">
                  {/* Colonne heure */}
                  <th className="w-20 sm:w-24 p-3 border-r border-slate-200 text-center text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider bg-slate-50">
                    <div className="flex items-center justify-center">
                      <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      <span>Heure</span>
                    </div>
                  </th>

                  {/* Colonnes des jours */}
                  {displayedWeekDays.map((day) => {
                    const [y, m, d] = day.date.split('-').map(Number);
                    const dayObj = new Date(y, m - 1, d, 12, 0, 0);
                    const dayNameLong = dayObj.toLocaleDateString('fr-FR', { weekday: 'long' });
                    const isToday = day.date === todayStr;

                    const dayVisitsList = filteredVisits.filter((v) => getVisitDisplayDate(v) === day.date);
                    const dayVisitsCount = dayVisitsList.length;
                    const spontaneousOnDay = dayVisitsList.filter((v) => v.status === 'spontaneous').length;

                    return (
                      <th
                        key={day.date}
                        className={`p-2.5 sm:p-3 border-r border-slate-200 last:border-r-0 transition-colors text-center font-normal ${
                          isToday ? 'bg-orange-50/70' : 'bg-slate-50'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDate(day.date);
                            setCalendarMode('day');
                          }}
                          className="group inline-flex flex-col items-center hover:opacity-80 transition-opacity w-full"
                          title="Cliquer pour basculer sur la vue détaillée de cette journée"
                        >
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-orange-600 transition-colors">
                            {dayNameLong}
                          </span>

                          <div className="flex items-center justify-center gap-1.5 mt-0.5 flex-wrap">
                            <span className={`text-xs sm:text-sm font-black px-2 py-0.5 rounded-lg font-mono ${
                              isToday
                                ? 'bg-orange-600 text-white shadow-2xs'
                                : 'text-slate-900'
                            }`}>
                              {formatToFrenchDate(day.date)}
                            </span>

                            {dayVisitsCount > 0 && (
                              <span className="text-[10px] font-mono font-bold bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full">
                                {dayVisitsCount}
                              </span>
                            )}

                            {spontaneousOnDay > 0 && (
                              <span
                                className="text-[9px] font-bold text-purple-700 bg-purple-100 border border-purple-200 px-1.5 py-0.2 rounded-full flex items-center gap-0.5"
                                title={`${spontaneousOnDay} visite(s) spontanée(s)`}
                              >
                                <Zap className="w-2.5 h-2.5 fill-current" />
                                <span>{spontaneousOnDay}</span>
                              </span>
                            )}
                          </div>

                          {isToday && (
                            <span className="text-[9px] font-bold text-orange-600 uppercase tracking-wider mt-0.5">
                              Aujourd'hui
                            </span>
                          )}
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {timeSlots.map((slot) => (
                  <tr key={slot} className="transition-colors hover:bg-slate-50/30">
                    
                    {/* Colonne heure fixe */}
                    <td className="w-20 sm:w-24 p-2 border-r border-slate-200 bg-slate-50/50 align-top text-center text-[11px] font-mono font-bold text-slate-500 whitespace-nowrap">
                      <span>{slot}</span>
                    </td>

                    {/* Cellules pour chaque jour */}
                    {displayedWeekDays.map((day) => {
                      const cellKey = `${day.date}___${slot}`;
                      const cellVisits = visitsByDateAndSlot.get(cellKey) || [];

                      // Détection de doublons : un même acheteur a-t-il plusieurs RDV à la même heure ?
                      const buyerAppointmentCount = new Map<string, number>();
                      cellVisits.forEach((v) => {
                        buyerAppointmentCount.set(v.buyerId, (buyerAppointmentCount.get(v.buyerId) || 0) + 1);
                      });

                      return (
                        <td
                          key={day.date}
                          className="border-r border-slate-100 last:border-r-0 p-1.5 align-top relative group hover:bg-slate-50/80 transition-colors"
                        >
                          <div className="min-w-0 w-full min-h-[58px] flex flex-col justify-start">
                            {cellVisits.length > 0 ? (
                              <div className="space-y-1.5 w-full min-w-0">
                                {cellVisits.map((v) => {
                                  const buyer = getBuyerObj(v.buyerId);
                                  const hasConflict = (buyerAppointmentCount.get(v.buyerId) || 0) > 1;
                                  const buyerColor = buyer?.color || '#2563EB';

                                  const cardPhotos = (v.businessCardUrls && v.businessCardUrls.length > 0)
                                    ? v.businessCardUrls.length
                                    : (v.businessCardUrl ? 1 : 0);
                                  const standPhotos = (v.standPhotoUrls && v.standPhotoUrls.length > 0)
                                    ? v.standPhotoUrls.length
                                    : (v.standPhotoUrl ? 1 : 0);

                                  const isSpontaneous = v.status === 'spontaneous';

                                  return (
                                    <div
                                      key={v.id}
                                      onClick={() => onOpenVisitNotes(v)}
                                      className={`rounded-xl border shadow-2xs hover:shadow-md transition-all cursor-pointer p-2 space-y-1 relative group/card min-w-0 ${
                                        isSpontaneous ? 'border-purple-300 ring-1 ring-purple-200' : 'border-slate-200/90'
                                      }`}
                                      style={{
                                        borderLeftWidth: '4px',
                                        borderLeftColor: isSpontaneous ? '#9333EA' : buyerColor,
                                        backgroundColor: isSpontaneous ? '#FAF5FF' : `${buyerColor}0F`
                                      }}
                                      title={`Cliquer pour ouvrir le compte-rendu : ${v.exhibitorName} (${v.timeSlot || slot})`}
                                    >
                                      {/* Ligne 1 : Stand + Trigramme acheteur + Heure réelle */}
                                      <div className="flex items-center justify-between gap-1 flex-wrap min-w-0">
                                        <div className="flex items-center gap-1 min-w-0 flex-wrap">
                                          {isSpontaneous ? (
                                            <span className="bg-purple-600 text-white font-black text-[9px] px-1.5 py-0.2 rounded shadow-2xs flex items-center gap-0.5 flex-shrink-0">
                                              <Zap className="w-2.5 h-2.5 fill-white text-white" />
                                              <span>Spontané</span>
                                            </span>
                                          ) : (
                                            v.standNumber && (
                                              <span className="bg-red-600 text-white font-mono font-bold text-[9px] px-1.5 py-0.2 rounded shadow-2xs flex-shrink-0">
                                                {v.standNumber}
                                              </span>
                                            )
                                          )}
                                          {v.standNumber && isSpontaneous && (
                                            <span className="font-mono text-[9px] font-bold text-red-600 flex-shrink-0">
                                              {v.standNumber}
                                            </span>
                                          )}
                                          {v.hall && (
                                            <span className="text-[9px] text-slate-500 font-semibold truncate max-w-[60px]">
                                              {v.hall}
                                            </span>
                                          )}
                                        </div>

                                        <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
                                          {buyer && (
                                            <span
                                              className="px-1.5 py-0.2 rounded text-white font-bold text-[9px] shadow-2xs"
                                              style={{ backgroundColor: buyer.color }}
                                              title={`Acheteur : ${buyer.name}`}
                                            >
                                              {buyer.trigram || buyer.initials}
                                            </span>
                                          )}
                                          <span className="text-[10px] font-mono text-slate-600 font-semibold">
                                            {v.timeSlot || slot}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Ligne 2 : Nom de l'exposant en gras */}
                                      <p className="text-xs font-bold text-slate-900 truncate leading-snug">
                                        {v.exhibitorName}
                                      </p>

                                      {/* Ligne 3 : Produit ou activité */}
                                      {v.product && (
                                        <p className="text-[10px] text-slate-600 truncate leading-tight">
                                          {v.product}
                                        </p>
                                      )}

                                      {/* Ligne 4 : Badges statut, note étoiles et médias */}
                                      <div className="flex items-center justify-between text-[9px] pt-1 border-t border-slate-200/60 flex-wrap gap-1">
                                        <div className="flex items-center gap-1 flex-wrap">
                                          {v.status === 'visited' && (
                                            <span className="text-emerald-700 font-bold whitespace-nowrap">✅ Visité</span>
                                          )}
                                          {v.status === 'confirmed' && (
                                            <span className="text-blue-700 font-bold whitespace-nowrap">📅 RDV</span>
                                          )}
                                          {v.status === 'followup' && (
                                            <span className="text-amber-700 font-bold whitespace-nowrap">⏳ Relance</span>
                                          )}
                                          {v.status === 'todo' && (
                                            <span className="text-slate-600 font-bold whitespace-nowrap">À visiter</span>
                                          )}
                                          {v.status === 'cancelled' && (
                                            <span className="text-slate-400 line-through whitespace-nowrap">Annulé</span>
                                          )}

                                          {v.rating && v.rating > 0 && (
                                            <span className="text-amber-600 font-bold flex items-center ml-0.5">
                                              ★{v.rating}
                                            </span>
                                          )}
                                        </div>

                                        <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500 flex-shrink-0">
                                          {cardPhotos > 0 && <span title="Cartes de visite">💳 {cardPhotos}</span>}
                                          {standPhotos > 0 && <span title="Photos du stand">📷 {standPhotos}</span>}
                                        </div>
                                      </div>

                                      {/* Alerte si conflit horaire pour le même acheteur */}
                                      {hasConflict && (
                                        <div className="mt-1 flex items-center gap-1 bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                          <AlertTriangle className="w-3 h-3 text-amber-600 flex-shrink-0" />
                                          <span className="truncate">Doublon acheteur à {slot}</span>
                                        </div>
                                      )}

                                    </div>
                                  );
                                })}

                                {/* Bouton subtil pour ajouter un autre créneau à cette même heure */}
                                <button
                                  type="button"
                                  onClick={() => onOpenNewAppointment(day.date, slot)}
                                  className="w-full text-center py-0.5 rounded text-[10px] font-semibold text-slate-400 hover:text-orange-600 hover:bg-orange-50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-1 mt-1"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Ajouter à {slot}</span>
                                </button>
                              </div>
                            ) : (
                              /* Créneau vide : clic direct pour planifier à cette heure */
                              <button
                                type="button"
                                onClick={() => onOpenNewAppointment(day.date, slot)}
                                className="w-full h-full min-h-[50px] rounded-xl border border-dashed border-transparent hover:border-orange-300 hover:bg-orange-50/60 flex items-center justify-center text-slate-300 hover:text-orange-600 transition-all opacity-0 group-hover:opacity-100"
                                title={`Planifier un rendez-vous le ${day.label} à ${slot}`}
                              >
                                <span className="flex items-center gap-1 text-[11px] font-bold">
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>{slot}</span>
                                </span>
                              </button>
                            )}
                          </div>
                        </td>
                      );
                    })}

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODE B : VUE JOURNÉE DÉTAILLÉE HEURE PAR HEURE               */}
      {/* ───────────────────────────────────────────────────────────── */}
      {calendarMode === 'day' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-400" />
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2 flex-wrap">
                  <span>Planning du {formatFrenchFullWeekdayWithDate(selectedDate || tradeShowDays[0]?.date)}</span>
                  {selectedBuyerId !== 'all' && (
                    <span className="text-[11px] font-normal text-slate-300">
                      • {selectedBuyerId === currentBuyer?.id ? `Mon planning (${currentBuyer.name})` : allBuyers.find((b) => b.id === selectedBuyerId)?.name}
                    </span>
                  )}
                </h2>
                <p className="text-[10px] text-slate-300">
                  {dayVisits.length} visite(s) et rendez-vous programmés pour cette journée
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenNewAppointment(selectedDate, '10:00')}
              className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nouveau Créneau</span>
            </button>
          </div>

          {/* Timeline Slots */}
          <div className="divide-y divide-slate-100">
            {timeSlots.map((slot) => {
              const slotVisits = dayVisitsBySlot.get(slot) || [];

              return (
                <div
                  key={slot}
                  className={`p-3 sm:px-5 sm:py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3 transition-colors ${
                    slotVisits.length > 0 ? 'bg-orange-50/20' : 'hover:bg-slate-50'
                  }`}
                >
                  {/* Heure */}
                  <div className="w-20 font-mono text-xs font-bold text-slate-500 flex items-center gap-1.5 flex-shrink-0">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{slot}</span>
                  </div>

                  {/* Cartes des Visites sur ce créneau */}
                  <div className="flex-1 w-full">
                    {slotVisits.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {slotVisits.map((v) => {
                          const buyer = getBuyerObj(v.buyerId);
                          const cardCount = (v.businessCardUrls && v.businessCardUrls.length > 0)
                            ? v.businessCardUrls.length
                            : (v.businessCardUrl ? 1 : 0);
                          const standCount = (v.standPhotoUrls && v.standPhotoUrls.length > 0)
                            ? v.standPhotoUrls.length
                            : (v.standPhotoUrl ? 1 : 0);
                          const isSpontaneous = v.status === 'spontaneous';

                          return (
                            <div
                              key={v.id}
                              onClick={() => onOpenVisitNotes(v)}
                              className={`p-3 bg-white rounded-2xl border hover:border-orange-400 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-1.5 ${
                                isSpontaneous ? 'border-purple-300 ring-1 ring-purple-100 bg-purple-50/20' : 'border-slate-200'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {isSpontaneous ? (
                                    <span className="bg-purple-600 text-white font-bold text-[9px] px-1.5 py-0.5 rounded shadow-2xs flex items-center gap-0.5">
                                      <Zap className="w-2.5 h-2.5 fill-white text-white" />
                                      <span>Spontané</span>
                                    </span>
                                  ) : (
                                    v.standNumber && (
                                      <span className="bg-red-600 text-white font-mono font-bold text-[10px] px-1.5 py-0.5 rounded shadow-2xs">
                                        {v.standNumber}
                                      </span>
                                    )
                                  )}
                                  {v.standNumber && isSpontaneous && (
                                    <span className="font-mono text-[10px] font-bold text-red-600">
                                      {v.standNumber}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-slate-400 truncate">{v.hall}</span>
                                </div>

                                {buyer && (
                                  <span
                                    className={`w-5 h-5 rounded-md ${buyer.bgClass} text-white font-bold text-[9px] flex items-center justify-center`}
                                    title={buyer.name}
                                  >
                                    {buyer.trigram || buyer.initials}
                                  </span>
                                )}
                              </div>

                              <p className="text-xs font-bold text-slate-900 truncate">
                                {v.exhibitorName}
                              </p>

                              {v.product && (
                                <p className="text-[10px] text-slate-500 truncate">
                                  {v.product}
                                </p>
                              )}

                              <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-100 text-slate-400">
                                <span>{v.timeSlot || slot} ({v.durationMinutes} min)</span>
                                <div className="flex items-center gap-1.5">
                                  {cardCount > 0 && <span className="text-orange-600 font-bold">💳 {cardCount}</span>}
                                  {standCount > 0 && <span className="text-blue-600 font-bold">📷 {standCount}</span>}
                                  {v.status === 'visited' && <span className="text-emerald-700 font-bold">✅ Visité</span>}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onOpenNewAppointment(selectedDate, slot)}
                        className="w-full text-left py-1 text-[11px] text-slate-400 hover:text-orange-600 italic transition-colors flex items-center gap-1 group"
                      >
                        <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span>Créneau disponible — Cliquer pour planifier</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

    </div>
  );
};
