/**
 * Générateur de classeur Microsoft Excel (.xlsx) avec photos intégrées en haute résolution
 * Compatible multi-salons
 */

import ExcelJS from 'exceljs';
import { VisitReport, BuyerProfile, TradeShow } from '../types';
import { formatToFrenchDate } from '../utils/dateUtils';

interface ImageDimensions {
  pngUrl: string;
  width: number;
  height: number;
}

/**
 * Convertit une image dataUrl (WebP/JPEG) en PNG haute définition compatible OpenXML pour Excel
 */
async function processImageForExcel(dataUrl: string): Promise<ImageDimensions> {
  if (typeof window === 'undefined' || !dataUrl) {
    return { pngUrl: dataUrl, width: 240, height: 150 };
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const maxW = 1000;
        const maxH = 750;
        let w = img.width;
        let h = img.height;

        if (w > maxW) {
          h = Math.round((h * maxW) / w);
          w = maxW;
        }
        if (h > maxH) {
          w = Math.round((w * maxH) / h);
          h = maxH;
        }

        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ pngUrl: dataUrl, width: 240, height: 150 });
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, w, h);

        const pngUrl = canvas.toDataURL('image/png');

        const boxW = 250;
        const boxH = 150;
        const ratio = Math.min(boxW / w, boxH / h);
        const displayW = Math.max(120, Math.round(w * ratio));
        const displayH = Math.max(80, Math.round(h * ratio));

        resolve({ pngUrl, width: displayW, height: displayH });
      } catch {
        resolve({ pngUrl: dataUrl, width: 240, height: 150 });
      }
    };
    img.onerror = () => resolve({ pngUrl: dataUrl, width: 240, height: 150 });
    img.src = dataUrl;
  });
}

