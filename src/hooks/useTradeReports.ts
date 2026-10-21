import { useState, useEffect, useCallback } from 'react';
import { db, initializeDefaultData } from '../db/indexedDb';
import { TradeShow, Exhibitor, VisitReport, BuyerProfile } from '../types';

export function useTradeReports() {
  const [loading, setLoading] = useState(true);
  const [tradeShows, setTradeShows] = useState<TradeShow[]>([]);
  const [activeTradeShow, setActiveTradeShow] = useState<TradeShow | null>(null);
  const [buyers, setBuyers] = useState<BuyerProfile[]>([]);
  const [activeBuyer, setActiveBuyer] = useState<BuyerProfile | null>(null);
  const [visits, setVisits] = useState<VisitReport[]>([]);
  const [exhibitors, setExhibitors] = useState<Exhibitor[]>([]);

  // 1. Initialisation de la base et chargement
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      await initializeDefaultData();

      const allShows = await db.tradeShows.toArray();
      setTradeShows(allShows);

      // Récupérer le salon mémorisé ou le premier disponible
      const savedShowId = localStorage.getItem('trade_report_active_show');
      const foundShow = allShows.find((s) => s.id === savedShowId) || allShows[0] || null;
      setActiveTradeShow(foundShow);

      const allBuyers = await db.buyers.toArray();
      setBuyers(allBuyers);

      const savedBuyerId = localStorage.getItem('trade_report_active_buyer');
      const foundBuyer = allBuyers.find((b) => b.id === savedBuyerId) || allBuyers[0] || null;
      setActiveBuyer(foundBuyer);

      if (foundShow) {
        const showVisits = await db.visits.where('tradeShowId').equals(foundShow.id).toArray();
        setVisits(showVisits);

        const showExhibitors = await db.exhibitors.where('tradeShowId').equals(foundShow.id).toArray();
        setExhibitors(showExhibitors);
      }
    } catch (err) {
      console.error('Erreur chargement données TradeReport:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // 2. Changement de salon actif
  const selectTradeShow = async (showId: string) => {
    const show = tradeShows.find((s) => s.id === showId);
    if (!show) return;

    setActiveTradeShow(show);
    localStorage.setItem('trade_report_active_show', show.id);

    const showVisits = await db.visits.where('tradeShowId').equals(show.id).toArray();
    setVisits(showVisits);

    const showExhibitors = await db.exhibitors.where('tradeShowId').equals(show.id).toArray();
    setExhibitors(showExhibitors);
  };

  // 3. Changement d'acheteur actif
  const selectBuyer = (buyerId: string) => {
    const buyer = buyers.find((b) => b.id === buyerId);
    if (buyer) {
      setActiveBuyer(buyer);
      localStorage.setItem('trade_report_active_buyer', buyer.id);
    }
  };

  // 4. Création d'un nouveau salon
  const createTradeShow = async (
    data: Omit<TradeShow, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<TradeShow> => {
    const id = `show-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newShow: TradeShow = {
      ...data,
      id,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await db.tradeShows.add(newShow);
    const updatedShows = await db.tradeShows.toArray();
    setTradeShows(updatedShows);
    await selectTradeShow(id);
    return newShow;
  };

  // 5. Modification d'un salon
  const updateTradeShow = async (updatedShow: TradeShow) => {
    await db.tradeShows.put({ ...updatedShow, updatedAt: Date.now() });
    const updatedShows = await db.tradeShows.toArray();
    setTradeShows(updatedShows);
    if (activeTradeShow?.id === updatedShow.id) {
      setActiveTradeShow(updatedShow);
    }
  };

  // 6. Suppression d'un salon
  const deleteTradeShow = async (showId: string) => {
    await db.visits.where('tradeShowId').equals(showId).delete();
    await db.exhibitors.where('tradeShowId').equals(showId).delete();
    await db.tradeShows.delete(showId);

    const remaining = await db.tradeShows.toArray();
    setTradeShows(remaining);
    if (remaining.length > 0) {
      await selectTradeShow(remaining[0].id);
    } else {
      setActiveTradeShow(null);
      setVisits([]);
      setExhibitors([]);
    }
  };

  // 7. Sauvegarde d'une visite / RDV
  const saveVisit = async (
    visitData: Omit<VisitReport, 'id' | 'updatedAt'> & { id?: string }
  ): Promise<VisitReport> => {
    if (!activeTradeShow) {
      throw new Error('Aucun salon actif sélectionné');
    }

    const id = visitData.id || `visit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const fullVisit: VisitReport = {
      ...visitData,
      id,
      tradeShowId: activeTradeShow.id,
      updatedAt: Date.now()
    };

    await db.visits.put(fullVisit);

    // Mettre à jour l'état local
    setVisits((prev) => {
      const idx = prev.findIndex((v) => v.id === id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = fullVisit;
        return copy;
      }
      return [fullVisit, ...prev];
    });

    return fullVisit;
  };

  // 8. Suppression d'une visite
  const deleteVisit = async (visitId: string) => {
    await db.visits.delete(visitId);
    setVisits((prev) => prev.filter((v) => v.id !== visitId));
  };

  // 9. Import en masse d'exposants pour le salon actif
  const bulkImportExhibitors = async (
    items: Omit<Exhibitor, 'id' | 'tradeShowId'>[]
  ): Promise<number> => {
    if (!activeTradeShow || items.length === 0) return 0;

    const exhibitorsToAdd: Exhibitor[] = items.map((item) => ({
      ...item,
      id: `ex-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      tradeShowId: activeTradeShow.id
    }));

    await db.exhibitors.bulkAdd(exhibitorsToAdd);

    const updated = await db.exhibitors.where('tradeShowId').equals(activeTradeShow.id).toArray();
    setExhibitors(updated);
    return exhibitorsToAdd.length;
  };

  return {
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
    bulkImportExhibitors,
    reload: loadInitialData
  };
}
