import html2canvas from 'html2canvas';

export interface SharePreviewData {
  title: string;
  subtitle?: string;
  reading?: string;
  text?: string;
  meditation?: string;
  prayer?: string;
  adoration?: string;
  number?: number;
  type: 'station' | 'day';
}

/**
 * Génère une image optimisée pour le partage (1080x1920 pour WhatsApp Status)
 * Le pied de page est sur UNE SEULE ligne
 */
export const generateShareImage = async (data: SharePreviewData): Promise<Blob | null> => {
  try {
    // Si une source DOM existe (par ex. le dialog ouvert marqué avec id="share-source"),
    // on la clone pour préserver exactement le rendu (tailwind, styles, tailles de police).
    const sourceEl = typeof document !== 'undefined' ? document.getElementById('share-source') : null;
    if (sourceEl) {
      try {
        const container = document.createElement('div');
        container.style.cssText = `position: fixed; left: -9999px; top: -9999px; width: 1080px; height: 1920px; background: linear-gradient(180deg, #ffffff 0%, #fbf7ff 100%); padding: 48px; box-sizing: border-box; display:flex; align-items:center; justify-content:center;`;

        // clone du node source pour conserver classes/tailwind
        const clone = sourceEl.cloneNode(true) as HTMLElement;
        // Retirer éléments interactifs susceptibles d'altérer le rendu
        clone.querySelectorAll('button, [role="button"], input, textarea, select').forEach(n => n.remove());

        // Appliquer une taille de base un peu plus grande pour éviter que les textes paraissent trop petits
        const titleLen = data.title ? data.title.length : 0;
        const baseFont = titleLen < 24 ? 20 : 16;
        clone.style.fontSize = `${baseFont}px`;
        clone.style.maxWidth = '920px';
        clone.style.width = '100%';
        clone.style.boxSizing = 'border-box';

        // Assurer que le clone est lisible et centré
        const innerWrapper = document.createElement('div');
        innerWrapper.style.cssText = 'width:100%; display:flex; justify-content:center; align-items:stretch;';
        innerWrapper.appendChild(clone);
        container.appendChild(innerWrapper);
        document.body.appendChild(container);

        // shrink-to-fit utility: réduit la taille de police jusqu'à ce que le contenu tienne
        const fitText = (el: HTMLElement, { maxSize = 96, minSize = 12, maxHeight = Infinity } = {}) => {
          try {
            const getSize = (n: HTMLElement) => parseFloat(window.getComputedStyle(n).fontSize || '16');
            let size = Math.min(getSize(el), maxSize);
            const step = Math.max(1, Math.floor(size * 0.06));
            while (size > minSize) {
              el.style.fontSize = `${size}px`;
              if (el.scrollHeight <= maxHeight) break;
              size -= step;
            }
          } catch (e) {
            /* ignore */
          }
        };

        // appliquer sur titre / citation du clone si présents
        const clonedTitle = clone.querySelector('h1') as HTMLElement | null;
        const clonedQuote = clone.querySelector('p, .quote') as HTMLElement | null;
        if (clonedTitle) fitText(clonedTitle, { maxSize: 96, minSize: 20, maxHeight: 420 });
        if (clonedQuote) fitText(clonedQuote, { maxSize: 56, minSize: 16, maxHeight: 820 });

        const canvas = await html2canvas(container, {
          backgroundColor: '#ffffff',
          scale: 3,
          useCORS: true,
          allowTaint: true,
          logging: false,
          width: 1080,
          height: 1920,
          windowHeight: 1920,
          textStrokeWidth: 0,
        });

        document.body.removeChild(container);

        return await new Promise((resolve) => {
          canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
        });
      } catch (err) {
        console.warn('Échec du rendu depuis le DOM source, fallback au template interne.', err);
        // continue vers fallback template
      }
    }

    // Helpers pour calculer tailles de police adaptatives
    const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
    const titleLen = data.title ? data.title.length : 0;
    const mainTextLen = data.text ? data.text.length : 0;

    const titleSize = clamp(titleLen < 24 ? 72 : titleLen < 48 ? 56 : 44, 32, 96);
    const subtitleSize = clamp((data.subtitle || '').length < 40 ? 22 : 18, 14, 28);
    const readingSize = 18;

    // For quoted main text we scale: shorter text -> bigger font
    const quoteBase = mainTextLen < 100 ? 44 : mainTextLen < 220 ? 32 : 24;
    const quoteSize = clamp(quoteBase, 18, 64);
    const quoteLineHeight = quoteSize < 28 ? 1.5 : 1.2;

    // Créer un conteneur invisible avec dimensions optimales (portrait 1080x1920)
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      left: -9999px;
      top: -9999px;
      width: 1080px;
      height: 1920px;
      background: linear-gradient(180deg, #ffffff 0%, #fbf7ff 100%);
      padding: 64px;
      color: #111827;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
    `;

    // Structure : header / content (flex:1) / footer
    let html = `
      <div style="display:flex; align-items:center; justify-content:center; gap:20px;">
        <img src="/logo-3v.png" alt="Logo 3V" style="height:60px; flex-shrink:0;">
        ${data.number ? `<div style="font-size: ${Math.round(titleSize * 0.6)}px; font-weight:700; color:#7c3aed;">${String(data.number).padStart(2,'0')}</div>` : ''}
      </div>

      <div style="flex:1; display:flex; flex-direction:column; justify-content:center; align-items:stretch; gap:20px;">
        <div style="text-align:center;">
          <h1 style="font-size: ${titleSize}px; font-weight:800; margin:0; color:#4c1d95; line-height:1;">${data.title}</h1>
        </div>

        ${data.reading ? `<p style="font-size:${readingSize}px; color:#8b5cf6; margin:8px 0 0 0; text-align:center; font-weight:600;">${data.reading}</p>` : ''}

        ${data.subtitle ? `<p style="font-size:${subtitleSize}px; color:#7c3aed; margin:8px 0 0 0; text-align:center; font-style:italic;">${data.subtitle}</p>` : ''}

        ${data.text ? `
          <div style="background:#f3e8ff; padding:32px; margin:20px auto 0 auto; border-left:8px solid #7c3aed; border-radius:8px; max-width:920px;">
            <p style="font-size:${quoteSize}px; line-height:${quoteLineHeight}; color:#2c1b75; font-style:italic; margin:0; text-align:center; word-break:break-word;">
              ${data.text}
            </p>
          </div>
        ` : ''}

        ${data.meditation ? `
          <div style="margin-top:20px; max-width:920px;">
            <h3 style="font-size:20px; font-weight:700; color:#5b21b6; margin:0 0 8px 0;">💭 Méditation</h3>
            <p style="font-size:18px; line-height:1.5; color:#3b0f6f; margin:0;">${data.meditation}</p>
          </div>
        ` : ''}

        ${data.prayer ? `
          <div style="margin-top:12px; max-width:920px;">
            <h3 style="font-size:20px; font-weight:700; color:#5b21b6; margin:0 0 8px 0;">🙏 Prière</h3>
            <p style="font-size:18px; line-height:1.5; color:#4b0fa0; margin:0;">${data.prayer}</p>
          </div>
        ` : ''}

      </div>

      <div style="margin-top:24px; padding-top:20px; border-top:2px solid #e9ddff; display:flex; align-items:center; justify-content:center; gap:16px; flex-wrap:nowrap;">
        <img src="/logo-3v.png" alt="Logo 3V" style="height:28px; flex-shrink:0;">
        <span style="font-weight:700; color:#4c1d95; font-size:16px; flex-shrink:0;">VOIE, VÉRITÉ, VIE</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#ff0000" style="flex-shrink:0;">
          <path d="M19.615 3.175c-3.673-3.059-9.158-3.059-12.831 0-3.673 3.059-3.673 8.017 0 11.076 1.836 1.529 4.261 2.529 6.916 2.529 2.655 0 5.08-1 6.916-2.529 3.672-3.059 3.672-8.017-.001-11.076zm-2.39 14.868c-1.225.703-2.665 1.109-4.202 1.109-1.537 0-2.977-.406-4.202-1.109-2.44-1.403-4.085-3.84-4.085-6.701 0-4.368 3.529-7.906 7.887-7.906 4.358 0 7.887 3.538 7.887 7.906 0 2.861-1.645 5.298-4.285 6.701z"/>
        </svg>
        <a href="https://voie-verite-vie.netlify.app" style="color:#6b7280; font-size:14px; text-decoration:none; white-space:nowrap;">voie-verite-vie.netlify.app</a>
      </div>
    `;

    container.innerHTML = html;
    document.body.appendChild(container);

    // shrink-to-fit helper pour garantir des textes grands mais non débordants
    const fitText = (el: HTMLElement, { maxSize = 96, minSize = 12, maxHeight = Infinity } = {}) => {
      try {
        const getSize = (n: HTMLElement) => parseFloat(window.getComputedStyle(n).fontSize || '16');
        let size = Math.min(getSize(el), maxSize);
        const step = Math.max(1, Math.floor(size * 0.06));
        while (size > minSize) {
          el.style.fontSize = `${size}px`;
          if (el.scrollHeight <= maxHeight) break;
          size -= step;
        }
      } catch (e) {
        /* ignore */
      }
    };

    // Ajuster le titre et le texte principal générés par le template
    const titleEl = container.querySelector('h1') as HTMLElement | null;
    const quoteEl = container.querySelector('div > p') as HTMLElement | null;
    if (titleEl) fitText(titleEl, { maxSize: 96, minSize: 24, maxHeight: 420 });
    if (quoteEl) fitText(quoteEl, { maxSize: 56, minSize: 16, maxHeight: 820 });

    // Générer l'image avec une résolution élevée
    const canvas = await html2canvas(container, {
      backgroundColor: '#ffffff',
      scale: 3,
      useCORS: true,
      allowTaint: true,
      logging: false,
      width: 1080,
      height: 1920,
      windowHeight: 1920,
      textStrokeWidth: 0,
    });

    document.body.removeChild(container);

    // Convertir en blob
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/png', 1.0);
    });
  } catch (error) {
    console.error('Erreur lors de la génération de l\'image:', error);
    return null;
  }
};

/**
 * Partage l'image via Web Share API ou copie dans le presse-papiers
 */
export const shareImage = async (blob: Blob, title: string): Promise<boolean> => {
  try {
    const file = new File([blob], `${title.replace(/\s+/g, '-')}.png`, {
      type: 'image/png',
    });

    // Vérifier si Web Share API est disponible (principalement sur mobile)
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: title,
          text: '✝️ Voie, Vérité, Vie',
        });
        return true;
      } catch (shareError) {
        if ((shareError as Error).name !== 'AbortError') {
          console.error('Erreur partage:', shareError);
        }
        return false;
      }
    } else {
      // Fallback desktop: copier dans le presse-papiers
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        alert('✅ Image copiée! Collez-la directement sur WhatsApp, Instagram, Telegram, etc.');
        return true;
      } catch (clipboardError) {
        console.error('Erreur copie:', clipboardError);
        alert('❌ Impossible de copier. Veuillez réessayer.');
        return false;
      }
    }
  } catch (error) {
    console.error('Erreur lors du partage:', error);
    alert('Erreur: impossible de générer l\'image');
    return false;
  }
};
