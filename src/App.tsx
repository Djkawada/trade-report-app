import React, { useState } from 'react';
import { useTradeReports } from './hooks/useTradeReports';
import { VisitReport, TradeShow, AppTab } from './types';
import { exportVisitsToXlsx } from './services/excelExporter';
import { Navbar } from './components/Navbar';
import { TradeShowModal } from './components/TradeShowModal';
import { ImportExhibitorsModal } from './components/ImportExhibitorsModal';
import { VisitNotesModal } from './components/VisitNotesModal';
import { ExpressVisitModal } from './components/ExpressVisitModal';
import { AppointmentEditModal } from './components/AppointmentEditModal';
import { SettingsModal } from './components/SettingsModal';
import { AuthLockScreen } from './components/AuthLockScreen';
import { DeleteTradeShowModal } from './components/DeleteTradeShowModal';
import { VisitListView } from './components/VisitListView';
import { GlobalScheduleView } from './components/GlobalScheduleView';
import { ExhibitorsListView } from './components/ExhibitorsListView';
import { PrintRouteSheet } from './components/PrintRouteSheet';
import { formatTradeShowDateRange } from './utils/dateUtils';
import {
  Calendar,
  Building,
  CheckCircle2,
  Camera,
  Download,
  Zap,
  Plus,
  Sparkles,
  MapPin,
  Printer,
  Pencil
} from 'lucide-react';

