/**
 * Utilitaire de compression d'images ultra-légères pour TradeReport
 * Réduit les photos de 12-15 Mo en fichiers WebP/JPEG de ~100-180 Ko (gain de ~98%)
 * Préserve la netteté des petits caractères (OCR cartes de visite)
 */

export interface CompressionResult {
  dataUrl: string;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  width: number;
  height: number;
}

export async function compressImage(
  file: File | Blob,
  maxDimension = 1400,
  quality = 0.78
): Promise<CompressionResult> {
  const originalSizeBytes = file.size;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (readerEvent) => {
      const img = new Image();

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calcul des nouvelles dimensions proportionnelles
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Impossible d'initialiser le contexte Canvas 2D"));
          return;
        }

        // Amélioration de la netteté lors du redimensionnement (très important pour les petits caractères de carte de visite)
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Essayer d'abord WebP, avec repli automatique sur JPEG
        let dataUrl = canvas.toDataURL('image/webp', quality);
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        // Calcul de la taille approximative en octets à partir du base64
        const head = dataUrl.indexOf(',');
        const b64 = head >= 0 ? dataUrl.substring(head + 1) : dataUrl;
        const compressedSizeBytes = Math.round((b64.length * 3) / 4);

        resolve({
          dataUrl,
          originalSizeBytes,
          compressedSizeBytes,
          width,
          height
        });
      };

      img.onerror = () => {
        reject(new Error("Erreur de décodage de l'image"));
      };

      img.src = readerEvent.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Erreur de lecture du fichier'));
    };

    reader.readAsDataURL(file);
  });
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 o';
  const k = 1024;
  const sizes = ['o', 'Ko', 'Mo', 'Go'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
