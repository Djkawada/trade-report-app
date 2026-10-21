import React, { useState, useMemo } from 'react';
import { VisitReport, BuyerProfile, TradeShow } from '../types';
import { exportVisitsToXlsx } from '../services/excelExporter';
import { formatToFrenchDate, formatFrenchDayWithDate } from '../utils/dateUtils';
import {
  Printer,
  Download,
  FileSpreadsheet,
  Copy,
  Check,
  Building,
  User,
  Camera,
  Star,
  Maximize2,
  X
} from 'lucide-react';

interface PrintRouteSheetProps {
  visits: VisitReport[];
  tradeShow: TradeShow | null;
  allBuyers: BuyerProfile[];
  currentBuyer: BuyerProfile | null;
  onOpenVisitNotes: (visit: VisitReport) => void;
}

export const PrintRouteSheet: React.FC<PrintRouteSheetProps> = ({
  visits,
  tradeShow,
  allBuyers,
  currentBuyer,
  onOpenVisitNotes
}) => {
  const [filterBuyer, setFilterBuyer] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('all');
  const [copiedCsv, setCopiedCsv] = useState(false);
  const [zoomPhoto, setZoomPhoto] = useState<string | null>(null);

  // Dates uniques : tous les jours officiels du salon + les dates présentes dans les visites
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

  // Filtrage
  const displayedVisits = useMemo(() => {
    return visits
      .filter((v) => {
        if (filterBuyer !== 'all' && v.buyerId !== filterBuyer) return false;
        if (filterDate !== 'all' && v.date !== filterDate) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.timeSlot.localeCompare(b.timeSlot);
      });
  }, [visits, filterBuyer, filterDate]);

  const getBuyerObj = (buyerId: string) => allBuyers.find((b) => b.id === buyerId);

  // Copie rapide CSV
  const handleCopyCsv = () => {
    const headers = [
      'ACHETEUR',
      'FOURNISSEUR',
      'PRODUIT',
      'CONTACT',
      'STAND',
      'DATE',
      'HEURE',
      'STATUT',
      'NOTE_INTERET',
      'PHOTOS_CARTES',
      'PHOTOS_STAND',
      'COMPTE_RENDU'
    ];

    const rows = displayedVisits.map((v) => {
      const b = getBuyerObj(v.buyerId);
      const buyerName = b ? `${b.name} (${b.trigram})` : v.buyerId;
      const cardCount = (v.businessCardUrls && v.businessCardUrls.length > 0)
        ? v.businessCardUrls.length
        : (v.businessCardUrl ? 1 : 0);
      const standCount = (v.standPhotoUrls && v.standPhotoUrls.length > 0)
        ? v.standPhotoUrls.length
        : (v.standPhotoUrl ? 1 : 0);

      return [
        `"${buyerName.replace(/"/g, '""')}"`,
        `"${v.exhibitorName.replace(/"/g, '""')}"`,
        `"${(v.product || '').replace(/"/g, '""')}"`,
        `"${(v.contact || '').replace(/"/g, '""')}"`,
        `"${(v.standNumber || '').replace(/"/g, '""')}"`,
        `"${formatToFrenchDate(v.date)}"`,
        `"${v.timeSlot}"`,
        `"${v.status}"`,
        `"${v.rating ? `${v.rating}/5` : ''}"`,
        `"${cardCount}"`,
        `"${standCount}"`,
        `"${(v.notes || '').replace(/"/g, '""')}"`
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    navigator.clipboard.writeText(csvContent);
    setCopiedCsv(true);
    setTimeout(() => setCopiedCsv(false), 2000);
  };

  const handleExportXlsx = async () => {
    if (!tradeShow || displayedVisits.length === 0) return;
    await exportVisitsToXlsx(displayedVisits, tradeShow, allBuyers);
  };

  return (
    <div className="space-y-4">
      
      {/* 1. Barre d'outils et de filtres (masquée à l'impression) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs print:hidden space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Printer className="w-5 h-5 text-orange-600" />
              <span>Reporting Table / Export — Synthèse Globale Équipe</span>
            </h2>
            <p className="text-xs text-slate-500">
              Imprimez la feuille de route papier ou téléchargez le classeur Excel consolidé avec photos
            </p>
          </div>

          {/* Boutons d'action */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-xs transition-colors"
              title="Imprimer ou enregistrer au format PDF"
            >
              <Printer className="w-4 h-4 text-orange-400" />
              <span>Imprimer / PDF</span>
            </button>

            <button
              type="button"
              onClick={handleExportXlsx}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors"
              title="Télécharger le fichier Excel (.xlsx) avec photos"
            >
              <Download className="w-4 h-4" />
              <span>Export Excel Pro</span>
            </button>

            <button
              type="button"
              onClick={handleCopyCsv}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition-colors"
              title="Copier le tableau au format CSV"
            >
              {copiedCsv ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
              <span>{copiedCsv ? 'Copié !' : 'Copier CSV'}</span>
            </button>
          </div>

        </div>

        {/* Filtres Acheteur & Date */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Acheteur :</span>
            <select
              value={filterBuyer}
              onChange={(e) => setFilterBuyer(e.target.value)}
              className="bg-slate-100 border-none rounded-lg px-2 py-1 text-xs font-bold text-slate-800"
            >
              <option value="all">Toute l'équipe ({visits.length})</option>
              {allBuyers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.trigram})
                </option>
              ))}
            </select>
          </div>

          <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Jour :</span>
            <button
              type="button"
              onClick={() => setFilterDate('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                filterDate === 'all'
                  ? 'bg-orange-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tous les jours
            </button>
            {availableDates.map((d) => (
              <button
                key={d.date}
                type="button"
                onClick={() => setFilterDate(d.date)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                  filterDate === d.date
                    ? 'bg-orange-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{d.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    filterDate === d.date
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

          <div className="ml-auto text-slate-500 font-semibold text-xs">
            {displayedVisits.length} visite(s) affichée(s)
          </div>

        </div>
      </div>

      {/* 2. En-tête Imprimable (affiché uniquement ou stylisé à l'impression) */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 print:border-none print:shadow-none print:p-0">
        
        <div className="flex items-center justify-between border-b pb-3 border-slate-200">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              {tradeShow?.name || 'Salon Professionnel'} — Feuille de Route CoreTrade
            </h1>
            <p className="text-xs text-slate-500">
              {tradeShow?.city} • Document généré le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block bg-orange-600 text-white font-black text-xs px-3 py-1 rounded-lg">
              {filterBuyer === 'all' ? "Toute l'équipe CoreTrade" : getBuyerObj(filterBuyer)?.name || filterBuyer}
            </span>
          </div>
        </div>

        {/* Tableau Récapitulatif avec Photos et Détails */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] uppercase tracking-wider print:bg-slate-800">
                <th className="py-2.5 px-3">Stand</th>
                <th className="py-2.5 px-3">Fournisseur</th>
                <th className="py-2.5 px-3">Acheteur</th>
                <th className="py-2.5 px-3">Date / Heure</th>
                <th className="py-2.5 px-3">Statut</th>
                <th className="py-2.5 px-3 text-center">Note / Intérêt</th>
                <th className="py-2.5 px-3">Coordonnées Contact</th>
                <th className="py-2.5 px-3">Compte-rendu & Échanges</th>
                <th className="py-2.5 px-3 text-center">Cartes</th>
                <th className="py-2.5 px-3 text-center">Photos Stand</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {displayedVisits.map((v) => {
                const b = getBuyerObj(v.buyerId);
                const cardPhotos = (v.businessCardUrls && v.businessCardUrls.length > 0)
                  ? v.businessCardUrls
                  : (v.businessCardUrl ? [v.businessCardUrl] : []);
                const standPhotos = (v.standPhotoUrls && v.standPhotoUrls.length > 0)
                  ? v.standPhotoUrls
                  : (v.standPhotoUrl ? [v.standPhotoUrl] : []);

                return (
                  <tr
                    key={v.id}
                    className="hover:bg-slate-50 transition-colors print:break-inside-avoid"
                  >
                    {/* Stand */}
                    <td className="py-2.5 px-3 font-mono font-bold text-red-600 whitespace-nowrap">
                      {v.standNumber || '—'}
                      {v.hall && <span className="block text-[10px] text-slate-400 font-sans font-normal">{v.hall}</span>}
                    </td>

                    {/* Fournisseur & Produit */}
                    <td className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={() => onOpenVisitNotes(v)}
                        className="font-bold text-slate-900 hover:text-orange-600 text-left cursor-pointer"
                      >
                        {v.exhibitorName}
                      </button>
                      {v.product && (
                        <p className="text-[10px] text-slate-500">{v.product}</p>
                      )}
                    </td>

                    {/* Acheteur */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {b ? (
                        <span className="flex items-center gap-1.5">
                          <span className={`w-5 h-5 rounded-md ${b.bgClass} text-white font-bold text-[10px] flex items-center justify-center`}>
                            {b.trigram || b.initials}
                          </span>
                          <span className="font-semibold text-slate-800">{b.name.split(' ')[0]}</span>
                        </span>
                      ) : (
                        v.buyerId
                      )}
                    </td>

                    {/* Date / Heure */}
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap font-mono text-[11px]">
                      {formatToFrenchDate(v.date)} {v.timeSlot}
                    </td>

                    {/* Statut */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {v.status === 'visited' && <span className="text-emerald-700 font-bold">Visité ✅</span>}
                      {v.status === 'confirmed' && <span className="text-blue-700 font-bold">RDV Confirmé</span>}
                      {v.status === 'spontaneous' && <span className="text-purple-700 font-bold">Spontané</span>}
                      {v.status === 'followup' && <span className="text-amber-700 font-bold">À relancer ⏳</span>}
                      {v.status === 'todo' && <span className="text-slate-600 font-bold">À visiter</span>}
                      {v.status === 'cancelled' && <span className="text-slate-400 line-through">Annulé</span>}
                    </td>

                    {/* Note d'intérêt (1-5 étoiles) */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {v.rating && v.rating > 0 ? (
                        <div
                          className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200/80 px-2 py-1 rounded-lg"
                          title={`Note d'intérêt : ${v.rating}/5`}
                        >
                          <div className="flex text-amber-500">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-3 h-3 ${
                                  star <= v.rating!
                                    ? 'text-amber-500 fill-amber-400'
                                    : 'text-slate-200 fill-slate-100'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-[11px] font-black text-amber-800 ml-0.5">
                            {v.rating}/5
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-300 font-mono text-xs">—</span>
                      )}
                    </td>

                    {/* Contact */}
                    <td className="py-2.5 px-3 max-w-[200px] text-slate-700 font-mono text-[10px] whitespace-pre-line leading-tight">
                      {v.contact ? v.contact.replace(/---/g, '•') : '—'}
                    </td>

                    {/* Compte rendu */}
                    <td className="py-2.5 px-3 max-w-[280px] text-slate-800 leading-relaxed whitespace-pre-line">
                      {v.notes || '—'}
                    </td>

                    {/* Photos Cartes */}
                    <td className="py-2.5 px-2 text-center whitespace-nowrap">
                      {cardPhotos.length > 0 ? (
                        <div className="flex gap-1 justify-center">
                          {cardPhotos.slice(0, 2).map((url, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setZoomPhoto(url)}
                              className="w-10 h-7 rounded border border-slate-300 overflow-hidden hover:scale-105 transition-transform"
                              title="Agrandir la carte de visite"
                            >
                              <img src={url} alt="Carte" className="w-full h-full object-cover" />
                            </button>
                          ))}
                          {cardPhotos.length > 2 && (
                            <span className="text-[10px] text-slate-400 self-center font-bold">
                              +{cardPhotos.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* Photos Stand */}
                    <td className="py-2.5 px-2 text-center whitespace-nowrap">
                      {standPhotos.length > 0 ? (
                        <div className="flex gap-1 justify-center">
                          {standPhotos.slice(0, 2).map((url, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setZoomPhoto(url)}
                              className="w-10 h-7 rounded border border-slate-300 overflow-hidden hover:scale-105 transition-transform"
                              title="Agrandir la photo du stand"
                            >
                              <img src={url} alt="Stand" className="w-full h-full object-cover" />
                            </button>
                          ))}
                          {standPhotos.length > 2 && (
                            <span className="text-[10px] text-slate-400 self-center font-bold">
                              +{standPhotos.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

      {/* Lightbox Zoom Photo */}
      {zoomPhoto && (
        <div
          className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setZoomPhoto(null)}
        >
          <div className="max-w-3xl max-h-[85vh] relative" onClick={(e) => e.stopPropagation()}>
            <img src={zoomPhoto} alt="Zoom" className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" />
            <button
              type="button"
              onClick={() => setZoomPhoto(null)}
              className="absolute -top-3 -right-3 p-1.5 bg-white text-slate-900 rounded-full shadow-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