export function App() {
  const {
    loading,
    tradeShows,
    activeTradeShow,
    buyers,
    activeBuyer,
    visits,
    exhibitors,
    selectTradeShow,
    selectBuyer,
    createTradeShow,
    updateTradeShow,
    deleteTradeShow,
    saveVisit,
    deleteVisit,
    bulkImportExhibitors
  } = useTradeReports();

  // Navigation tab active
  const [activeTab, setActiveTab] = useState<AppTab>('visits');

  // Authentification locale sécurisée par code CORETRADE
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('trade_report_authenticated') === 'true';
  });

  // Salon sélectionné pour modification ou suppression sécurisée
  const [tradeShowToEdit, setTradeShowToEdit] = useState<TradeShow | null>(null);
  const [tradeShowToDelete, setTradeShowToDelete] = useState<TradeShow | null>(null);

  // Modals state
  const [isTradeShowModalOpen, setIsTradeShowModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExpressVisitModalOpen, setIsExpressVisitModalOpen] = useState(false);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [isVisitNotesModalOpen, setIsVisitNotesModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const [activeVisitForNotes, setActiveVisitForNotes] = useState<VisitReport | null>(null);
  const [activeAppointmentForEdit, setActiveAppointmentForEdit] = useState<VisitReport | null>(null);

  // Statistiques du salon actif
  const visitedCount = visits.filter((v) => v.status === 'visited').length;
  const cardsCount = visits.reduce((acc, v) => {
    const c = (v.businessCardUrls && v.businessCardUrls.length > 0)
      ? v.businessCardUrls.length
      : (v.businessCardUrl ? 1 : 0);
    return acc + c;
  }, 0);
  const photosCount = visits.reduce((acc, v) => {
    const s = (v.standPhotoUrls && v.standPhotoUrls.length > 0)
      ? v.standPhotoUrls.length
      : (v.standPhotoUrl ? 1 : 0);
    return acc + s;
  }, 0);

  // Exporter en Excel
  const handleExportExcel = async () => {
    if (!activeTradeShow || visits.length === 0) {
      alert('Aucune visite enregistrée pour ce salon.');
      return;
    }
    try {
      await exportVisitsToXlsx(visits, activeTradeShow, buyers);
    } catch (err: any) {
      console.error('Erreur export Excel:', err);
      alert(`Erreur export : ${err.message || 'Impossible de générer le fichier Excel'}`);
    }
  };

  // Écran de verrouillage si l'accès n'a pas été déverrouillé avec le code CORETRADE
  if (!isAuthenticated) {
    return <AuthLockScreen onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-600 text-white font-black text-xl flex items-center justify-center mx-auto animate-bounce shadow-lg">
            TR
          </div>
          <h2 className="text-base font-bold text-slate-900">Chargement de TradeReport...</h2>
          <p className="text-xs text-slate-500">Initialisation de votre base de données locale</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      
      {/* 1. Barre de navigation supérieure */}
      <Navbar
        tradeShows={tradeShows}
        activeTradeShow={activeTradeShow}
        onSelectTradeShow={selectTradeShow}
        onOpenNewTradeShowModal={() => {
          setTradeShowToEdit(null);
          setIsTradeShowModalOpen(true);
        }}
        onEditTradeShow={(show) => {
          setTradeShowToEdit(show);
          setIsTradeShowModalOpen(true);
        }}
        onRequestDeleteTradeShow={(show) => setTradeShowToDelete(show)}
        buyers={buyers}
        activeBuyer={activeBuyer}
        onSelectBuyer={selectBuyer}
        onOpenExpressVisit={() => setIsExpressVisitModalOpen(true)}
        onOpenNewVisitNotes={() => {
          setActiveVisitForNotes(null);
          setIsVisitNotesModalOpen(true);
        }}
        onOpenNewAppointment={() => {
          setActiveAppointmentForEdit(null);
          setIsAppointmentModalOpen(true);
        }}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onExportExcel={handleExportExcel}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onLockApp={() => {
          localStorage.removeItem('trade_report_authenticated');
          setIsAuthenticated(false);
        }}
        visitsCount={visits.length}
        exhibitorsCount={exhibitors.length}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />

      {/* 2. Conteneur principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-5 space-y-5">
        
        {/* En-tête du salon actif avec statistiques (masqué à l'impression si papier de secours) */}
        {activeTradeShow && (
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden">
            
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: activeTradeShow.color }}
                />
                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  {activeTradeShow.name}
                </h1>
                <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                  {activeTradeShow.shortName}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setTradeShowToEdit(activeTradeShow);
                    setIsTradeShowModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-orange-600 bg-slate-100 hover:bg-orange-50 px-2 py-0.5 rounded-md transition-colors"
                  title="Modifier les dates ou informations de ce salon"
                >
                  <Pencil className="w-3 h-3" />
                  <span>Modifier</span>
                </button>
              </div>

              <p className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1 font-semibold text-slate-700">
                  <MapPin className="w-3.5 h-3.5 text-orange-600" />
                  {activeTradeShow.city} ({activeTradeShow.country})
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-medium text-slate-700">
                  <Calendar className="w-3.5 h-3.5 text-orange-600" />
                  {formatTradeShowDateRange(activeTradeShow.startDate, activeTradeShow.endDate)}
                </span>
                <span>•</span>
                <span className="text-slate-600 font-semibold">
                  {exhibitors.length} exposant{exhibitors.length > 1 ? 's' : ''} au catalogue
                </span>
              </p>
            </div>

            {/* Badges Statistiques */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-center">
                <div className="text-base font-black text-slate-900">{visits.length}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">Fiches Visites</div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-3 py-2 text-center">
                <div className="text-base font-black text-emerald-800">{visitedCount}</div>
                <div className="text-[10px] font-bold text-emerald-600 uppercase">Visités ✅</div>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-2xl px-3 py-2 text-center">
                <div className="text-base font-black text-orange-800">{cardsCount}</div>
                <div className="text-[10px] font-bold text-orange-600 uppercase">Cartes IA</div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-2xl px-3 py-2 text-center">
                <div className="text-base font-black text-blue-800">{photosCount}</div>
                <div className="text-[10px] font-bold text-blue-600 uppercase">Photos Stand</div>
              </div>
            </div>

          </div>
        )}

        {/* 3. VUES PRINCIPALES SELON L'ONGLET SÉLECTIONNÉ */}
        
        {/* Onglet 1 : Liste des Visites & Fiches */}
        {activeTab === 'visits' && (
          <VisitListView
            visits={visits}
            tradeShow={activeTradeShow}
            activeBuyer={activeBuyer}
            allBuyers={buyers}
            onOpenVisitNotes={(v: VisitReport) => {
              setActiveVisitForNotes(v);
              setIsVisitNotesModalOpen(true);
            }}
            onOpenNewExpressVisit={() => setIsExpressVisitModalOpen(true)}
            onOpenNewAppointment={() => {
              setActiveAppointmentForEdit(null);
              setIsAppointmentModalOpen(true);
            }}
          />
        )}

        {/* Onglet 2 : Planning Global & Chronologie Équipe */}
        {activeTab === 'schedule' && (
          <GlobalScheduleView
            visits={visits}
            tradeShow={activeTradeShow}
            allBuyers={buyers}
            currentBuyer={activeBuyer}
            onOpenVisitNotes={(v: VisitReport) => {
              setActiveVisitForNotes(v);
              setIsVisitNotesModalOpen(true);
            }}
            onOpenNewAppointment={(defaultDate, defaultTime) => {
              setActiveAppointmentForEdit(
                defaultDate
                  ? ({
                      id: '',
                      tradeShowId: activeTradeShow?.id || '',
                      buyerId: activeBuyer?.id || 'ppl',
                      exhibitorName: '',
                      standNumber: '',
                      hall: activeTradeShow?.halls[0] || 'Principal',
                      date: defaultDate,
                      timeSlot: defaultTime || '10:00',
                      durationMinutes: 30,
                      status: 'confirmed',
                      notes: '',
                      rating: 3,
                      updatedAt: Date.now()
                    } as VisitReport)
                  : null
              );
              setIsAppointmentModalOpen(true);
            }}
          />
        )}

        {/* Onglet 3 : Catalogue des Exposants & Annuaire Officiel */}
        {activeTab === 'exhibitors' && (
          <ExhibitorsListView
            exhibitors={exhibitors}
            tradeShow={activeTradeShow}
            currentBuyer={activeBuyer}
            visits={visits}
            onOpenExpressVisitWithExhibitor={(ex) => {
              const effDate = (activeTradeShow?.startDate && (new Date().toISOString().split('T')[0] < activeTradeShow.startDate || (activeTradeShow.endDate && new Date().toISOString().split('T')[0] > activeTradeShow.endDate)))
                ? activeTradeShow.startDate
                : new Date().toISOString().split('T')[0];
              const now = new Date();
              const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
              setActiveVisitForNotes({
                id: '',
                tradeShowId: activeTradeShow?.id || '',
                buyerId: activeBuyer?.id || 'ppl',
                exhibitorName: ex.name,
                standNumber: ex.standNumber || '',
                hall: ex.hall || (activeTradeShow?.halls[0] || 'Principal'),
                date: effDate,
                timeSlot: timeStr,
                durationMinutes: 15,
                status: 'visited',
                product: ex.activity || '',
                contact: [ex.contactName, ex.phone, ex.email].filter(Boolean).join(' • '),
                notes: '',
                rating: 3,
                updatedAt: Date.now()
              } as VisitReport);
              setIsVisitNotesModalOpen(true);
            }}
            onOpenAppointmentWithExhibitor={(ex) => {
              const effDate = activeTradeShow?.startDate || new Date().toISOString().split('T')[0];
              setActiveAppointmentForEdit({
                id: '',
                tradeShowId: activeTradeShow?.id || '',
                buyerId: activeBuyer?.id || 'ppl',
                exhibitorName: ex.name,
                standNumber: ex.standNumber || '',
                hall: ex.hall || (activeTradeShow?.halls[0] || 'Principal'),
                date: effDate,
                timeSlot: '10:00',
                durationMinutes: 30,
                status: 'confirmed',
                product: ex.activity || '',
                contact: [ex.contactName, ex.phone, ex.email].filter(Boolean).join(' • '),
                notes: '',
                rating: 3,
                updatedAt: Date.now()
              } as VisitReport);
              setIsAppointmentModalOpen(true);
            }}
            onOpenNotesWithExhibitor={(ex) => {
              const existing = visits.find((v) => v.exhibitorName.trim().toLowerCase() === ex.name.trim().toLowerCase());
              if (existing) {
                setActiveVisitForNotes(existing);
              } else {
                const effDate = (activeTradeShow?.startDate && (new Date().toISOString().split('T')[0] < activeTradeShow.startDate || (activeTradeShow.endDate && new Date().toISOString().split('T')[0] > activeTradeShow.endDate)))
                  ? activeTradeShow.startDate
                  : new Date().toISOString().split('T')[0];
                const now = new Date();
                const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                setActiveVisitForNotes({
                  id: '',
                  tradeShowId: activeTradeShow?.id || '',
                  buyerId: activeBuyer?.id || 'ppl',
                  exhibitorName: ex.name,
                  standNumber: ex.standNumber || '',
                  hall: ex.hall || (activeTradeShow?.halls[0] || 'Principal'),
                  date: effDate,
                  timeSlot: timeStr,
                  durationMinutes: 30,
                  status: 'visited',
                  product: ex.activity || '',
                  contact: [ex.contactName, ex.phone, ex.email].filter(Boolean).join(' • '),
                  notes: '',
                  rating: 3,
                  updatedAt: Date.now()
                } as VisitReport);
              }
              setIsVisitNotesModalOpen(true);
            }}
            onOpenImportModal={() => setIsImportModalOpen(true)}
          />
        )}

        {/* Onglet 4 : Papier de Secours / Reporting Global Imprimable */}
        {activeTab === 'sheet' && (
          <PrintRouteSheet
            visits={visits}
            tradeShow={activeTradeShow}
            allBuyers={buyers}
            currentBuyer={activeBuyer}
            onOpenVisitNotes={(v: VisitReport) => {
              setActiveVisitForNotes(v);
              setIsVisitNotesModalOpen(true);
            }}
          />
        )}

      </main>

      {/* MODALS */}
      {/* 1. Modal Nouveau Salon / Édition Salon */}
      <TradeShowModal
        isOpen={isTradeShowModalOpen}
        onClose={() => {
          setIsTradeShowModalOpen(false);
          setTradeShowToEdit(null);
        }}
        tradeShowToEdit={tradeShowToEdit}
        onCreate={async (data) => {
          await createTradeShow(data);
        }}
        onUpdate={async (data) => {
          await updateTradeShow(data);
        }}
      />

      {/* 2. Modal Import Exposants */}
      <ImportExhibitorsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        activeTradeShow={activeTradeShow}
        onImport={async (items) => {
          return await bulkImportExhibitors(items);
        }}
      />

      {/* 3. Modal Visite Express */}
      <ExpressVisitModal
        isOpen={isExpressVisitModalOpen}
        onClose={() => setIsExpressVisitModalOpen(false)}
        tradeShow={activeTradeShow}
        currentBuyer={activeBuyer}
        exhibitors={exhibitors}
        onSelectAndOpenNotes={(initialData) => {
          setActiveVisitForNotes({
            ...initialData,
            id: '',
            updatedAt: Date.now()
          } as VisitReport);
          setIsVisitNotesModalOpen(true);
        }}
      />

      {/* 4. Modal Nouveau / Modifier RDV */}
      <AppointmentEditModal
        isOpen={isAppointmentModalOpen}
        onClose={() => setIsAppointmentModalOpen(false)}
        tradeShow={activeTradeShow}
        currentBuyer={activeBuyer}
        allBuyers={buyers}
        exhibitors={exhibitors}
        appointment={activeAppointmentForEdit}
        onSave={async (data) => {
          await saveVisit(data);
        }}
        onDelete={async (id) => {
          await deleteVisit(id);
        }}
        onOpenVisitNotes={(v) => {
          setActiveVisitForNotes(v);
          setIsVisitNotesModalOpen(true);
        }}
      />

      {/* 5. Modal Prise de Notes, Dictée Vocale & Photos */}
      <VisitNotesModal
        isOpen={isVisitNotesModalOpen}
        onClose={() => {
          setIsVisitNotesModalOpen(false);
          setActiveVisitForNotes(null);
        }}
        visit={activeVisitForNotes}
        tradeShow={activeTradeShow}
        currentBuyer={activeBuyer}
        onSave={async (data) => {
          await saveVisit(data);
        }}
        onDelete={async (id) => {
          await deleteVisit(id);
        }}
      />

      {/* 6. Modal Paramètres IA */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      {/* 7. Modal Confirmation Suppression Salon avec code CORETRADE */}
      <DeleteTradeShowModal
        isOpen={!!tradeShowToDelete}
        tradeShow={tradeShowToDelete}
        visitsCount={visits.length}
        onClose={() => setTradeShowToDelete(null)}
        onConfirmDelete={async (id) => {
          await deleteTradeShow(id);
          setTradeShowToDelete(null);
        }}
      />

    </div>
  );
}

export default App;
