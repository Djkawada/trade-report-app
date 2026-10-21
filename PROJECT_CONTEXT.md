# TradeReport — Application de Reporting Multi-Salons CoreTrade

## 1. Vue d'Ensemble & Objectifs
`TradeReport` est une webapp moderne, autonome et hors-ligne (Offline-First), conçue pour les équipes achats de Global Trade Enterprise lors des salons professionnels (SIAL, Sirha, Anuga, CoreTrade Japan, Gourmet Selection, salons régionaux, etc.).

Contrairement à l'application précédente dédiée uniquement au SIAL avec plan interactif, cette version est **universelle et 100% focalisée sur l'efficacité de reporting, la prise de notes vocale, les photos et l'export consolidé**.

---

## 2. Sécurité & Code d'Accès
- **Code d'accès global** : `CORETRADE`
  - Un écran de verrouillage (`AuthLockScreen`) bloque l'application tant que le code n'est pas saisi.
  - La session est mémorisée dans le navigateur (`localStorage`).
  - Un bouton de verrouillage instantané (icône cadenas) permet de reverrouiller l'application d'un clic.
- **Suppression sécurisée de salon** : `CORETRADE`
  - Pour éviter toute suppression accidentelle d'un salon et de l'ensemble de ses fiches/photos, la suppression (`DeleteTradeShowModal`) exige de taper explicitement le mot `CORETRADE`.

---

## 3. Équipe Achats Officielle (7 Profils)
L'ancien utilisateur fictif `DA` a été supprimé. Les cross-functional procurement team officiels sont :

| Trigramme | Nom | Rôle | Couleur |
| :--- | :--- | :--- | :--- |
| **PXH** | Procurement Director | Directrice des Achats | `#DC2626` (Rouge) |
| **BUYER_A** | Lead Developer | Acheteur | `#2563EB` (Bleu) |
| **BUYER_C** | Buyer Specialist (Dry Foods) | Acheteur | `#D97706` (Ambre) |
| **BUYER_E** | Buyer Specialist (Packaging) | Acheteuse | `#059669` (Émeraude) |
| **BUYER_F** | Buyer Specialist (Frozen) | Acheteur | `#0891B2` (Cyan) |
| **BUYER_D** | Buyer Specialist (Asia Sourcing) | Acheteuse | `#7C3AED` (Violet) |
| **BUYER_B** | Buyer Specialist (Beverages) | Acheteuse | `#DB2777` (Rose) |

---

