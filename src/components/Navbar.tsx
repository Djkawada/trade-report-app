import React, { useState } from 'react';
import { TradeShow, BuyerProfile, AppTab } from '../types';
import { formatTradeShowDateRange } from '../utils/dateUtils';
import {
  Calendar,
  Building,
  Plus,
  Zap,
  Download,
  Upload,
  Settings,
  ChevronDown,
  Printer,
  FileSpreadsheet,
  Trash2,
  Lock,
  Camera,
  Layers,
  Pencil
} from 'lucide-react';

interface NavbarProps {
  tradeShows: TradeShow[];
  activeTradeShow: TradeShow | null;
  onSelectTradeShow: (showId: string) => void;
  onOpenNewTradeShowModal: () => void;
  onEditTradeShow?: (tradeShow: TradeShow) => void;
  onRequestDeleteTradeShow: (tradeShow: TradeShow) => void;
  buyers: BuyerProfile[];
  activeBuyer: BuyerProfile | null;
  onSelectBuyer: (buyerId: string) => void;
  onOpenExpressVisit: () => void;
  onOpenNewVisitNotes: () => void;
  onOpenNewAppointment: () => void;
  onOpenImportModal: () => void;
  onExportExcel: () => void;
  onOpenSettingsModal: () => void;
  onLockApp: () => void;
  visitsCount: number;
  exhibitorsCount?: number;
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  tradeShows,
  activeTradeShow,
  onSelectTradeShow,
  onOpenNewTradeShowModal,
  onEditTradeShow,
  onRequestDeleteTradeShow,
  buyers,
  activeBuyer,
  onSelectBuyer,
  onOpenExpressVisit,
  onOpenNewVisitNotes,
  onOpenNewAppointment,
  onOpenImportModal,
  onExportExcel,
  onOpenSettingsModal,
  onLockApp,
  visitsCount,
  exhibitorsCount = 0,
  activeTab,
  onSelectTab
}) => {
  const [showShowDropdown, setShowShowDropdown] = useState(false);
  const [showBuyerDropdown, setShowBuyerDropdown] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      
      {/* 1. Barre Supérieure Principale (64px) */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          
          {/* Logo & Sélecteur de Salon */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-9 h-9 rounded-xl bg-orange-600 flex items-center justify-center text-white font-black text-sm shadow-xs">
                TR
              </div>
              <div className="hidden sm:block leading-tight">
                <span className="font-black text-slate-900 text-sm tracking-tight">TradeReport</span>
                <span className="block text-[10px] text-orange-600 font-bold uppercase tracking-wider">Global Trade Enterprise</span>
              </div>
            </div>

            {/* Menu Déroulant Salon Actif */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowShowDropdown(!showShowDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 transition-all text-left"
              >
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: activeTradeShow?.color || '#EA580C' }}
                />
                <div className="min-w-0">
                  <div className="text-xs font-black text-slate-900 truncate max-w-[130px] sm:max-w-[200px]">
                    {activeTradeShow ? activeTradeShow.name : 'Sélectionner un salon'}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate hidden md:block">
                    {activeTradeShow?.city || 'Aucun salon'} • {visitsCount} visite{visitsCount > 1 ? 's' : ''}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 ml-1" />
              </button>

              {showShowDropdown && (
                <div className="absolute left-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Salons Disponibles
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                    {tradeShows.map((s) => (
                      <div
                        key={s.id}
                        className={`w-full px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors group ${
                          activeTradeShow?.id === s.id ? 'bg-orange-50 font-bold text-orange-900' : 'text-slate-800'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onSelectTradeShow(s.id);
                            setShowShowDropdown(false);
                          }}
                          className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: s.color }}
                          />
                          <div className="truncate">
                            <p className="text-xs font-bold truncate">{s.name}</p>
                            <p className="text-[10px] text-slate-500 truncate">{s.city} • {formatTradeShowDateRange(s.startDate, s.endDate)}</p>
                          </div>
                        </button>

                          <div className="flex items-center gap-0.5">
                            {/* Bouton de modification du salon */}
                            {onEditTradeShow && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowShowDropdown(false);
                                  onEditTradeShow(s);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                                title="Modifier ce salon (dates, nom, halls...)"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Bouton de suppression sécurisé avec code CORETRADE */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowShowDropdown(false);
                                onRequestDeleteTradeShow(s);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                              title="Supprimer ce salon (Code CORETRADE requis)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                    ))}
                  </div>

                  <div className="pt-2 mt-1 border-t border-slate-100 px-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowShowDropdown(false);
                        onOpenNewTradeShowModal();
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-orange-600 hover:bg-orange-50 rounded-xl transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Ajouter un nouveau salon</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions Rapides à Droite */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            
            {/* Bouton Visite Express */}
            <button
              type="button"
              onClick={onOpenExpressVisit}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl font-bold text-xs shadow-xs hover:shadow-md hover:from-red-500 hover:to-orange-500 transition-all active:scale-95"
              title="Créer une fiche de stand en 5 secondes en arrivant sur place"
            >
              <Zap className="w-4 h-4 text-amber-200 fill-amber-200" />
              <span className="hidden sm:inline">Visite Express</span>
              <span className="sm:hidden">Express</span>
            </button>

            {/* Bouton Photo Carte & Dictée IA Direct */}
            <button
              type="button"
              onClick={onOpenNewVisitNotes}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-xs transition-all active:scale-95"
              title="Prendre des photos de cartes, stand, dicter des notes et analyser par IA"
            >
              <Camera className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden md:inline">Photo & Dictée IA</span>
              <span className="md:hidden">Photo IA</span>
            </button>

            {/* Bouton Nouveau Rendez-vous Planifié */}
            <button
              type="button"
              onClick={onOpenNewAppointment}
              className="hidden md:flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-colors"
              title="Planifier un créneau horaire de visite"
            >
              <Calendar className="w-3.5 h-3.5 text-orange-400" />
              <span>Nouveau RDV</span>
            </button>

            {/* Bouton Import Catalogue / Exposants */}
            <button
              type="button"
              onClick={onOpenImportModal}
              className="hidden sm:flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-xs transition-colors"
              title="Importer des exposants depuis le web ou un fichier"
            >
              <Upload className="w-4 h-4 text-slate-600" />
              <span className="hidden xl:inline">Import Catalogue</span>
            </button>

            {/* Bouton Export Excel Pro */}
            <button
              type="button"
              onClick={onExportExcel}
              className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl font-bold text-xs transition-colors"
              title="Télécharger le fichier Excel (.xlsx) avec photos intégrées dans les cellules"
            >
              <Download className="w-4 h-4 text-emerald-700" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>

            <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

            {/* Sélecteur Utilisateur / Acheteur */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowBuyerDropdown(!showBuyerDropdown)}
                className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
                title="Changer d'utilisateur actif"
              >
                <div
                  className={`w-7 h-7 rounded-lg ${activeBuyer?.bgClass || 'bg-orange-600'} text-white font-bold text-xs flex items-center justify-center`}
                  style={!activeBuyer?.bgClass ? { backgroundColor: activeBuyer?.color } : undefined}
                >
                  {activeBuyer?.trigram || activeBuyer?.initials || 'PL'}
                </div>
                <span className="text-xs font-bold text-slate-800 hidden md:inline max-w-[100px] truncate">
                  {activeBuyer?.name.split(' ')[0] || 'Utilisateur'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showBuyerDropdown && (
                <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Équipe Achats CoreTrade ({buyers.length})
                  </div>
                  {buyers.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        onSelectBuyer(b.id);
                        setShowBuyerDropdown(false);
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-slate-50 transition-colors ${
                        activeBuyer?.id === b.id ? 'bg-orange-50 font-bold text-orange-900' : 'text-slate-800'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-md ${b.bgClass || 'bg-orange-600'} text-white font-bold text-[9px] flex items-center justify-center flex-shrink-0`}
                        style={!b.bgClass ? { backgroundColor: b.color } : undefined}
                      >
                        {b.trigram || b.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold truncate">{b.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{b.role}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Bouton Paramètres / Clé API */}
            <button
              type="button"
              onClick={onOpenSettingsModal}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              title="Paramètres & Clé IA Gemini"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Bouton Verrouiller l'accès (Lock) */}
            <button
              type="button"
              onClick={onLockApp}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              title="Verrouiller l'accès à l'application"
            >
              <Lock className="w-4 h-4" />
            </button>

          </div>

        </div>
      </div>

      {/* 2. Bandeau Décalé : Navigation Principale Dédiée (Visites / Planning Global / Reporting Table / Export) */}
      <div className="bg-slate-50/80 border-t border-slate-100 px-3 sm:px-6 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          
          <nav className="flex items-center gap-1.5 p-1 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => onSelectTab('visits')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'visits'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Building className="w-3.5 h-3.5 text-orange-500" />
              <span>Visites & Fiches</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('schedule')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'schedule'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              <span>Planning Global</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('exhibitors')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'exhibitors'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-amber-500" />
              <span>Catalogue Exposants</span>
              {exhibitorsCount !== undefined && exhibitorsCount > 0 && (
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === 'exhibitors' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {exhibitorsCount.toLocaleString()}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('sheet')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'sheet'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
              <span>Reporting Table / Export</span>
            </button>
          </nav>

          <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span>Salon actif :</span>
            <strong className="text-slate-800">{activeTradeShow?.name || 'Aucun'}</strong>
          </div>

        </div>
      </div>

    </header>
  );
};
