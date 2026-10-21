import React, { useState, useRef } from 'react';
import { Exhibitor, TradeShow } from '../types';
import { GeminiService } from '../services/geminiService';
import ExcelJS from 'exceljs';
import {
  X,
  Sparkles,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Plus,
  Building,
  Check,
  FileCode,
  FileText,
  Download,
  Loader2,
  ExternalLink
} from 'lucide-react';

interface ImportExhibitorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTradeShow: TradeShow | null;
  onImport: (exhibitors: Omit<Exhibitor, 'id' | 'tradeShowId'>[]) => Promise<number>;
}

export const ImportExhibitorsModal: React.FC<ImportExhibitorsModalProps> = ({
  isOpen,
  onClose,
  activeTradeShow,
  onImport
}) => {
  const [activeTab, setActiveTab] = useState<'file' | 'smart' | 'manual'>('file');

  // État Fichier
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // État Prévisualisation (commun aux fichiers et à l'IA)
  const [parsedExhibitors, setParsedExhibitors] = useState<Omit<Exhibitor, 'id' | 'tradeShowId'>[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  // État Import Intelligent IA
  const [rawText, setRawText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');

  // État Manuel
  const [manualName, setManualName] = useState('');
  const [manualStand, setManualStand] = useState('');
  const [manualHall, setManualHall] = useState(activeTradeShow?.halls[0] || 'Hall 1');
  const [manualActivity, setManualActivity] = useState('');
  const [manualCountry, setManualCountry] = useState('');

  // État Succès
  const [successCount, setSuccessCount] = useState<number | null>(null);

  if (!isOpen) return null;

  // 1. Parsing Fichier (JSON, CSV, XLSX)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileLoading(true);
    setFileError(null);

    try {
      const fileName = file.name.toLowerCase();
      let extracted: Omit<Exhibitor, 'id' | 'tradeShowId'>[] = [];

      if (fileName.endsWith('.json')) {
        const text = await file.text();
        const json = JSON.parse(text);
        if (Array.isArray(json)) {
          extracted = json.map((item: any) => ({
            name: (item.name || item.nom || item.company || item.exhibitor || 'Exposant').trim(),
            standNumber: String(item.standNumber || item.stand || item.booth || '').trim(),
            hall: (item.hall || item.pavilion || 'Principal').trim(),
            activity: (item.activity || item.activite || item.description || item.products || '').trim(),
            country: (item.country || item.pays || '').trim(),
            email: (item.email || '').trim(),
            phone: (item.phone || item.tel || '').trim(),
            website: (item.website || item.site || '').trim()
          }));
        } else {
          throw new Error('Le fichier JSON doit contenir un tableau d’objets [...]');
        }
      } else if (fileName.endsWith('.csv')) {
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) throw new Error('Fichier CSV vide ou sans lignes de données.');

        // Détecter délimiteur (, ou ;)
        const sep = lines[0].includes(';') ? ';' : ',';
        const headers = lines[0].split(sep).map((h) => h.replace(/^["']|["']$/g, '').trim().toLowerCase());

        const nameIdx = headers.findIndex((h) => ['name', 'nom', 'societe', 'entreprise', 'exhibitor'].includes(h));
        const standIdx = headers.findIndex((h) => ['stand', 'standnumber', 'numero_stand', 'booth'].includes(h));
        const hallIdx = headers.findIndex((h) => ['hall', 'pavillon'].includes(h));
        const actIdx = headers.findIndex((h) => ['activity', 'activite', 'produits', 'famille', 'description'].includes(h));
        const countryIdx = headers.findIndex((h) => ['country', 'pays'].includes(h));
        const emailIdx = headers.findIndex((h) => ['email', 'mail', 'courriel'].includes(h));
        const phoneIdx = headers.findIndex((h) => ['phone', 'tel', 'telephone'].includes(h));
        const webIdx = headers.findIndex((h) => ['website', 'site', 'url', 'web'].includes(h));

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(sep).map((c) => c.replace(/^["']|["']$/g, '').trim());
          const name = nameIdx >= 0 ? cols[nameIdx] : cols[0];
          if (!name) continue;

          extracted.push({
            name,
            standNumber: standIdx >= 0 ? cols[standIdx] || '' : '',
            hall: hallIdx >= 0 ? cols[hallIdx] || 'Principal' : 'Principal',
            activity: actIdx >= 0 ? cols[actIdx] || '' : '',
            country: countryIdx >= 0 ? cols[countryIdx] || '' : '',
            email: emailIdx >= 0 ? cols[emailIdx] || '' : '',
            phone: phoneIdx >= 0 ? cols[phoneIdx] || '' : '',
            website: webIdx >= 0 ? cols[webIdx] || '' : ''
          });
        }
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const buffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.worksheets[0];
        if (!worksheet) throw new Error('Aucune feuille trouvée dans le classeur Excel.');

        const rows: any[] = [];
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
          rows.push(row.values);
        });

        if (rows.length < 2) throw new Error('Feuille Excel vide.');

        // headers
        const headerRow: string[] = (rows[0] as any[]).map((v) => String(v || '').trim().toLowerCase());
        const nameIdx = headerRow.findIndex((h) => ['name', 'nom', 'societe', 'entreprise', 'exhibitor'].some((k) => h.includes(k)));
        const standIdx = headerRow.findIndex((h) => ['stand', 'numero', 'booth'].some((k) => h.includes(k)));
        const hallIdx = headerRow.findIndex((h) => ['hall', 'pavillon'].some((k) => h.includes(k)));
        const actIdx = headerRow.findIndex((h) => ['activite', 'activity', 'produit', 'description'].some((k) => h.includes(k)));
        const countryIdx = headerRow.findIndex((h) => ['pays', 'country'].some((k) => h.includes(k)));

        for (let i = 1; i < rows.length; i++) {
          const r = rows[i];
          const name = String(nameIdx >= 0 ? r[nameIdx] : r[1] || '').trim();
          if (!name || name === 'undefined') continue;

          extracted.push({
            name,
            standNumber: standIdx >= 0 ? String(r[standIdx] || '').trim() : '',
            hall: hallIdx >= 0 ? String(r[hallIdx] || 'Principal').trim() : 'Principal',
            activity: actIdx >= 0 ? String(r[actIdx] || '').trim() : '',
            country: countryIdx >= 0 ? String(r[countryIdx] || '').trim() : ''
          });
        }
      } else {
        throw new Error('Format non supporté. Veuillez choisir un fichier .json, .csv ou .xlsx');
      }

      if (extracted.length === 0) {
        throw new Error('Aucun exposant valide détecté dans ce fichier.');
      }

      setParsedExhibitors(extracted);
      setSelectedIndices(new Set(extracted.map((_, idx) => idx)));
    } catch (err: any) {
      console.error('Erreur import fichier:', err);
      setFileError(err.message || 'Erreur lors du traitement du fichier.');
    } finally {
      setFileLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Télécharger un modèle d'exemple JSON
  const handleDownloadSampleJson = () => {
    const sample = [
      {
        name: 'Exemple Entreprise 1',
        standNumber: '5A B042',
        hall: 'Hall 5a',
        activity: 'Sauces artisanales, épicerie fine',
        country: 'Japon',
        email: 'contact@exemple.jp',
        website: 'https://exemple.jp'
      },
      {
        name: 'Exemple Entreprise 2',
        standNumber: '2C92',
        hall: 'Hall 2',
        activity: 'Produits surgelés, glaces',
        country: 'France',
        email: 'info@exemple.fr',
        website: 'https://exemple.fr'
      }
    ];
    const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modele_exposants_coretrade.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Télécharger un modèle d'exemple CSV
  const handleDownloadSampleCsv = () => {
    const sample = "name;standNumber;hall;activity;country;email;website\r\n" +
                   "Exemple Entreprise 1;5A B042;Hall 5a;Sauces artisanales;Japon;contact@exemple.jp;https://exemple.jp\r\n" +
                   "Exemple Entreprise 2;2C92;Hall 2;Produits surgeles;France;info@exemple.fr;https://exemple.fr";
    const blob = new Blob(['\uFEFF' + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modele_exposants_coretrade.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // 2. Analyser le texte avec Gemini IA
  const handleAnalyzeText = async () => {
    if (!rawText.trim() || !activeTradeShow) return;

    try {
      setIsAnalyzing(true);
      setProgressMsg('Connexion à Gemini Flash...');

      const results = await GeminiService.parseExhibitorListFromText(
        rawText,
        activeTradeShow.name,
        (update) => setProgressMsg(update.message)
      );

      setParsedExhibitors(results);
      setSelectedIndices(new Set(results.map((_, idx) => idx)));
    } catch (err: any) {
      console.error('Erreur extraction IA:', err);
      alert(`Erreur d'analyse : ${err.message || 'Impossible d’extraire les exposants'}`);
    } finally {
      setIsAnalyzing(false);
      setProgressMsg('');
    }
  };

  // 3. Valider l'import de la sélection
  const handleConfirmImport = async () => {
    const toImport = parsedExhibitors.filter((_, idx) => selectedIndices.has(idx));
    if (toImport.length === 0) return;

    const count = await onImport(toImport);
    setSuccessCount(count);
    setTimeout(() => {
      setSuccessCount(null);
      setParsedExhibitors([]);
      setRawText('');
      onClose();
    }, 1200);
  };

  // 4. Ajout manuel d'un exposant
  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) return;

    const count = await onImport([
      {
        name: manualName.trim(),
        standNumber: manualStand.trim(),
        hall: manualHall.trim(),
        activity: manualActivity.trim(),
        country: manualCountry.trim()
      }
    ]);

    setSuccessCount(count);
    setTimeout(() => {
      setSuccessCount(null);
      setManualName('');
      setManualStand('');
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-600/30 text-orange-400">
              <Upload className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                Importer des Exposants
              </h2>
              <p className="text-[11px] text-slate-300">
                Salon : <strong className="text-white">{activeTradeShow?.name || 'Salon'}</strong>
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

        {/* Navigation par Onglets */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-2 gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('file')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'file'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Fichier (JSON / CSV / Excel)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('smart')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'smart'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Assistant IA (Copier-coller)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'manual'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Ajout Manuel</span>
          </button>
        </div>

        {/* Notification Succès */}
        {successCount !== null && (
          <div className="m-4 p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center gap-3 text-emerald-900 animate-in fade-in">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-xs">Importation réussie !</p>
              <p className="text-[11px] text-emerald-700">
                {successCount} exposant(s) ont été enregistrés avec succès dans votre base locale.
              </p>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          
          {/* TAB 1 : IMPORT FICHIER (JSON / CSV / EXCEL) */}
          {activeTab === 'file' && (
            <div className="space-y-4">
              
              {/* Raccourci vers l'application compagnon Trade Show Extractor */}
              <div className="p-3 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border border-orange-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-orange-600 text-white font-black text-xs flex items-center justify-center shadow-2xs">
                    FX
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span>Extraire la liste depuis le site d'un salon</span>
                      <span className="bg-orange-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase">App Dédiée</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Collez le lien officiel (Sirha, Inwink, etc.) dans l'extracteur pour obtenir le fichier JSON/Excel.
                    </p>
                  </div>
                </div>
                <a
                  href="http://localhost:5175"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 flex-shrink-0 shadow-xs transition-colors self-end sm:self-center"
                >
                  <span>Lancer l'Extracteur</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Zone Drag & Drop / File input */}
              <input
                type="file"
                ref={fileInputRef}
                accept=".json,.csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-orange-500 rounded-2xl p-6 text-center hover:bg-orange-50/40 transition-all cursor-pointer space-y-2 group"
              >
                <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  {fileLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Upload className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Cliquez ou déposez votre fichier d'exposants ici
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Formats acceptés : <strong>JSON (.json)</strong>, <strong>CSV (.csv)</strong> ou <strong>Excel (.xlsx)</strong>
                  </p>
                </div>
              </div>

              {fileError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-red-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
                  <span className="text-xs">{fileError}</span>
                </div>
              )}

              {/* Télécharger des modèles d'exemple */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-600">
                <span className="font-semibold">Besoin d'un modèle type ?</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadSampleJson}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-700 flex items-center gap-1 shadow-2xs"
                  >
                    <Download className="w-3 h-3 text-orange-600" />
                    <span>Modèle JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadSampleCsv}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-700 flex items-center gap-1 shadow-2xs"
                  >
                    <Download className="w-3 h-3 text-emerald-600" />
                    <span>Modèle CSV</span>
                  </button>
                </div>
              </div>

              {/* Prévisualisation des exposants détectés */}
              {parsedExhibitors.length > 0 && (
                <div className="pt-2 border-t border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">
                      {parsedExhibitors.length} exposant(s) prêt(s) à être importé(s)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedIndices.size === parsedExhibitors.length) {
                          setSelectedIndices(new Set());
                        } else {
                          setSelectedIndices(new Set(parsedExhibitors.map((_, i) => i)));
                        }
                      }}
                      className="text-orange-600 hover:underline text-[11px] font-semibold"
                    >
                      {selectedIndices.size === parsedExhibitors.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                    </button>
                  </div>

                  <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl">
                    {parsedExhibitors.slice(0, 100).map((ex, idx) => {
                      const isSelected = selectedIndices.has(idx);
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            const next = new Set(selectedIndices);
                            if (isSelected) next.delete(idx);
                            else next.add(idx);
                            setSelectedIndices(next);
                          }}
                          className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected ? 'bg-orange-50/60' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                              isSelected ? 'bg-orange-600 border-orange-600 text-white' : 'border-slate-300'
                            }`}>
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>
                            <div className="truncate">
                              <p className="font-bold text-slate-900 truncate">{ex.name}</p>
                              <p className="text-[10px] text-slate-500 truncate">{ex.activity || 'Exposant'}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0 font-mono text-[11px]">
                            {ex.standNumber && (
                              <span className="bg-red-600 text-white font-bold px-1.5 py-0.5 rounded">
                                {ex.standNumber}
                              </span>
                            )}
                            <span className="text-slate-400">{ex.hall}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {parsedExhibitors.length > 100 && (
                    <p className="text-[10px] text-slate-400 text-center">
                      (Affichage des 100 premiers sur {parsedExhibitors.length} éléments au total)
                    </p>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleConfirmImport}
                      disabled={selectedIndices.size === 0}
                      className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50"
                    >
                      Valider l'import de {selectedIndices.size.toLocaleString()} exposant(s)
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 2 : ASSISTANT IA (COPIER-COLLER) */}
          {activeTab === 'smart' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1.5">
                  Copiez-collez le texte ou le code d'une page web du salon :
                </label>
                <textarea
                  rows={6}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Collez ici le texte copié depuis la liste exposants du salon..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-3 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  {progressMsg && <span className="text-orange-600 font-semibold">{progressMsg}</span>}
                </span>

                <button
                  type="button"
                  onClick={handleAnalyzeText}
                  disabled={isAnalyzing || !rawText.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold text-xs rounded-xl shadow-xs hover:from-orange-500 hover:to-amber-500 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-amber-200" />
                  <span>{isAnalyzing ? 'Analyse en cours...' : 'Extraire avec Gemini IA'}</span>
                </button>
              </div>

              {parsedExhibitors.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">
                      {parsedExhibitors.length} exposant(s) détecté(s)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedIndices.size === parsedExhibitors.length) {
                          setSelectedIndices(new Set());
                        } else {
                          setSelectedIndices(new Set(parsedExhibitors.map((_, i) => i)));
                        }
                      }}
                      className="text-orange-600 hover:underline text-[11px] font-semibold"
                    >
                      {selectedIndices.size === parsedExhibitors.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                    </button>
                  </div>

                  <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl">
                    {parsedExhibitors.map((ex, idx) => {
                      const isSelected = selectedIndices.has(idx);
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            const next = new Set(selectedIndices);
                            if (isSelected) next.delete(idx);
                            else next.add(idx);
                            setSelectedIndices(next);
                          }}
                          className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected ? 'bg-orange-50/60' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                              isSelected ? 'bg-orange-600 border-orange-600 text-white' : 'border-slate-300'
                            }`}>
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>
                            <div className="truncate">
                              <p className="font-bold text-slate-900 truncate">{ex.name}</p>
                              <p className="text-[10px] text-slate-500 truncate">{ex.activity || 'Exposant'}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0 font-mono text-[11px]">
                            {ex.standNumber && (
                              <span className="bg-red-600 text-white font-bold px-1.5 py-0.5 rounded">
                                {ex.standNumber}
                              </span>
                            )}
                            <span className="text-slate-400">{ex.hall}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleConfirmImport}
                      disabled={selectedIndices.size === 0}
                      className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50"
                    >
                      Importer {selectedIndices.size} exposant(s)
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3 : AJOUT MANUEL */}
          {activeTab === 'manual' && (
            <form onSubmit={handleManualAdd} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                  Nom de l'entreprise exposante *
                </label>
                <input
                  type="text"
                  required
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Ex: Kikkoman, Fromagerie Bel..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Numéro de Stand
                  </label>
                  <input
                    type="text"
                    value={manualStand}
                    onChange={(e) => setManualStand(e.target.value)}
                    placeholder="Ex: 5A B042"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Hall / Secteur
                  </label>
                  <input
                    type="text"
                    value={manualHall}
                    onChange={(e) => setManualHall(e.target.value)}
                    placeholder="Hall 1"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Activité / Famille de produits
                  </label>
                  <input
                    type="text"
                    value={manualActivity}
                    onChange={(e) => setManualActivity(e.target.value)}
                    placeholder="Ex: Sauces soja, Condiments bio"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Pays
                  </label>
                  <input
                    type="text"
                    value={manualCountry}
                    onChange={(e) => setManualCountry(e.target.value)}
                    placeholder="Ex: Japon, Italie, France"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={!manualName.trim()}
                  className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  Ajouter cet exposant au catalogue
                </button>
              </div>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};

export default ImportExhibitorsModal;