## 4. Navigation & Interface
La barre supérieure comprend deux niveaux :
1. **Barre Supérieure Principale** :
   - Logo & Sélecteur de salon actif (avec pastille de couleur, bouton de modification des dates/infos, ville, et corbeille sécurisée).
   - Bouton **Visite Express** (fiche stand créée en 5s à l'arrivée).
   - Bouton **Nouveau RDV** (planification de créneau).
   - Bouton **Import Catalogue** (assistant IA par copier-coller de texte/HTML de site de salon).
   - Bouton **Export Excel Pro** (téléchargement instantané .xlsx).
   - Sélecteur d'acheteur actif.
   - Paramètres (clé API Gemini).
   - Bouton de verrouillage rapide de l'application.
2. **Bandeau Décalé Dédié (Sous-Navigation)** :
   - **Visites & Fiches** : Liste des comptes-rendus avec filtres par statut, recherche instantanée et galerie photo.
   - **Planning Global** : Vue panoramique sur la semaine style calendrier Outlook (colonnes jours × créneaux 30 min, code couleur par acheteur, détection de doublons, clic direct pour planifier) combinée à une vue chronologique détaillée par journée.
   - **Reporting Table / Export** : Tableau synthétique consolidé avec colonne **Note d'intérêt** (1 à 5 étoiles), photos miniatures agrandissables, filtres par acheteur/jour, copie rapide CSV, et mise en page optimisée pour impression papier / PDF.

---

## 5. Catalogues Exposants Embarqués
- **Sirha Lyon 2027** :
  - **4 063 exposants officiels** extraits directement depuis la base officielle du salon (`sirha-lyon.com`).
  - Champs intégrés : Nom, Stand (3 989 stands renseignés), Hall (Hall 1 à 7, Hall Lumière, etc.), Ville, Pays, Site Web, Email et Téléphone.
  - Chargement optimisé via *dynamic import* sans ralentir le démarrage initial de l'application.
- **Assistant d'Import Catalogue IA** :
  - Permet d'imprimer ou coller le contenu web/texte de n'importe quel autre salon pour en extraire les exposants en masse grâce à Gemini.

---

## 6. Moteur IA Gemini (OCR Cartes de Visite & Structuration des Notes)
- **Cascade de modèles avec basculement automatique** :
  1. `gemini-3.5-flash` (3 essais avec délais exponentiels 2s, 4s, 8s)
  2. `gemini-3.6-flash` (3 essais)
  3. `gemini-3.7-flash` (3 essais)
  4. `gemini-3.8-flash` (3 essais)
- **Scan OCR des Cartes de Visite (`analyzeBusinessCard`)** :
  - Bouton interactif dédié permettant de prendre plusieurs photos de cartes (`capture="environment"`).
  - Compression intelligente client-side (`imageCompressor.ts`, max 1400px, WebP/JPEG ~120 Ko avec filtre de netteté pour les petits caractères).
  - Les notes et comptes-rendus ne sont **JAMAIS écrasés**.
  - Seul le champ `contact` est rempli avec les coordonnées normalisées (Nom, Poste, Société, Tél, Mobile, Web, Lieu).
  - Priorité absolue aux adresses emails professionnelles.
- **Mise en Forme & Synthèse des Notes par IA (`enhanceNotes`)** :
  - Bouton **« Améliorer avec IA »** avec icône d'étincelles dans la section de compte-rendu.
  - Analyse les notes brutes ou dictées au micro via la *Web Speech API*.
  - Conserve scrupuleusement tous les chiffres clés (prix, devises, MOQ, incoterms, délais, échantillons).
  - Restructure en synthèse claire d'acheteur :
    - 🎯 Produits & Gammes cibles
    - 💰 Conditions commerciales (prix, MOQ, conditions de paiement)
    - 📌 Prochaine action & Relance
- **Bouton Direct « Photo & Dictée IA »** : accessible en un clic dans la barre supérieure pour ouvrir immédiatement la fiche complète sans étape superflue.

---

## 6. Export Excel Haute Fidélité (`ExcelJS`)
- Fichier `.xlsx` aux couleurs CoreTrade (bordeaux / orange).
- Formatage automatique des cellules (hauteur de ligne ~100px).
- **Photos des cartes et stands intégrées directement dans les cellules** (conversion Base64 vers buffer image ExcelJS).

---

## 7. Prérequis Techniques pour Hébergement Interne (CoreTrade DSI)
Pour déployer cette webapp sur le serveur interne de CoreTrade :
1. **HTTPS Obligatoire** : requis par les navigateurs modernes pour activer la dictée vocale (`Web Speech API`) et l'accès caméra pour les photos.
2. **Distribution SPA Statique** :
   - Le dossier produit est `dist/` (`npm run build`).
   - Le serveur web (Nginx, IIS, ou Apache) doit rediriger toutes les requêtes d'URL vers `index.html`.

---

## 8. Planning Global, Dates & Calendrier Hebdomadaire (Outlook Week View)
- **Format de Date Standardisé Français (`JJ/MM/AAAA`)** :
  - Centralisé dans [`src/utils/dateUtils.ts`](file:///C:/Enterprise/Workspace
  - Appliqué sur l'ensemble de l'application : dates de salon, sélecteurs de journées, cartes de visite, tableau récapitulatif, feuille de route imprimable et exports Excel/CSV.
- **Vue Calendrier Semaine Style Outlook** :
  - Structure en tableau rigide (`table-fixed`) garantissant un alignement pixel-perfect des colonnes horaires et des jours sans déformation horizontale.
  - Découpage par tranches horaires de 30 minutes de 08:30 à 18:30.
  - Prise en charge des visites programmées et des visites spontanées (badges violets avec icône éclair).
  - Détection automatique des conflits / doublons de rendez-vous pour un même acheteur sur le même créneau.
- **Affichage par Défaut Centré sur l'Acheteur Connecté** :
  - À l'ouverture du Planning Global, seul le calendrier de l'acheteur actuellement sélectionné en haut de page (ex: Lead Developer) est affiché par défaut avec un badge **« Moi »**.
  - Le bouton **« Tous »** reste accessible en permanence pour voir le planning consolidé de l'équipe d'un simple clic.
  - La sélection d'un autre profil dans la barre de navigation synchronise instantanément le planning sur ce nouvel acheteur.
- **Filtrage et Navigation par Jour** :
  - Dans l'onglet **Visites & Fiches** et dans la **Feuille de Route / Export**, tous les jours officiels du salon sont disponibles au format français convivial (`Sam 17/10/2026`, `Dim 18/10/2026`, etc.) avec compteur dynamique de visites.
  - Recalage automatique sans débordement de fuseau horaire.



