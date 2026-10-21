export type VisitStatus = 'todo' | 'confirmed' | 'spontaneous' | 'visited' | 'followup' | 'cancelled';
export type AppTab = 'visits' | 'schedule' | 'exhibitors' | 'sheet';

export interface TradeShow {
  id: string;
  name: string;             // ex: "SIAL Paris 2026", "Sirha Lyon 2027"
  shortName: string;        // ex: "SIAL", "SIRHA"
  city: string;             // ex: "Paris Nord Villepinte", "Eurexpo Lyon"
  country: string;          // ex: "France", "Allemagne", "Japon"
  startDate: string;        // YYYY-MM-DD
  endDate: string;          // YYYY-MM-DD
  color: string;            // Couleur d'accent (hex)
  halls: string[];          // Liste des halls/zones
  websiteUrl?: string;      // Site web officiel du salon
  notes?: string;           // Notes globales ou objectifs de l'équipe
  createdAt: number;
  updatedAt: number;
}

export interface Exhibitor {
  id: string;
  tradeShowId: string;
  name: string;             // Nom entreprise
  standNumber: string;      // ex: "5A B042"
  hall: string;             // ex: "Hall 5a"
  activity?: string;        // Produits / Famille
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  country?: string;
}

export interface BuyerProfile {
  id: string;
  name: string;             // ex: "Lead Developer"
  role: string;             // ex: "Acheteur Epicerie", "Directrice des Achats"
  trigram: string;          // Trigramme officiel (PXH, BUYER_A, BUYER_C, BUYER_E, BUYER_F, BUYER_D, BUYER_B)
  email?: string;
  color: string;            // Code HEX
  bgClass: string;          // Classe Tailwind fond badge
  borderClass?: string;     // Classe Tailwind bordure
  textClass?: string;       // Classe Tailwind texte
  avatar?: string;          // Initiales ou trigramme
  initials: string;
}

export interface VisitReport {
  id: string;
  tradeShowId: string;
  buyerId: string;
  exhibitorName: string;
  standNumber: string;
  hall: string;
  date: string;             // YYYY-MM-DD
  timeSlot: string;         // HH:MM
  durationMinutes: number;
  status: VisitStatus;
  product?: string;
  contact?: string;         // Coordonnées complètes (Nom, Tél, Email, etc.)
  notes: string;            // Compte-rendu & Échanges
  rating?: number;          // 1 à 5 étoiles ou niveau de priorité
  
  // Photos multiples
  businessCardUrl?: string;
  businessCardUrls?: string[];
  standPhotoUrl?: string;
  standPhotoUrls?: string[];
  
  updatedAt: number;
  synced?: boolean;
}

export interface BusinessCardAnalysis {
  contactName?: string;
  role?: string;
  company?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  website?: string;
  address?: string;
  summaryNotes?: string;
  modelUsed?: string;
}

export interface GeminiProgressUpdate {
  model: string;
  nextModel?: string;
  attempt: number;
  maxAttempts: number;
  delaySec?: number;
  status: 'requesting' | 'retrying' | 'switching' | 'success' | 'error';
  message: string;
}

export type GeminiProgressCallback = (update: GeminiProgressUpdate) => void;
