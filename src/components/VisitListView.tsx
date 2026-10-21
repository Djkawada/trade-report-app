import React, { useState, useMemo, useEffect } from 'react';
import { VisitReport, BuyerProfile, TradeShow, VisitStatus } from '../types';
import { formatToFrenchDate, formatFrenchDayWithDate } from '../utils/dateUtils';
import {
  Search,
  Calendar,
  Clock,
  Building,
  User,
  Camera,
  Star,
  Sparkles,
  CheckCircle2,
  FileText,
  Filter,
  Plus,
  LayoutGrid,
  List
} from 'lucide-react';

interface VisitListViewProps {
  visits: VisitReport[];
  tradeShow: TradeShow | null;
  activeBuyer: BuyerProfile | null;
  allBuyers: BuyerProfile[];
  onOpenVisitNotes: (visit: VisitReport) => void;
  onOpenNewExpressVisit: () => void;
  onOpenNewAppointment: () => void;
}

export const VisitListView: React.FC<VisitListViewProps> = ({
  visits,
  tradeShow,
  activeBuyer,
  allBuyers,
  onOpenVisitNotes,
  onOpenNewExpressVisit,
  onOpenNewAppointment
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedBuyerId, setSelectedBuyerId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Dates disponibles : Tous les jours officiels du salon + toutes les dates présentes dans les visites
  const availableDates = useMemo(() => {
    const dateSet = new Set<string>();

    if (tradeShow?.startDate) {
      const [startYear, startMonth, startDay] = tradeShow.startDate.split('-').map(Number);
      const [endYear, endMonth, endDay] = (tradeShow.endDate || tradeShow.startDate).split('-').map(Number);
      const cur = new Date(startYear, startMonth - 1, startDay, 12, 0, 0);
      const end = new Date(endYear, endMonth - 1, endDay, 12, 0, 0);

      while (cur <= end) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const d = String(cur.getDate()).padStart(2, '0');
        dateSet.add(`${y}-${m}-${d}`);
        cur.setDate(cur.getDate() + 1);
      }
    }

    visits.forEach((v) => {
      if (v.date) dateSet.add(v.date);
    });

    const sortedDates = Array.from(dateSet).sort();
    return sortedDates.map((dateStr) => {
      const count = visits.filter((v) => v.date === dateStr).length;
      return {
        date: dateStr,
        label: formatFrenchDayWithDate(dateStr),
        count
      };
    });
  }, [tradeShow, visits]);

  // Réinitialiser le filtre de date si le salon change
  useEffect(() => {
    setSelectedDate('all');
  }, [tradeShow?.id]);

  // Filtrage
  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      // 1. Recherche textuelle
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = v.exhibitorName.toLowerCase().includes(q);
        const matchesStand = v.standNumber.toLowerCase().includes(q);
        const matchesHall = v.hall.toLowerCase().includes(q);
        const matchesProduct = v.product?.toLowerCase().includes(q);
        const matchesContact = v.contact?.toLowerCase().includes(q);
        const matchesNotes = v.notes.toLowerCase().includes(q);
        if (!matchesName && !matchesStand && !matchesHall && !matchesProduct && !matchesContact && !matchesNotes) {
          return false;
        }
      }

      // 2. Filtre Date
      if (selectedDate !== 'all' && v.date !== selectedDate) {
        return false;
      }

      // 3. Filtre Statut
      if (selectedStatus !== 'all' && v.status !== selectedStatus) {
        return false;
      }

      // 4. Filtre Acheteur
      if (selectedBuyerId !== 'all' && v.buyerId !== selectedBuyerId) {
        return false;
      }

      return true;
    });
  }, [visits, searchTerm, selectedDate, selectedStatus, selectedBuyerId]);

  const getBuyerObj = (buyerId: string) => {
    return allBuyers.find((b) => b.id === buyerId);
  };

  const getStatusBadge = (st: VisitStatus) => {
    switch (st) {
      case 'visited':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-2 py-0.5 rounded-md text-[10px]">Visité ✅</span>;
      case 'confirmed':
        return <span className="bg-blue-100 text-blue-800 border border-blue-300 font-bold px-2 py-0.5 rounded-md text-[10px]">RDV Confirmé</span>;
      case 'spontaneous':
        return <span className="bg-purple-100 text-purple-800 border border-purple-300 font-bold px-2 py-0.5 rounded-md text-[10px]">Spontané</span>;
      case 'followup':
        return <span className="bg-amber-100 text-amber-800 border border-amber-300 font-bold px-2 py-0.5 rounded-md text-[10px]">À relancer ⏳</span>;
      case 'todo':
        return <span className="bg-slate-100 text-slate-700 border border-slate-300 font-bold px-2 py-0.5 rounded-md text-[10px]">À visiter</span>;
      case 'cancelled':
        return <span className="bg-red-100 text-red-700 border border-red-200 font-bold px-2 py-0.5 rounded-md text-[10px] line-through">Annulé</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      
      {/* 1. Barre de Recherche et Filtres */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          
          {/* Recherche */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par société, stand, contact, produit, mot-clé dans les notes..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
            />
          </div>

          {/* Toggle Vue Cartes / Tableau */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 flex-shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'cards' ? 'bg-white shadow-2xs text-orange-600' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Vue Cartes"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'table' ? 'bg-white shadow-2xs text-orange-600' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Vue Tableau Détaillé"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Ligne des Filtres Avancés */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-xs">
          
          {/* Filtre Date */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Jour :</span>
            <button
              type="button"
              onClick={() => setSelectedDate('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                selectedDate === 'all'
                  ? 'bg-orange-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tous ({visits.length})
            </button>
            {availableDates.map((d) => (
              <button
                key={d.date}
                type="button"
                onClick={() => setSelectedDate(d.date)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                  selectedDate === d.date
                    ? 'bg-orange-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{d.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    selectedDate === d.date
                      ? 'bg-white/25 text-white font-bold'
                      : d.count > 0
                        ? 'bg-slate-200 text-slate-700'
                        : 'bg-slate-200/50 text-slate-400'
                  }`}
                >
                  {d.count}
                </span>
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

          {/* Filtre Acheteur */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Acheteur :</span>
            <select
              value={selectedBuyerId}
              onChange={(e) => setSelectedBuyerId(e.target.value)}
              className="bg-slate-100 border-none rounded-lg px-2 py-1 text-xs font-bold text-slate-700"
            >
              <option value="all">Toute l'équipe</option>
              {allBuyers.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

          {/* Filtre Statut */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Statut :</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-100 border-none rounded-lg px-2 py-1 text-xs font-bold text-slate-700"
            >
              <option value="all">Tous les statuts</option>
              <option value="visited">Visité ✅</option>
              <option value="confirmed">RDV Confirmé</option>
              <option value="spontaneous">Spontané</option>
              <option value="followup">À relancer ⏳</option>
              <option value="todo">À visiter</option>
              <option value="cancelled">Annulé</option>
            </select>
          </div>

        </div>
      </div>

      {/* 2. Liste des Visites */}
      {filteredVisits.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-300 p-8">
          <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Building className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-base mb-1">Aucune visite pour ces critères</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
            Enregistrez un passage rapide ou planifiez un rendez-vous pour ce salon.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onOpenNewExpressVisit}
              className="px-4 py-2 bg-orange-600 text-white rounded-xl font-bold text-xs shadow-xs hover:bg-orange-700 transition-colors"
            >
              ⚡ Visite Express
            </button>
            <button
              type="button"
              onClick={onOpenNewAppointment}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-colors"
            >
              + Nouveau RDV
            </button>
          </div>
        </div>
      ) : viewMode === 'cards' ? (
        /* VUE CARTES */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredVisits.map((v) => {
            const buyer = getBuyerObj(v.buyerId);
            const cardCount = (v.businessCardUrls && v.businessCardUrls.length > 0)
              ? v.businessCardUrls.length
              : (v.businessCardUrl ? 1 : 0);
            const standCount = (v.standPhotoUrls && v.standPhotoUrls.length > 0)
              ? v.standPhotoUrls.length
              : (v.standPhotoUrl ? 1 : 0);

            return (
              <div
                key={v.id}
                onClick={() => onOpenVisitNotes(v)}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:shadow-md hover:border-orange-300 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  {/* Top Bar : Stand, Statut & Acheteur */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {v.standNumber ? (
                        <span className="bg-red-600 text-white font-mono font-bold text-xs px-2 py-0.5 rounded-md shadow-2xs flex-shrink-0">
                          {v.standNumber}
                        </span>
                      ) : (
                        <span className="bg-slate-200 text-slate-700 font-bold text-[10px] px-1.5 py-0.5 rounded">
                          {v.hall || 'Hors Stand'}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 truncate">{v.hall}</span>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {getStatusBadge(v.status)}
                    </div>
                  </div>

                  {/* Nom Exposant */}
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-orange-600 transition-colors truncate mb-1">
                    {v.exhibitorName}
                  </h3>

                  {/* Produit */}
                  {v.product && (
                    <p className="text-[11px] text-slate-600 line-clamp-1 mb-2">
                      <strong className="text-slate-400 font-semibold">Produit :</strong> {v.product}
                    </p>
                  )}

                  {/* Coordonnées Contact extraites */}
                  {v.contact && (
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 text-[10px] text-slate-600 line-clamp-2 font-mono mb-2">
                      {v.contact.replace(/---/g, '•')}
                    </div>
                  )}

                  {/* Notes / Compte rendu aperçu */}
                  {v.notes && (
                    <p className="text-xs text-slate-700 line-clamp-2 italic mb-3">
                      « {v.notes} »
                    </p>
                  )}
                </div>

                {/* Footer Carte */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5">
                    {buyer && (
                      <span className={`w-5 h-5 rounded-md ${buyer.color} text-white font-bold text-[10px] flex items-center justify-center`} title={buyer.name}>
                        {buyer.initials}
                      </span>
                    )}
                    <span>{formatToFrenchDate(v.date)} • {v.timeSlot}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {cardCount > 0 && (
                      <span className="flex items-center gap-0.5 text-orange-600 font-bold">
                        <Camera className="w-3.5 h-3.5" />
                        <span>{cardCount}</span>
                      </span>
                    )}
                    {standCount > 0 && (
                      <span className="flex items-center gap-0.5 text-blue-600 font-bold">
                        <Building className="w-3.5 h-3.5" />
                        <span>{standCount}</span>
                      </span>
                    )}
                    {v.rating && v.rating > 0 && (
                      <span className="flex items-center text-amber-500">
                        <Star className="w-3 h-3 fill-amber-500" />
                        <span className="text-[10px] font-bold ml-0.5">{v.rating}</span>
                      </span>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        /* VUE TABLEAU DÉTAILLÉ */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-3">Stand</th>
                  <th className="py-3 px-3">Fournisseur</th>
                  <th className="py-3 px-3">Statut</th>
                  <th className="py-3 px-3">Date/Heure</th>
                  <th className="py-3 px-3">Visiteur</th>
                  <th className="py-3 px-3">Photos</th>
                  <th className="py-3 px-3">Contact</th>
                  <th className="py-3 px-3">Compte-rendu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVisits.map((v) => {
                  const buyer = getBuyerObj(v.buyerId);
                  const cardCount = (v.businessCardUrls && v.businessCardUrls.length > 0)
                    ? v.businessCardUrls.length
                    : (v.businessCardUrl ? 1 : 0);
                  const standCount = (v.standPhotoUrls && v.standPhotoUrls.length > 0)
                    ? v.standPhotoUrls.length
                    : (v.standPhotoUrl ? 1 : 0);

                  return (
                    <tr
                      key={v.id}
                      onClick={() => onOpenVisitNotes(v)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono font-bold text-red-600">
                        {v.standNumber || '—'}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                        {v.exhibitorName}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {getStatusBadge(v.status)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                        {formatToFrenchDate(v.date)} {v.timeSlot}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {buyer ? `${buyer.name} (${buyer.initials})` : v.buyerId}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-500">
                        {cardCount > 0 && <span className="mr-2 text-orange-600 font-bold">💳 {cardCount}</span>}
                        {standCount > 0 && <span className="text-blue-600 font-bold">📷 {standCount}</span>}
                        {cardCount === 0 && standCount === 0 && '—'}
                      </td>
                      <td className="py-2.5 px-3 max-w-[200px] truncate text-slate-600 font-mono text-[10px]">
                        {v.contact || '—'}
                      </td>
                      <td className="py-2.5 px-3 max-w-[250px] truncate text-slate-700 italic">
                        {v.notes || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