export async function exportVisitsToXlsx(
  visits: VisitReport[],
  tradeShow: TradeShow,
  allBuyers: BuyerProfile[],
  filename?: string
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Global Trade Enterprise - Reporting Salons';
  workbook.lastModifiedBy = 'TradeReport App';
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheetName = (tradeShow.shortName || tradeShow.name).slice(0, 31);
  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: true }],
    properties: { defaultRowHeight: 28 }
  });

  // 1. Calcul du nombre max de cartes et photos
  let maxCards = 1;
  let maxStands = 1;

  visits.forEach((v) => {
    const cardCount = (v.businessCardUrls && v.businessCardUrls.length > 0)
      ? v.businessCardUrls.length
      : (v.businessCardUrl ? 1 : 0);
    if (cardCount > maxCards) maxCards = cardCount;

    const standCount = (v.standPhotoUrls && v.standPhotoUrls.length > 0)
      ? v.standPhotoUrls.length
      : (v.standPhotoUrl ? 1 : 0);
    if (standCount > maxStands) maxStands = standCount;
  });

  // 2. Colonnes
  const columns: { header: string; key: string; width: number }[] = [
    { header: 'VISITEUR', key: 'buyer', width: 20 },
    { header: 'FOURNISSEUR / STAND', key: 'supplier', width: 30 },
    { header: 'PRODUIT / FAMILLE', key: 'product', width: 22 },
    { header: 'COORDONNÉES CONTACT', key: 'contact', width: 34 },
    { header: 'STAND', key: 'stand', width: 14 },
    { header: 'DATE', key: 'date', width: 13 },
    { header: 'HEURE', key: 'time', width: 14 },
    { header: 'STATUT', key: 'status', width: 16 },
    { header: 'NOTE INTÉRÊT', key: 'rating', width: 18 }
  ];

  const startCardColIndex = columns.length + 1; // 1-indexed pour ExcelJS

  const cardColKeys: string[] = [];
  for (let c = 0; c < maxCards; c++) {
    const colKey = `card_${c}`;
    cardColKeys.push(colKey);
    const headerTitle = maxCards === 1 ? 'CARTE DE VISITE' : `CARTE DE VISITE ${c + 1}`;
    columns.push({ header: headerTitle, key: colKey, width: 38 });
  }

  const standColKeys: string[] = [];
  for (let s = 0; s < maxStands; s++) {
    const colKey = `stand_${s}`;
    standColKeys.push(colKey);
    const headerTitle = maxStands === 1 ? 'PHOTO STAND/PRODUIT' : `PHOTO ${s + 1}`;
    columns.push({ header: headerTitle, key: colKey, width: 38 });
  }

  columns.push({ header: 'COMPTE-RENDU & ÉCHANGES', key: 'notes', width: 45 });

  worksheet.columns = columns;

  // 3. Style de l'en-tête (couleur du salon ou orange CoreTrade par défaut)
  const headerRow = worksheet.getRow(1);
  headerRow.height = 32;
  const headerHex = (tradeShow.color ? tradeShow.color.replace('#', '') : 'EA580C').toUpperCase();
  const argbColor = `FF${headerHex}`;

  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: argbColor }
    };
    cell.font = {
      color: { argb: 'FFFFFFFF' },
      bold: true,
      size: 11
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'medium', color: { argb: 'FF64748B' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } }
    };
  });

  const startStandColIndex = startCardColIndex + maxCards;

  // 4. Remplissage des données
  for (let i = 0; i < visits.length; i++) {
    const v = visits[i];
    const rowIdx = i + 2;

    const buyerObj = allBuyers.find((b) => b.id === v.buyerId);
    const buyerName = buyerObj ? buyerObj.name : v.buyerId;
    const stand = v.standNumber ? `${v.standNumber}${v.hall ? ` (${v.hall})` : ''}` : v.hall || '';

    let statusLabel = 'À visiter';
    if (v.status === 'visited') statusLabel = 'Visité ✅';
    else if (v.status === 'confirmed') statusLabel = 'RDV confirmé';
    else if (v.status === 'spontaneous') statusLabel = 'Visite spontanée';
    else if (v.status === 'followup') statusLabel = 'À relancer ⏳';
    else if (v.status === 'cancelled') statusLabel = 'Annulé';

    const cardPhotos = (v.businessCardUrls && v.businessCardUrls.length > 0)
      ? v.businessCardUrls
      : (v.businessCardUrl ? [v.businessCardUrl] : []);

    const standPhotos = (v.standPhotoUrls && v.standPhotoUrls.length > 0)
      ? v.standPhotoUrls
      : (v.standPhotoUrl ? [v.standPhotoUrl] : []);

    const hasAnyPhoto = cardPhotos.length > 0 || standPhotos.length > 0;

    let ratingLabel = '—';
    if (v.rating && v.rating > 0) {
      ratingLabel = `${'★'.repeat(v.rating)}${'☆'.repeat(5 - v.rating)} (${v.rating}/5)`;
    }

    const rowData: Record<string, any> = {
      buyer: buyerName,
      supplier: v.exhibitorName,
      product: v.product || '',
      contact: v.contact || '',
      stand: stand,
      date: formatToFrenchDate(v.date),
      time: `${v.timeSlot} (${v.durationMinutes} min)`,
      status: statusLabel,
      rating: ratingLabel,
      notes: v.notes || ''
    };

    cardColKeys.forEach((key, cIdx) => {
      rowData[key] = cardPhotos[cIdx] ? '' : '—';
    });

    standColKeys.forEach((key, sIdx) => {
      rowData[key] = standPhotos[sIdx] ? '' : '—';
    });

    const row = worksheet.addRow(rowData);
    row.height = hasAnyPhoto ? 160 : 28;

    row.eachCell((cell) => {
      cell.alignment = { vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    });

    // Insérer les cartes de visite
    for (let c = 0; c < cardPhotos.length; c++) {
      const dataUrl = cardPhotos[c];
      if (dataUrl && dataUrl.startsWith('data:image/')) {
        try {
          const processed = await processImageForExcel(dataUrl);
          const base64Data = processed.pngUrl.replace(/^data:image\/png;base64,/, '');

          const imageId = workbook.addImage({
            base64: base64Data,
            extension: 'png'
          });

          const colIndex = startCardColIndex + c - 1; // 0-indexed pour ExcelJS

          worksheet.addImage(imageId, {
            tl: { col: colIndex + 0.08, row: rowIdx - 1 + 0.06 },
            ext: { width: processed.width, height: processed.height },
            editAs: 'oneCell'
          });
        } catch (imgErr) {
          console.warn(`Erreur insertion carte #${c + 1} ligne ${rowIdx}:`, imgErr);
        }
      }
    }

    // Insérer les photos de stand
    for (let s = 0; s < standPhotos.length; s++) {
      const dataUrl = standPhotos[s];
      if (dataUrl && dataUrl.startsWith('data:image/')) {
        try {
          const processed = await processImageForExcel(dataUrl);
          const base64Data = processed.pngUrl.replace(/^data:image\/png;base64,/, '');

          const imageId = workbook.addImage({
            base64: base64Data,
            extension: 'png'
          });

          const colIndex = startStandColIndex + s - 1;

          worksheet.addImage(imageId, {
            tl: { col: colIndex + 0.08, row: rowIdx - 1 + 0.06 },
            ext: { width: processed.width, height: processed.height },
            editAs: 'oneCell'
          });
        } catch (imgErr) {
          console.warn(`Erreur insertion photo stand #${s + 1} ligne ${rowIdx}:`, imgErr);
        }
      }
    }
  }

  // Téléchargement
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const finalName = filename || `${tradeShow.shortName || 'Salon'}_Reporting_Visites_${new Date().toISOString().slice(0, 10)}.xlsx`;
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = finalName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
