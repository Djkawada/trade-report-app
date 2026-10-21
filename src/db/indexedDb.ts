import Dexie, { type EntityTable } from 'dexie';
import { TradeShow, Exhibitor, VisitReport, BuyerProfile } from '../types';

export class TradeReportDatabase extends Dexie {
  tradeShows!: EntityTable<TradeShow, 'id'>;
  exhibitors!: EntityTable<Exhibitor, 'id'>;
  visits!: EntityTable<VisitReport, 'id'>;
  buyers!: EntityTable<BuyerProfile, 'id'>;

  constructor() {
    super('TradeReportDB');
    this.version(1).stores({
      tradeShows: 'id, name, shortName, startDate, endDate, createdAt',
      exhibitors: 'id, tradeShowId, name, standNumber, hall',
      visits: 'id, tradeShowId, buyerId, exhibitorName, standNumber, date, status, updatedAt',
      buyers: 'id, name, role'
    });
  }
}

export const db = new TradeReportDatabase();

// Initialisation des données de démarrage si la base est vide
export async function initializeDefaultData(): Promise<void> {
  const tradeShowCount = await db.tradeShows.count();
  if (tradeShowCount === 0) {
    const defaultTradeShows: TradeShow[] = [
      {
        id: 'sial-paris-2026',
        name: 'SIAL Paris 2026',
        shortName: 'SIAL',
        city: 'Paris Nord Villepinte',
        country: 'France',
        startDate: '2026-10-17',
        endDate: '2026-10-21',
        color: '#E2001A',
        halls: ['Hall 1', 'Hall 2', 'Hall 3', 'Hall 4', 'Hall 5a', 'Hall 5b', 'Hall 6', 'Hall 7', 'Hall 8'],
        websiteUrl: 'https://www.sialparis.com',
        notes: 'Salon mondial de l’alimentation - Focus CoreTrade : Innovations, sauces, condiments et produits surgelés.',
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'sirha-lyon-2027',
        name: 'Sirha Lyon 2027',
        shortName: 'SIRHA',
        city: 'Eurexpo Lyon',
        country: 'France',
        startDate: '2027-01-21',
        endDate: '2027-01-25',
        color: '#0284C7',
        halls: ['Hall 1', 'Hall 2', 'Hall 3', 'Hall 4', 'Hall 5', 'Hall 6', 'Hall 7'],
        websiteUrl: 'https://www.sirha-lyon.com',
        notes: 'Rendez-vous mondial du Food Service et de l’hôtellerie restauration.',
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'anuga-cologne-2027',
        name: 'Anuga Cologne 2027',
        shortName: 'ANUGA',
        city: 'Koelnmesse Cologne',
        country: 'Allemagne',
        startDate: '2027-10-09',
        endDate: '2027-10-13',
        color: '#D97706',
        halls: ['Hall 1', 'Hall 2', 'Hall 3', 'Hall 4', 'Hall 5', 'Hall 7', 'Hall 8', 'Hall 9', 'Hall 10', 'Hall 11'],
        websiteUrl: 'https://www.anuga.com',
        notes: 'Leader mondial pour l’industrie agroalimentaire internationale.',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ];

    await db.tradeShows.bulkPut(defaultTradeShows);
  } else {
    // Migration automatique si le SIAL Paris 2026 avait les anciennes dates erronées (19 au 23 octobre)
    const existingShows = await db.tradeShows.toArray();
    for (const show of existingShows) {
      if (
        (show.id === 'sial-paris-2026' || show.name.toUpperCase().includes('SIAL') || show.shortName.toUpperCase() === 'SIAL') &&
        show.startDate === '2026-10-19'
      ) {
        console.log(`[IndexedDB] Rectification des dates du salon ${show.name} vers 17-21 octobre 2026`);
        await db.tradeShows.update(show.id, {
          startDate: '2026-10-17',
          endDate: '2026-10-21',
          updatedAt: Date.now()
        });
      }
    }
  }

  // Migration des visites enregistrées hors période du salon (ex: tests enregistrés à la date du jour avant l'ouverture du salon)
  const allVisits = await db.visits.toArray();
  for (const v of allVisits) {
    const show = await db.tradeShows.get(v.tradeShowId);
    if (show && show.startDate) {
      const showEnd = show.endDate || show.startDate;
      if (v.date < show.startDate || v.date > showEnd) {
        console.log(`[IndexedDB] Recalage de la visite ${v.exhibitorName} (${v.date}) sur la date d'ouverture du salon (${show.startDate})`);
        await db.visits.update(v.id, { date: show.startDate });
      }
    }
  }

  const defaultBuyers: BuyerProfile[] = [
    {
      id: 'pxh',
      name: 'Procurement Director',
      role: 'Directrice des Achats',
      trigram: 'PXH',
      email: 'procurement_director.hu@coretrade-group.eu',
      color: '#DC2626',
      bgClass: 'bg-red-600',
      borderClass: 'border-red-600',
      textClass: 'text-red-600',
      avatar: 'PXH',
      initials: 'XH'
    },
    {
      id: 'ppl',
      name: 'Lead Developer',
      role: 'Acheteur',
      trigram: 'BUYER_A',
      email: 'developer@coretrade-group.eu',
      color: '#2563EB',
      bgClass: 'bg-blue-600',
      borderClass: 'border-blue-600',
      textClass: 'text-blue-600',
      avatar: 'BUYER_A',
      initials: 'PL'
    },
    {
      id: 'pjh',
      name: 'Buyer Specialist (Dry Foods)',
      role: 'Acheteur',
      trigram: 'BUYER_C',
      email: 'Buyer 2.Buyer 2@coretrade-group.eu',
      color: '#D97706',
      bgClass: 'bg-amber-600',
      borderClass: 'border-amber-600',
      textClass: 'text-amber-600',
      avatar: 'BUYER_C',
      initials: 'JH'
    },
    {
      id: 'pnj',
      name: 'Buyer Specialist (Packaging)',
      role: 'Acheteuse',
      trigram: 'BUYER_E',
      email: 'Buyer 4.Buyer 4@coretrade-group.eu',
      color: '#059669',
      bgClass: 'bg-emerald-600',
      borderClass: 'border-emerald-600',
      textClass: 'text-emerald-600',
      avatar: 'BUYER_E',
      initials: 'NJ'
    },
    {
      id: 'pwq',
      name: 'Buyer Specialist (Frozen)',
      role: 'Acheteur',
      trigram: 'BUYER_F',
      email: 'Buyer 5.Buyer 5@coretrade-group.eu',
      color: '#0891B2',
      bgClass: 'bg-cyan-600',
      borderClass: 'border-cyan-600',
      textClass: 'text-cyan-600',
      avatar: 'BUYER_F',
      initials: 'WQ'
    },
    {
      id: 'pjx',
      name: 'Buyer Specialist (Asia Sourcing)',
      role: 'Acheteuse',
      trigram: 'BUYER_D',
      email: 'Buyer 3.Buyer 3@coretrade-group.eu',
      color: '#7C3AED',
      bgClass: 'bg-purple-600',
      borderClass: 'border-purple-600',
      textClass: 'text-purple-600',
      avatar: 'BUYER_D',
      initials: 'JX'
    },
    {
      id: 'pel',
      name: 'Buyer Specialist (Beverages)',
      role: 'Acheteuse',
      trigram: 'BUYER_B',
      email: 'Buyer 1.Buyer 1@coretrade-group.eu',
      color: '#DB2777',
      bgClass: 'bg-pink-600',
      borderClass: 'border-pink-600',
      textClass: 'text-pink-600',
      avatar: 'BUYER_B',
      initials: 'EL'
    }
  ];

  // Nettoyage impératif des anciens profils de test (ex: 'dir' / 'DA')
  const validIds = ['pxh', 'ppl', 'pjh', 'pnj', 'pwq', 'pjx', 'pel'];
  const allCurrent = await db.buyers.toArray();
  for (const b of allCurrent) {
    if (!validIds.includes(b.id) || b.initials === 'DA') {
      await db.buyers.delete(b.id);
    }
  }

  await db.buyers.bulkPut(defaultBuyers);

  // Seeding automatique des 4 063 exposants officiels du SIRHA Lyon
  try {
    const sirhaShow = (await db.tradeShows.toArray()).find((s) =>
      s.id === 'sirha-lyon-2027' || s.shortName.toUpperCase() === 'SIRHA' || s.name.toUpperCase().includes('SIRHA')
    );

    if (sirhaShow) {
      const existingCount = await db.exhibitors.where('tradeShowId').equals(sirhaShow.id).count();
      if (existingCount === 0) {
        console.log(`[IndexedDB] Injection des 4 063 exposants officiels du Sirha Lyon pour le salon ${sirhaShow.name}...`);
        const sirhaExhibitors = (await import('./sirha_exhibitors.json')).default;
        const exhibitorsToSeed = sirhaExhibitors.map((e: any) => ({
          ...e,
          tradeShowId: sirhaShow.id
        }));
        await db.exhibitors.bulkPut(exhibitorsToSeed as Exhibitor[]);
      }
    }
  } catch (err) {
    console.warn('[IndexedDB] Erreur lors du chargement des exposants Sirha:', err);
  }
}

