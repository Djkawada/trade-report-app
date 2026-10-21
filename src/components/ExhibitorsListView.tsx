import React, { useState, useMemo } from 'react';
import { Exhibitor, TradeShow, BuyerProfile, VisitReport } from '../types';
import { formatToFrenchDate } from '../utils/dateUtils';
import {
  Search,
  Building,
  MapPin,
  Globe,
  Mail,
  Phone,
  Filter,
  Upload,
  Zap,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Layers,
  ArrowUpDown,
  X
} from 'lucide-react';

interface ExhibitorsListViewProps {
  exhibitors: Exhibitor[];
  tradeShow: TradeShow | null;
  currentBuyer: BuyerProfile | null;
  visits: VisitReport[];
  onOpenExpressVisitWithExhibitor: (ex: Exhibitor) => void;
  onOpenAppointmentWithExhibitor: (ex: Exhibitor) => void;
  onOpenNotesWithExhibitor: (ex: Exhibitor) => void;
  onOpenImportModal: () => void;
}

export const ExhibitorsListView: React.FC<ExhibitorsListViewProps> = ({
  exhibitors,
  tradeShow,
  currentBuyer,
  visits,
  onOpenExpressVisitWithExhibitor,
  onOpenAppointmentWithExhibitor,
  onOpenNotesWithExhibitor,
  onOpenImportModal
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHall, setSelectedHall] = useState('all');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [standFilter, setStandFilter] = useState<'all' | 'with_stand' | 'without_stand'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'visited' | 'planned' | 'none'>('all');
  const [sortOption, setSortOption] = useState<'name_asc' | 'name_desc' | 'stand_asc'>('name_asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Indexation des visites par nom et par stand pour statut en direct
  const visitsByExhibitorName = useMemo(() => {
    const map = new Map<string, VisitReport>();
    visits.forEach((v) => {
      const key = v.exhibitorName.trim().toLowerCase();
      map.set(key, v);
    });
    return map;
  }, [visits]);

  const visitsByStand = useMemo(() => {
    const map = new Map<string, VisitReport>();
    visits.forEach((v) => {
      if (v.standNumber) {
        const key = v.standNumber.trim().toLowerCase();
        map.set(key, v);
      }
    });
    return map;
  }, [visits]);

  // Liste des halls uniques avec comptage
  const hallStats = useMemo(() => {
    const counts = new Map<string, number>();
    exhibitors.forEach((e) => {
      const h = e.hall || 'Principal';
      counts.set(h, (counts.get(h) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([hall, count]) => ({ hall, count }))
      .sort((a, b) => a.hall.localeCompare(b.hall));
  }, [exhibitors]);

  // Liste des pays uniques avec comptage
  const countryStats = useMemo(() => {
    const counts = new Map<string, number>();
    exhibitors.forEach((e) => {
      if (e.country) {
        counts.set(e.country, (counts.get(e.country) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => a.country.localeCompare(b.country));
  }, [exhibitors]);

  // Filtrage
  const filteredExhibitors = useMemo(() => {
    return exhibitors
      .filter((ex) => {
        // 1. Recherche texte
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchName = ex.name.toLowerCase().includes(q);
          const matchStand = ex.standNumber.toLowerCase().includes(q);
          const matchActivity = (ex.activity || '').toLowerCase().includes(q);
          const matchCountry = (ex.country || '').toLowerCase().includes(q);
          const matchEmail = (ex.email || '').toLowerCase().includes(q);
          if (!matchName && !matchStand && !matchActivity && !matchCountry && !matchEmail) {
            return false;
          }
        }

        // 2. Filtre Hall
        if (selectedHall !== 'all' && (ex.hall || 'Principal') !== selectedHall) {
          return false;
        }

        // 3. Filtre Pays
        if (selectedCountry !== 'all' && (ex.country || '') !== selectedCountry) {
          return false;
        }

        // 4. Filtre Stand
        if (standFilter === 'with_stand' && !ex.standNumber) return false;
        if (standFilter === 'without_stand' && ex.standNumber) return false;

        // 5. Filtre Statut Visite
        if (statusFilter !== 'all') {
          const v = visitsByExhibitorName.get(ex.name.trim().toLowerCase()) ||
                    (ex.standNumber ? visitsByStand.get(ex.standNumber.trim().toLowerCase()) : null);
          if (statusFilter === 'visited' && (!v || v.status !== 'visited')) return false;
          if (statusFilter === 'planned' && (!v || v.status !== 'confirmed')) return false;
          if (statusFilter === 'none' && v) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOption === 'name_asc') return a.name.localeCompare(b.name);
        if (sortOption === 'name_desc') return b.name.localeCompare(a.name);
        if (sortOption === 'stand_asc') return (a.standNumber || '').localeCompare(b.standNumber || '');
        return 0;
      });
  }, [exhibitors, searchTerm, selectedHall, selectedCountry, standFilter, statusFilter, sortOption, visitsByExhibitorName, visitsByStand]);

  // Pagination
  const totalPages = Math.ceil(filteredExhibitors.length / itemsPerPage) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredExhibitors.length);
  const paginatedExhibitors = filteredExhibitors.slice(startIndex, endIndex);

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedHall('all');
    setSelectedCountry('all');
    setStandFilter('all');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4">
      
      {/* 1. Barre d'outils et de filtres supérieure */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        
        {/* Titre & Bouton Import Fichier */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-orange-600" />
              <span>Catalogue Exposants — {tradeShow?.name || 'Salon actif'}</span>
            </h2>
            <p className="text-xs text-slate-500">
              {exhibitors.length.toLocaleString()} exposants référencés • Recherche, filtres par hall, pays et planification instantanée
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenImportModal}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer"
              title="Importer un fichier JSON, CSV ou Excel d'exposants"
            >
              <Upload className="w-4 h-4" />
              <span>Importer un fichier catalogue</span>
            </button>
          </div>
        </div>

        {/* Ligne 1 : Barre de Recherche & Tris */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Rechercher par société, stand (ex: 5A27), ville, pays, activité..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-9 py-2.5 text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sélecteur de tri */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase">Tri :</span>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as any)}
              className="bg-transparent text-xs font-bold text-slate-800 border-none focus:outline-hidden cursor-pointer"
            >
              <option value="name_asc">Nom (A ➔ Z)</option>
              <option value="name_desc">Nom (Z ➔ A)</option>
              <option value="stand_asc">N° de stand</option>
            </select>
          </div>
        </div>

        {/* Ligne 2 : Filtres avancés (Hall, Pays, Stand, Statut) */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          
          {/* Filtre Hall */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Hall :</span>
            <select
              value={selectedHall}
              onChange={(e) => {
                setSelectedHall(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-100 hover:bg-slate-200 border-none rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 transition-colors"
            >
              <option value="all">Tous les halls ({exhibitors.length})</option>
              {hallStats.map(({ hall, count }) => (
                <option key={hall} value={hall}>
                  {hall} ({count})
                </option>
              ))}
            </select>
          </div>

          <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

          {/* Filtre Pays */}
          {countryStats.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Pays :</span>
              <select
                value={selectedCountry}
                onChange={(e) => {
                  setSelectedCountry(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-100 hover:bg-slate-200 border-none rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 transition-colors"
              >
                <option value="all">Tous pays ({countryStats.length})</option>
                {countryStats.map(({ country, count }) => (
                  <option key={country} value={country}>
                    {country} ({count})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

          {/* Filtre Stand */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Stand :</span>
            <select
              value={standFilter}
              onChange={(e) => {
                setStandFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="bg-slate-100 hover:bg-slate-200 border-none rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 transition-colors"
            >
              <option value="all">Tous</option>
              <option value="with_stand">Avec stand uniquement</option>
              <option value="without_stand">Sans stand</option>
            </select>
          </div>

          <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

          {/* Filtre Statut Visite */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Statut :</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="bg-slate-100 hover:bg-slate-200 border-none rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 transition-colors"
            >
              <option value="all">Tous les exposants</option>
              <option value="visited">Déjà visités ✅</option>
              <option value="planned">RDV planifié 📅</option>
              <option value="none">Non visités</option>
            </select>
          </div>

          {(searchTerm || selectedHall !== 'all' || selectedCountry !== 'all' || standFilter !== 'all' || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={resetFilters}
              className="ml-auto text-xs font-bold text-orange-600 hover:underline"
            >
              Réinitialiser filtres
            </button>
          )}

        </div>

      </div>

      {/* 2. Résumé du nombre et Pagination Haut */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-1 text-xs text-slate-500">
        <div>
          Affichage de <strong className="text-slate-800">{filteredExhibitors.length === 0 ? 0 : startIndex + 1}</strong> à{' '}
          <strong className="text-slate-800">{endIndex}</strong> sur{' '}
          <strong className="text-slate-800">{filteredExhibitors.length.toLocaleString()}</strong> exposants trouvés
        </div>

        {/* Contrôles de pagination */}
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
                title="Page précédente"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-2 text-xs font-bold text-slate-800">
                Page {safeCurrentPage} / {totalPages}
              </span>

              <button
                type="button"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
                title="Page suivante"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(parseInt(e.target.value, 10));
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700"
            >
              <option value="25">25 / page</option>
              <option value="50">50 / page</option>
              <option value="100">100 / page</option>
              <option value="200">200 / page</option>
            </select>
          </div>
        )}
      </div>

      {/* 3. Grille des Cartes Exposants */}
      {paginatedExhibitors.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mx-auto">
            <Building className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Aucun exposant ne correspond à vos filtres</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Essayez de modifier votre recherche textuelle ou réinitialisez les filtres de hall ou de pays.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {paginatedExhibitors.map((ex) => {
            const visit = visitsByExhibitorName.get(ex.name.trim().toLowerCase()) ||
                          (ex.standNumber ? visitsByStand.get(ex.standNumber.trim().toLowerCase()) : null);

            return (
              <div
                key={ex.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-orange-300 p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div className="space-y-2">
                  
                  {/* Top Bar : Stand & Hall & Pays */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      {ex.standNumber ? (
                        <span className="font-mono text-xs font-black bg-red-600 text-white px-2 py-0.5 rounded-md shadow-2xs flex-shrink-0">
                          {ex.standNumber}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                          Sans stand
                        </span>
                      )}

                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded truncate">
                        {ex.hall || 'Hall Principal'}
                      </span>
                    </div>

                    {ex.country && (
                      <span className="text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded">
                        {ex.country}
                      </span>
                    )}
                  </div>

                  {/* Nom Société */}
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm group-hover:text-orange-600 transition-colors line-clamp-1">
                      {ex.name}
                    </h3>
                    {ex.activity && (
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                        {ex.activity}
                      </p>
                    )}
                  </div>

                  {/* Contacts disponibles */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 pt-1">
                    {ex.website && (
                      <a
                        href={ex.website.startsWith('http') ? ex.website : `https://${ex.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                        title={ex.website}
                      >
                        <Globe className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate max-w-[130px]">Site web</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}

                    {ex.email && (
                      <a
                        href={`mailto:${ex.email}`}
                        className="inline-flex items-center gap-1 text-slate-600 hover:text-orange-600"
                        title={ex.email}
                      >
                        <Mail className="w-3 h-3 flex-shrink-0 text-slate-400" />
                        <span className="truncate max-w-[130px]">{ex.email}</span>
                      </a>
                    )}

                    {ex.phone && (
                      <span className="inline-flex items-center gap-1 text-slate-600" title={ex.phone}>
                        <Phone className="w-3 h-3 flex-shrink-0 text-slate-400" />
                        <span className="truncate max-w-[110px] font-mono text-[10px]">{ex.phone}</span>
                      </span>
                    )}
                  </div>

                  {/* Statut Visite existante */}
                  {visit && (
                    <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Fiche existante ({visit.status})</span>
                      </span>
                      <span className="text-[10px] text-emerald-700 font-normal">
                        {formatToFrenchDate(visit.date)} {visit.timeSlot}
                      </span>
                    </div>
                  )}

                </div>

                {/* Boutons d'Action Rapide */}
                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                  <button
                    type="button"
                    onClick={() => onOpenExpressVisitWithExhibitor(ex)}
                    className="flex-1 py-1.5 px-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 shadow-2xs transition-all active:scale-95"
                    title="Enregistrer un passage express sur ce stand"
                  >
                    <Zap className="w-3 h-3 text-amber-200 fill-amber-200" />
                    <span>Express</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenAppointmentWithExhibitor(ex)}
                    className="py-1.5 px-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 transition-colors"
                    title="Planifier un rendez-vous"
                  >
                    <Calendar className="w-3 h-3 text-orange-400" />
                    <span>RDV</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenNotesWithExhibitor(ex)}
                    className="py-1.5 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 transition-colors"
                    title="Ouvrir la fiche pour photos de cartes et dictée vocale"
                  >
                    <Camera className="w-3 h-3 text-indigo-600" />
                    <span>Photo IA</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* 4. Pagination Bas */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            disabled={safeCurrentPage <= 1}
            onClick={() => {
              setCurrentPage((p) => Math.max(1, p - 1));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-xs font-bold text-slate-700 transition-colors flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Précédent</span>
          </button>

          <span className="text-xs font-bold text-slate-800 px-3">
            Page {safeCurrentPage} sur {totalPages}
          </span>

          <button
            type="button"
            disabled={safeCurrentPage >= totalPages}
            onClick={() => {
              setCurrentPage((p) => Math.min(totalPages, p + 1));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-xs font-bold text-slate-700 transition-colors flex items-center gap-1"
          >
            <span>Suivant</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
};
