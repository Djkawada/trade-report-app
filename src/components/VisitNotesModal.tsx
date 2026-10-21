import React, { useState, useRef, useEffect } from 'react';
import { VisitReport, BuyerProfile, VisitStatus, TradeShow } from '../types';
import { formatToFrenchDate } from '../utils/dateUtils';
import { GeminiService } from '../services/geminiService';
import { compressImage } from '../utils/imageCompressor';
import {
  X,
  Mic,
  MicOff,
  Camera,
  Trash2,
  Save,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Building,
  User,
  Star,
  Maximize2,
  Loader2,
  CreditCard,
  Plus,
  ZoomIn
} from 'lucide-react';

interface VisitNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  visit: VisitReport | null;
  tradeShow: TradeShow | null;
  currentBuyer: BuyerProfile | null;
  onSave: (visitData: Omit<VisitReport, 'id' | 'updatedAt'> & { id?: string }) => Promise<void>;
  onDelete?: (visitId: string) => Promise<void>;
}

export const VisitNotesModal: React.FC<VisitNotesModalProps> = ({
  isOpen,
  onClose,
  visit,
  tradeShow,
  currentBuyer,
  onSave,
  onDelete
}) => {
  // États de saisie
  const [exhibitorName, setExhibitorName] = useState('');
  const [standNumber, setStandNumber] = useState('');
  const [hall, setHall] = useState('Principal');
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('10:00');
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [status, setStatus] = useState<VisitStatus>('spontaneous');
  const [product, setProduct] = useState('');
  const [contact, setContact] = useState('');
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState<number>(3);

  // Photos
  const [cardPhotos, setCardPhotos] = useState<string[]>([]);
  const [standPhotos, setStandPhotos] = useState<string[]>([]);
  const [previewZoomPhoto, setPreviewZoomPhoto] = useState<string | null>(null);

  // Dictée vocale
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Scan OCR Cartes IA
  const [isScanningOcr, setIsScanningOcr] = useState(false);
  const [liveOcrStatus, setLiveOcrStatus] = useState('');

  // Restructuration Notes IA
  const [isEnhancingNotes, setIsEnhancingNotes] = useState(false);

  // Messages de notification IA
  const [aiMessage, setAiMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Refs pour inputs de fichiers
  const cardInputRef = useRef<HTMLInputElement>(null);
  const standInputRef = useRef<HTMLInputElement>(null);

  // Initialisation à l'ouverture
  useEffect(() => {
    if (!isOpen) return;

    const getInitialDate = () => {
      const today = new Date().toISOString().slice(0, 10);
      if (!tradeShow?.startDate) return today;
      if (today >= tradeShow.startDate && (!tradeShow.endDate || today <= tradeShow.endDate)) {
        return today;
      }
      return tradeShow.startDate;
    };

    if (visit) {
      setExhibitorName(visit.exhibitorName || '');
      setStandNumber(visit.standNumber || '');
      setHall(visit.hall || 'Principal');
      setDate(visit.date || getInitialDate());
      setTimeSlot(visit.timeSlot || '10:00');
      setDurationMinutes(visit.durationMinutes || 25);
      setStatus(visit.status || 'spontaneous');
      setProduct(visit.product || '');
      setContact(visit.contact || '');
      setNotes(visit.notes || '');
      setRating(visit.rating || 3);

      const cards = visit.businessCardUrls && visit.businessCardUrls.length > 0
        ? visit.businessCardUrls
        : (visit.businessCardUrl ? [visit.businessCardUrl] : []);
      setCardPhotos(cards);

      const stands = visit.standPhotoUrls && visit.standPhotoUrls.length > 0
        ? visit.standPhotoUrls
        : (visit.standPhotoUrl ? [visit.standPhotoUrl] : []);
      setStandPhotos(stands);
    } else {
      setExhibitorName('');
      setStandNumber('');
      setHall(tradeShow?.halls[0] || 'Principal');
      setDate(getInitialDate());
      setTimeSlot('10:00');
      setDurationMinutes(20);
      setStatus('spontaneous');
      setProduct('');
      setContact('');
      setNotes('');
      setRating(3);
      setCardPhotos([]);
      setStandPhotos([]);
    }
    setAiMessage(null);
    setLiveOcrStatus('');
  }, [isOpen, visit, tradeShow]);

  // Initialisation de la reconnaissance vocale Web Speech API
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'fr-FR';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript + ' ';
          }
        }
        if (transcript.trim()) {
          setNotes((prev) => (prev ? `${prev.trim()}\n${transcript.trim()}` : transcript.trim()));
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('[Dictée vocale] Erreur:', e?.error);
        setIsRecording(false);
      };
      recognition.onend = () => setIsRecording(false);
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("La dictée vocale n'est pas supportée par ce navigateur (veuillez utiliser Google Chrome, Edge ou Safari sur HTTPS).");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.warn(err);
      }
    }
  };

  // Ajout de cartes de visite
  const handleCardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      const compressedList: string[] = [];
      for (const file of files) {
        const compressed = await compressImage(file, 1400, 0.78);
        compressedList.push(compressed.dataUrl);
      }

      setCardPhotos((prev) => [...prev, ...compressedList]);
      setAiMessage({
        type: 'success',
        text: `📷 ${compressedList.length} carte(s) enregistrée(s). Cliquez sur « Scanner avec Gemini » pour extraire le contact.`
      });
    } catch (err: any) {
      setAiMessage({ type: 'error', text: err.message || "Erreur de chargement de la photo" });
    } finally {
      if (cardInputRef.current) cardInputRef.current.value = '';
    }
  };

  // Suppression d'une carte spécifique
  const handleRemoveCard = (indexToRemove: number) => {
    setCardPhotos((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Analyse complète des cartes de visite avec Gemini OCR
  const handleScanCardsWithGemini = async () => {
    if (cardPhotos.length === 0) return;
    setIsScanningOcr(true);
    setLiveOcrStatus('Démarrage du scan IA Gemini...');
    setAiMessage(null);

    try {
      const allContactEntries: string[] = [];

      for (let i = 0; i < cardPhotos.length; i++) {
        const photoUrl = cardPhotos[i];
        const cardLabel = cardPhotos.length > 1 ? ` (${i + 1}/${cardPhotos.length})` : '';

        const result = await GeminiService.analyzeBusinessCard(photoUrl, (progress) => {
          setLiveOcrStatus(`${cardLabel ? `[${i + 1}/${cardPhotos.length}] ` : ''}${progress.message}`);
        });

        const lines: string[] = [];
        const nameAndRole = [result.contactName, result.role ? `(${result.role})` : ''].filter(Boolean).join(' ');
        if (nameAndRole) lines.push(nameAndRole);
        if (result.company) lines.push(`Société : ${result.company}`);
        if (result.email) lines.push(`Email : ${result.email}`);
        const phone = result.phone || result.mobile;
        if (phone) lines.push(`Tél : ${phone}`);
        if (result.website) lines.push(`Web : ${result.website}`);
        if (result.address) lines.push(`Lieu : ${result.address}`);
        if (result.summaryNotes && !nameAndRole && !result.summaryNotes.includes('{')) {
          lines.push(result.summaryNotes);
        }

        if (lines.length > 0) {
          const header = cardPhotos.length > 1 ? `[Carte #${i + 1}]` : '';
          allContactEntries.push([header, ...lines].filter(Boolean).join('\n'));
        }

        // Si l'exposant n'a pas encore de nom saisi et que la carte indique une société
        if (!exhibitorName.trim() && result.company) {
          setExhibitorName(result.company);
        }
      }

      setLiveOcrStatus('');

      // Insérer TOUTES les coordonnées exclusivement dans le champ Contact
      if (allContactEntries.length > 0) {
        const fullContactText = allContactEntries.join('\n\n');
        setContact((prev) => (prev ? `${prev.trim()}\n\n${fullContactText}` : fullContactText));
      }

      setAiMessage({
        type: 'success',
        text: `✨ ${cardPhotos.length} carte(s) analysée(s) avec succès ! Coordonnées insérées dans la colonne Contact.`
      });
    } catch (err: any) {
      console.error('[Gemini Card OCR]', err);
      setLiveOcrStatus('');
      setAiMessage({
        type: 'error',
        text: err.message || "Impossible d'analyser la carte de visite pour l'instant (réseau)."
      });
    } finally {
      setIsScanningOcr(false);
    }
  };

  // Ajout de photos de stand
  const handleStandUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      const compressedList: string[] = [];
      for (const file of files) {
        const compressed = await compressImage(file, 1400, 0.75);
        compressedList.push(compressed.dataUrl);
      }
      setStandPhotos((prev) => [...prev, ...compressedList]);
      setAiMessage({
        type: 'success',
        text: `📸 ${compressedList.length} photo(s) de stand enregistrée(s).`
      });
    } catch (err: any) {
      setAiMessage({ type: 'error', text: err.message || "Erreur de compression d'image" });
    } finally {
      if (standInputRef.current) standInputRef.current.value = '';
    }
  };

  // Suppression d'une photo de stand spécifique
  const handleRemoveStandPhoto = (indexToRemove: number) => {
    setStandPhotos((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Restructuration et mise en forme des notes par l'IA Gemini
  const handleEnhanceNotesWithGemini = async () => {
    if (!notes || notes.trim().length < 5) {
      setAiMessage({
        type: 'error',
        text: 'Veuillez saisir ou dicter quelques notes avant de lancer la mise en forme par IA.'
      });
      return;
    }

    setIsEnhancingNotes(true);
    setAiMessage(null);

    try {
      const enhanced = await GeminiService.enhanceNotes(
        notes,
        exhibitorName,
        standNumber,
        tradeShow?.name
      );
      setNotes(enhanced);
      setAiMessage({
        type: 'success',
        text: '✨ Notes restructurées et synthétisées par Gemini avec succès.'
      });
    } catch (err: any) {
      setAiMessage({
        type: 'error',
        text: err.message || 'Erreur lors de la synthèse des notes par IA.'
      });
    } finally {
      setIsEnhancingNotes(false);
    }
  };

  // Soumission finale du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exhibitorName.trim()) return;

    try {
      setIsSaving(true);
      await onSave({
        id: visit?.id,
        tradeShowId: tradeShow?.id || 'default-show',
        buyerId: visit?.buyerId || currentBuyer?.id || 'ppl',
        exhibitorName: exhibitorName.trim(),
        standNumber: standNumber.trim(),
        hall: hall.trim(),
        date,
        timeSlot,
        durationMinutes,
        status,
        product: product.trim(),
        contact: contact.trim(),
        notes: notes.trim(),
        rating,
        businessCardUrl: cardPhotos[0],
        businessCardUrls: cardPhotos,
        standPhotoUrl: standPhotos[0],
        standPhotoUrls: standPhotos
      });
      onClose();
    } catch (err: any) {
      setAiMessage({ type: 'error', text: err.message || "Erreur lors de l'enregistrement" });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-orange-600/30 text-orange-400 flex-shrink-0">
              <Building className="w-5 h-5 text-orange-400" />
            </div>
            <div className="truncate">
              <h2 className="text-base font-bold text-white truncate">
                {visit ? `Fiche Visite : ${visit.exhibitorName}` : 'Nouvelle Fiche de Visite'}
              </h2>
              <p className="text-[11px] text-slate-300 truncate">
                {tradeShow?.name} • {standNumber ? `Stand ${standNumber}` : 'Sans stand attribué'} • Hall {hall}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          
          {/* Bannière de Notification IA */}
          {aiMessage && (
            <div
              className={`p-3 rounded-2xl text-xs font-medium flex items-start gap-2 animate-in fade-in ${
                aiMessage.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
                  : 'bg-red-50 border border-red-300 text-red-900'
              }`}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{aiMessage.text}</div>
              <button
                type="button"
                onClick={() => setAiMessage(null)}
                className="text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Statut & Note Étoiles */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-slate-500 uppercase mr-1">Statut :</span>
              {(['visited', 'confirmed', 'spontaneous', 'followup', 'todo', 'cancelled'] as VisitStatus[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatus(st)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    status === st
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {st === 'visited' && 'Visité ✅'}
                  {st === 'confirmed' && 'RDV Confirmé'}
                  {st === 'spontaneous' && 'Spontané'}
                  {st === 'followup' && 'À relancer ⏳'}
                  {st === 'todo' && 'À visiter'}
                  {st === 'cancelled' && 'Annulé'}
                </button>
              ))}
            </div>

            {/* Note d'intérêt (1-5) */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase mr-1">Intérêt :</span>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`w-4 h-4 ${
                      star <= rating ? 'text-amber-500 fill-amber-500' : 'text-slate-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Société, Stand, Hall */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                Société / Exposant *
              </label>
              <input
                type="text"
                required
                value={exhibitorName}
                onChange={(e) => setExhibitorName(e.target.value)}
                placeholder="Ex: Shibanuma, Garcia Jamones, Daisho..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                N° de Stand
              </label>
              <input
                type="text"
                value={standNumber}
                onChange={(e) => setStandNumber(e.target.value)}
                placeholder="Ex: 5A B042"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                Hall / Secteur
              </label>
              <input
                type="text"
                value={hall}
                onChange={(e) => setHall(e.target.value)}
                placeholder="Hall 5a"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Date, Heure & Gammes de produits */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1 flex items-center justify-between">
                <span>Date</span>
                {date && <span className="font-mono text-[10px] text-orange-600 font-bold">({formatToFrenchDate(date)})</span>}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                Heure
              </label>
              <input
                type="time"
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                Produits / Gammes
              </label>
              <input
                type="text"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="Sauces soja, huiles, snacks..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
              />
            </div>
          </div>

          {/* SECTION 1 : PHOTOS TERRAIN (Cartes de Visite & Photos Stand) */}
          <div className="space-y-3 pt-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Photos terrain & Cartes de visite</span>
              <span className="text-[10px] text-slate-400 font-normal">Compression automatique WebP/JPEG</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* Box 1 : Cartes de Visite (Multi-cartes + Scan IA) */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-col justify-between space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    <span>Cartes de Visite</span>
                  </span>
                  {cardPhotos.length > 0 && (
                    <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200">
                      {cardPhotos.length} carte{cardPhotos.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <input
                  type="file"
                  accept="image/*"
                  multiple
                  capture="environment"
                  ref={cardInputRef}
                  onChange={handleCardUpload}
                  className="hidden"
                />

                {cardPhotos.length > 0 ? (
                  <div className="space-y-2.5">
                    {/* Grille de miniatures */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {cardPhotos.map((url, idx) => (
                        <div
                          key={idx}
                          className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-video flex items-center justify-center shadow-2xs"
                        >
                          <img
                            src={url}
                            alt={`Carte ${idx + 1}`}
                            className="h-full w-full object-cover cursor-pointer"
                            onClick={() => setPreviewZoomPhoto(url)}
                          />

                          <button
                            type="button"
                            onClick={() => setPreviewZoomPhoto(url)}
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[11px] font-bold transition-opacity cursor-pointer"
                          >
                            <ZoomIn className="w-3.5 h-3.5 mr-1" /> Agrandir
                          </button>

                          <span className="absolute bottom-1 left-1 bg-black/60 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded">
                            #{idx + 1}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveCard(idx);
                            }}
                            className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-red-600 text-white rounded-lg transition-colors cursor-pointer"
                            title="Supprimer cette carte"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}

                      {/* Tuile Ajouter */}
                      <button
                        type="button"
                        onClick={() => cardInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-2 text-center hover:bg-blue-50/50 transition-all flex flex-col items-center justify-center gap-1 aspect-video cursor-pointer text-slate-600 hover:text-blue-700"
                      >
                        <Plus className="w-4 h-4 text-blue-600" />
                        <span className="text-[10px] font-bold">Ajouter</span>
                      </button>
                    </div>

                    {/* Statut OCR en direct */}
                    {liveOcrStatus && (
                      <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-medium flex items-center gap-2 animate-pulse">
                        <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0 text-amber-600" />
                        <span className="flex-1 leading-tight">{liveOcrStatus}</span>
                      </div>
                    )}

                    {/* Boutons d'action scan IA */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={handleScanCardsWithGemini}
                        disabled={isScanningOcr}
                        className="flex-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        title="Extraire les coordonnées par IA Gemini"
                      >
                        {isScanningOcr ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        )}
                        <span>{isScanningOcr ? 'Scan en cours...' : 'Scanner avec Gemini'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCardPhotos([])}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                        title="Supprimer toutes les cartes"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                ) : (
                  <div>
                    <button
                      type="button"
                      onClick={() => cardInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-4 text-center hover:bg-blue-50/50 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                        <Camera className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-slate-800">
                        Prendre les cartes en photo (Plusieurs possibles)
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Appareil photo ou fichier
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Box 2 : Photos Stand & Produits (Multi-photos) */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-col justify-between space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-emerald-600" />
                    <span>Photos Stand & Produits</span>
                  </span>
                  {standPhotos.length > 0 && (
                    <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                      {standPhotos.length} photo{standPhotos.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <input
                  type="file"
                  accept="image/*"
                  multiple
                  capture="environment"
                  ref={standInputRef}
                  onChange={handleStandUpload}
                  className="hidden"
                />

                {standPhotos.length > 0 ? (
                  <div className="space-y-2.5">
                    {/* Grille de miniatures photos stand */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {standPhotos.map((url, idx) => (
                        <div
                          key={idx}
                          className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-video flex items-center justify-center shadow-2xs"
                        >
                          <img
                            src={url}
                            alt={`Stand ${idx + 1}`}
                            className="h-full w-full object-cover cursor-pointer"
                            onClick={() => setPreviewZoomPhoto(url)}
                          />

                          <button
                            type="button"
                            onClick={() => setPreviewZoomPhoto(url)}
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[11px] font-bold transition-opacity cursor-pointer"
                          >
                            <ZoomIn className="w-3.5 h-3.5 mr-1" /> Agrandir
                          </button>

                          <span className="absolute bottom-1 left-1 bg-black/60 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded">
                            #{idx + 1}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveStandPhoto(idx);
                            }}
                            className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-red-600 text-white rounded-lg transition-colors cursor-pointer"
                            title="Supprimer cette photo"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}

                      {/* Tuile Ajouter */}
                      <button
                        type="button"
                        onClick={() => standInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-2 text-center hover:bg-emerald-50/50 transition-all flex flex-col items-center justify-center gap-1 aspect-video cursor-pointer text-slate-600 hover:text-emerald-700"
                      >
                        <Plus className="w-4 h-4 text-emerald-600" />
                        <span className="text-[10px] font-bold">Ajouter</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                      <span>{standPhotos.length} photo(s) de stand</span>
                      <button
                        type="button"
                        onClick={() => standInputRef.current?.click()}
                        className="font-bold text-emerald-700 hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Autre photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <button
                      type="button"
                      onClick={() => standInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-4 text-center hover:bg-emerald-50/50 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                        <Camera className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-slate-800">
                        Photographier le stand (Plusieurs photos possibles)
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Vitrine, PLV, packagings, nouveautés
                      </span>
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* SECTION 2 : COORDONNÉES CONTACT (Rempli par l'OCR ou manuellement) */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1 flex items-center justify-between">
              <span>Coordonnées Contact (Nom, Poste, Email, Téléphone)</span>
              <span className="text-[10px] font-normal text-slate-400">Rempli automatiquement par le scan de carte</span>
            </label>
            <textarea
              rows={3}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Contact : M. Tanaka&#10;Poste : Export Manager&#10;Email : tanaka@shibanuma.com&#10;Tél : +81 3 1234 5678"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white font-mono"
            />
          </div>

          {/* SECTION 3 : COMPTE-RENDU, DICTÉE VOCALE & AMÉLIORATION IA */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span>Compte-rendu & Échanges</span>
                {isRecording && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-red-600 font-bold animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-red-600" />
                    Écoute en cours...
                  </span>
                )}
              </label>

              <div className="flex items-center gap-1.5">
                {/* Bouton Dictée vocale */}
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                    isRecording
                      ? 'bg-red-600 text-white animate-pulse shadow-md'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                  title="Dicter au micro"
                >
                  {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-red-600" />}
                  <span>{isRecording ? 'Arrêter micro' : 'Dicter'}</span>
                </button>

                {/* Bouton Restructuration Gemini IA */}
                <button
                  type="button"
                  onClick={handleEnhanceNotesWithGemini}
                  disabled={isEnhancingNotes || !notes}
                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                  title="Restructurer et organiser les notes par IA"
                >
                  {isEnhancingNotes ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  )}
                  <span>Améliorer avec IA</span>
                </button>
              </div>
            </div>

            <textarea
              rows={5}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Saisissez ou dictez vos notes d'entretien (produits présentés, prix, MOQ, incoterms, délais, échantillons demandés... puis cliquez sur « Améliorer avec IA » pour les organiser automatiquement)"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white leading-relaxed"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            {visit && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Supprimer définitivement la visite de « ${visit.exhibitorName} » ?`)) {
                    onDelete(visit.id);
                    onClose();
                  }
                }}
                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer la visite</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={!exhibitorName.trim() || isSaving}
                className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{isSaving ? 'Enregistrement...' : 'Enregistrer la visite'}</span>
              </button>
            </div>
          </div>

        </form>

      </div>

      {/* Lightbox Zoom Photo */}
      {previewZoomPhoto && (
        <div
          className="fixed inset-0 z-60 bg-black/85 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setPreviewZoomPhoto(null)}
        >
          <div className="max-w-3xl max-h-[85vh] relative" onClick={(e) => e.stopPropagation()}>
            <img src={previewZoomPhoto} alt="Zoom" className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" />
            <button
              type="button"
              onClick={() => setPreviewZoomPhoto(null)}
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

export default VisitNotesModal;
