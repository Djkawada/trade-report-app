import { BusinessCardAnalysis, GeminiProgressCallback, GeminiProgressUpdate, Exhibitor } from '../types';

// Clé API par défaut CoreTrade partagée
const DEFAULT_API_KEY = 'AQ.Ab8RN6KaLwUIt_guxT25o4jXj4wWoR5cX52oiTUP9ZZ8QroZVA';

// Chaîne des modèles : 3.5 Flash (3 essais) ➔ 3.6 Flash (3 essais) ➔ 3.7 Flash (3 essais) ➔ 3.8 Flash (3 essais)
const MODEL_CANDIDATES = [
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-3.8-flash'
];

// Délais de retry en millisecondes : 2s, puis 4s, puis 8s
const RETRY_DELAYS_MS = [2000, 4000, 8000];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class GeminiService {
  static getDefaultApiKey(): string {
    return DEFAULT_API_KEY;
  }

  static isUsingCustomKey(): boolean {
    if (typeof localStorage === 'undefined') return false;
    const stored = localStorage.getItem('coretrade_gemini_api_key');
    return !!(stored && stored.trim().length > 0);
  }

  static resetToDefaultApiKey(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('coretrade_gemini_api_key');
    }
  }

  static getApiKey(): string {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('coretrade_gemini_api_key');
      if (stored && stored.trim().length > 0) {
        return stored.trim();
      }
    }
    return DEFAULT_API_KEY;
  }

  static setApiKey(key: string): void {
    if (typeof localStorage !== 'undefined') {
      const cleanKey = key.trim();
      if (!cleanKey || cleanKey === DEFAULT_API_KEY) {
        localStorage.removeItem('coretrade_gemini_api_key');
      } else {
        localStorage.setItem('coretrade_gemini_api_key', cleanKey);
      }
    }
  }

  /**
   * Appelle l'API Gemini avec retry exponentiel (2s, 4s, 8s) et repli transparent
   */
  private static async callGeminiWithFallback(
    prompt: string,
    imageInlineData?: { mimeType: string; base64Data: string },
    onProgress?: GeminiProgressCallback,
    isJsonOutput = false
  ): Promise<{ text: string; modelUsed: string }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Clé API Gemini non configurée.');
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error(
        'Connexion Internet indisponible. Vos photos et notes sont conservées localement.'
      );
    }

    const parts: any[] = [{ text: prompt }];

    if (imageInlineData) {
      parts.push({
        inline_data: {
          mime_type: imageInlineData.mimeType,
          data: imageInlineData.base64Data
        }
      });
    }

    const generationConfig: any = {
      temperature: 0.1,
      maxOutputTokens: 4096
    };

    if (isJsonOutput) {
      generationConfig.responseMimeType = 'application/json';
    }

    const requestBody = {
      contents: [{ parts }],
      generationConfig
    };

    let lastError: any = null;

    // 1. Parcourir la chaîne des modèles candidats (3.5 -> 3.6 -> 3.7 -> 3.8)
    for (let modelIndex = 0; modelIndex < MODEL_CANDIDATES.length; modelIndex++) {
      const model = MODEL_CANDIDATES[modelIndex];
      const nextCandidate = MODEL_CANDIDATES[modelIndex + 1];

      // 2. Pour chaque modèle, autoriser jusqu'à 3 tentatives (2s, 4s, 8s)
      for (let attempt = 1; attempt <= RETRY_DELAYS_MS.length; attempt++) {
        const delayMs = RETRY_DELAYS_MS[attempt - 1];
        const delaySec = delayMs / 1000;

        try {
          onProgress?.({
            model,
            attempt,
            maxAttempts: RETRY_DELAYS_MS.length,
            status: 'requesting',
            message: `Connexion à ${model}... (essai ${attempt}/${RETRY_DELAYS_MS.length})`
          });

          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
            apiKey
          )}`;

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 18000);

          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            const candidate = data.candidates?.[0];
            const textParts = candidate?.content?.parts
              ?.map((p: any) => p.text)
              .filter(Boolean)
              .join('\n');

            if (textParts) {
              onProgress?.({
                model,
                attempt,
                maxAttempts: RETRY_DELAYS_MS.length,
                status: 'success',
                message: `Analyse validée avec ${model} !`
              });
              return { text: textParts, modelUsed: model };
            }
          }

          const statusCode = response.status;
          const errText = await response.text();

          if (statusCode === 404 || statusCode === 400) {
            console.warn(`[Gemini] Modèle ${model} indisponible (${statusCode}), bascule vers ${nextCandidate || 'suivant'}...`);
            if (nextCandidate) {
              onProgress?.({
                model,
                nextModel: nextCandidate,
                attempt,
                maxAttempts: RETRY_DELAYS_MS.length,
                status: 'switching',
                message: `Modèle ${model} non déployé. Bascule automatique vers ${nextCandidate}...`
              });
            }
            break;
          }

          if (statusCode === 503 || statusCode === 429 || statusCode >= 500) {
            const errorLabel = statusCode === 503 ? 'surchargé (503)' : (statusCode === 429 ? 'limité (429)' : `erreur ${statusCode}`);
            lastError = new Error(`Serveur Google ${errorLabel} : ${errText.slice(0, 100)}`);

            if (attempt < RETRY_DELAYS_MS.length) {
              onProgress?.({
                model,
                attempt,
                maxAttempts: RETRY_DELAYS_MS.length,
                delaySec,
                status: 'retrying',
                message: `Modèle ${model} ${errorLabel}. Réessai dans ${delaySec}s... (essai ${attempt}/${RETRY_DELAYS_MS.length})`
              });
              await sleep(delayMs);
              continue;
            } else {
              if (nextCandidate) {
                onProgress?.({
                  model,
                  nextModel: nextCandidate,
                  attempt,
                  maxAttempts: RETRY_DELAYS_MS.length,
                  status: 'switching',
                  message: `Modèle ${model} surchargé après 3 essais. Bascule vers ${nextCandidate}...`
                });
                await sleep(1000);
              }
              break;
            }
          }

          throw new Error(`Erreur Gemini HTTP ${statusCode}: ${errText.substring(0, 120)}`);
        } catch (err: any) {
          lastError = err;
          const isTimeout = err.name === 'AbortError';
          const errMsg = isTimeout ? 'Délai d’attente dépassé' : (err.message || 'Erreur réseau');

          if (attempt < RETRY_DELAYS_MS.length) {
            onProgress?.({
              model,
              attempt,
              maxAttempts: RETRY_DELAYS_MS.length,
              delaySec,
              status: 'retrying',
              message: `${errMsg}. Réessai dans ${delaySec}s (${attempt}/${RETRY_DELAYS_MS.length})...`
            });
            await sleep(delayMs);
            continue;
          } else {
            if (nextCandidate) {
              onProgress?.({
                model,
                nextModel: nextCandidate,
                attempt,
                maxAttempts: RETRY_DELAYS_MS.length,
                status: 'switching',
                message: `Échec persistant avec ${model}. Bascule vers ${nextCandidate}...`
              });
              await sleep(1000);
            }
            break;
          }
        }
      }
    }

    throw new Error(
      lastError?.message ||
        'Impossible de joindre les services Gemini après retries et bascules de modèles.'
    );
  }

  /**
   * Analyse une carte de visite professionnelle avec extraction prioritaire de l'email
   */
  static async analyzeBusinessCard(
    dataUrl: string,
    onProgress?: GeminiProgressCallback
  ): Promise<BusinessCardAnalysis> {
    const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      throw new Error("Format d'image non valide (attendu data:image/...;base64,...)");
    }

    const mimeType = matches[1];
    const base64Data = matches[2];

    const prompt = `Tu es un assistant expert pour l'équipe achats sur salon professionnel.
Analyse cette carte de visite professionnelle avec une précision extrême.
ATTENTION PARTICULIÈRE À L'EMAIL : L'adresse email professionnelle (ex: contact@societe.com, prenom.nom@domaine.com) est PRIORITAIRE ET INDISPENSABLE si elle figure sur la carte. Recherche-la attentivement dans tous les recoins.

Extraits les coordonnées et réponds EXCLUSIVEMENT avec un objet JSON strict :
{
  "contactName": "Prénom et Nom de l'interlocuteur (ou vide)",
  "role": "Poste ou fonction (ex: Export Manager, CEO, Directeur Commercial)",
  "company": "Nom de la société / Entreprise",
  "phone": "Numéro de téléphone fixe avec indicatif international",
  "mobile": "Numéro de téléphone portable / WhatsApp avec indicatif",
  "email": "Adresse email professionnelle complète (impératif si visible sur la carte)",
  "website": "Site web officiel",
  "address": "Ville et Pays",
  "summaryNotes": "Tout élément pertinent visible (gammes, marques, certifications)"
}

Si une information est introuvable ou illisible, laisse une chaîne vide "".
N'inclus aucune phrase avant ou après le JSON.`;

    const { text, modelUsed } = await this.callGeminiWithFallback(
      prompt,
      { mimeType, base64Data },
      onProgress,
      true
    );

    // 1. Nettoyage initial
    let cleanJson = text.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const firstBrace = cleanJson.indexOf('{');
    const lastBrace = cleanJson.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
    }

    const findEmailInText = (src: string): string | undefined => {
      const emailMatch = src.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
      return emailMatch ? emailMatch[1].trim() : undefined;
    };

    // 2. Parse direct
    try {
      const parsed = JSON.parse(cleanJson);
      const email = parsed.email || findEmailInText(text);
      return {
        ...(parsed as BusinessCardAnalysis),
        email: email || parsed.email,
        modelUsed
      };
    } catch {
      console.warn('[Gemini] JSON direct non conforme, extraction regex tolérante...');
    }

    // 3. Extraction tolérante Regex
    const extractField = (key: string): string | undefined => {
      const match = text.match(new RegExp(`"${key}"\\s*:\\s*"([^"\\r\\n]*)"?`, 'i'));
      if (match && match[1] && match[1].trim().length > 0) {
        return match[1].trim().replace(/^"+|"+$/g, '');
      }
      return undefined;
    };

    const contactName = extractField('contactName');
    const role = extractField('role');
    const company = extractField('company');
    const phone = extractField('phone');
    const mobile = extractField('mobile');
    const email = extractField('email') || findEmailInText(text);
    const website = extractField('website');
    const address = extractField('address');

    return {
      contactName,
      role,
      company,
      phone,
      mobile,
      email,
      website,
      address,
      modelUsed
    };
  }

  /**
   * Analyse intelligente d'un texte ou d'une page de catalogue exposants collée
   * pour extraire une liste structurée d'exposants (Nom, Stand, Hall, Activité, Pays)
   */
  static async parseExhibitorListFromText(
    rawText: string,
    tradeShowName: string,
    onProgress?: GeminiProgressCallback
  ): Promise<Omit<Exhibitor, 'id' | 'tradeShowId'>[]> {
    if (!rawText || rawText.trim().length < 10) {
      return [];
    }

    const prompt = `Tu es un assistant de gestion de salons professionnels.
Voici un texte brut copié depuis le catalogue en ligne ou le site web officiel du salon « ${tradeShowName} ».
Il contient des informations sur des exposants (noms, numéros de stands, halls, spécialités, pays).

Extrais la liste complète des exposants et réponds EXCLUSIVEMENT avec un tableau JSON valide contenant cette structure :
[
  {
    "name": "Nom complet de l'entreprise exposante",
    "standNumber": "Numéro du stand (ex: 5A B042, Stand 12, etc.)",
    "hall": "Hall ou secteur (ex: Hall 5a, Hall 1, Pavillon France)",
    "activity": "Famille de produits ou spécialité (ex: Produits laitiers, Epicerie fine, Surgelés)",
    "country": "Pays d'origine (si mentionné, sinon vide)"
  }
]

Texte source :
"""
${rawText.slice(0, 15000)}
"""

Important : 
- Réponds UNIQUEMENT avec le tableau JSON [ ... ].
- Si le stand n'est pas précisé pour une société, laisse "standNumber": "".
- Si le hall n'est pas précisé, laisse "hall": "Principal".`;

    const { text } = await this.callGeminiWithFallback(prompt, undefined, onProgress, true);

    try {
      let clean = text.trim();
      if (clean.startsWith('```json')) clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      else if (clean.startsWith('```')) clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
      const firstBracket = clean.indexOf('[');
      const lastBracket = clean.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        clean = clean.substring(firstBracket, lastBracket + 1);
      }
      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed)) {
        return parsed.map(item => ({
          name: item.name || 'Exposant',
          standNumber: item.standNumber || '',
          hall: item.hall || 'Principal',
          activity: item.activity || '',
          country: item.country || ''
        }));
      }
    } catch (err) {
      console.warn('[Gemini] Erreur lors du parsing JSON du catalogue:', err);
    }
    return [];
  }

  /**
   * Restructure et améliore des notes brutes ou dictées vocalement par IA Gemini
   */
  static async enhanceNotes(
    rawNotes: string,
    exhibitorName?: string,
    standNumber?: string,
    tradeShowName?: string,
    onProgress?: GeminiProgressCallback
  ): Promise<string> {
    if (!rawNotes || rawNotes.trim().length < 3) {
      return rawNotes;
    }

    const context = [
      tradeShowName ? `Salon : ${tradeShowName}` : '',
      exhibitorName ? `Exposant : ${exhibitorName}` : '',
      standNumber ? `Stand : ${standNumber}` : ''
    ]
      .filter(Boolean)
      .join(', ');

    const prompt = `Tu es l'assistant de saisie de l'équipe des cross-functional procurement team du groupe CoreTrade lors de visites sur salons professionnels agroalimentaires.
Prends ces notes brutes ou dictées vocalement sur le stand (${context}) et reformule-les de manière concise, percutante et professionnelle pour un compte-rendu d'achat.

Notes brutes :
« ${rawNotes} »

Consignes strictes :
1. Conserve tous les chiffres clés (prix, devises, MOQ / quantités minimales, incoterms, délais de livraison, échantillons demandés).
2. Structure la synthèse de manière claire et aérée avec des sections ou puces pertinentes :
   - 🎯 Produits & Gammes cibles
   - 💰 Conditions commerciales (prix, MOQ, conditions de paiement)
   - 📌 Prochaine action & Relance
3. Reste direct, factuel et professionnel (en français). Ne rajoute aucune formule de politesse introductive ou de conclusion.`;

    const { text } = await this.callGeminiWithFallback(prompt, undefined, onProgress);
    return text.trim();
  }
}

