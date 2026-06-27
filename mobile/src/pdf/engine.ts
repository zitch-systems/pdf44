/**
 * Real on-device PDF operations built on pdf-lib (pure JS, no native engine).
 * Every function takes/returns bytes so it is unit-testable under Node and runs
 * unchanged under Hermes. Nothing here touches the filesystem or network — that
 * wiring lives in operations.ts.
 */
import {PDFDocument, StandardFonts, rgb, degrees} from 'pdf-lib';

export interface ImageInput {
  bytes: Uint8Array;
  type: 'jpg' | 'png';
}

/** Combine one or more images into a single PDF, one image per page. */
export async function imagesToPdf(images: ImageInput[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (const img of images) {
    const embedded = img.type === 'png' ? await doc.embedPng(img.bytes) : await doc.embedJpg(img.bytes);
    const {width, height} = embedded.scale(1);
    const page = doc.addPage([width, height]);
    page.drawImage(embedded, {x: 0, y: 0, width, height});
  }
  if (doc.getPageCount() === 0) doc.addPage();
  return doc.save();
}

/** Merge multiple PDFs in order into one. */
export async function mergePdfs(pdfs: Uint8Array[]): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  for (const bytes of pdfs) {
    const src = await PDFDocument.load(bytes, {ignoreEncryption: true});
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach(p => out.addPage(p));
  }
  if (out.getPageCount() === 0) out.addPage();
  return out.save();
}

/** Rotate every page (or a subset) by a multiple of 90°. */
export async function rotatePdf(bytes: Uint8Array, deg: number, pageIndices?: number[]): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, {ignoreEncryption: true});
  const pages = doc.getPages();
  const target = pageIndices ?? pages.map((_, i) => i);
  target.forEach(i => {
    const page = pages[i];
    if (!page) return;
    const cur = page.getRotation().angle;
    page.setRotation(degrees((cur + deg) % 360));
  });
  return doc.save();
}

/** Keep only the given page indices (0-based), in the given order. */
export async function extractPages(bytes: Uint8Array, indices: number[]): Promise<Uint8Array> {
  const src = await PDFDocument.load(bytes, {ignoreEncryption: true});
  const out = await PDFDocument.create();
  const valid = indices.filter(i => i >= 0 && i < src.getPageCount());
  const copied = await out.copyPages(src, valid);
  copied.forEach(p => out.addPage(p));
  if (out.getPageCount() === 0) out.addPage();
  return out.save();
}

/** Reorder/remove pages by supplying the new ordering of original indices. */
export async function reorderPages(bytes: Uint8Array, order: number[]): Promise<Uint8Array> {
  return extractPages(bytes, order);
}

/** A single output slot for the page organiser: copy source page `src` (0-based)
 * with an extra `rotation` (degrees) applied, or insert a blank page when `src`
 * is null. */
export interface OrganizeOp {
  src: number | null;
  rotation: number;
}

/** Rebuild a PDF from an explicit list of slots — covers reorder, delete (omit a
 * page), duplicate (repeat a src), per-page rotation and blank-page insertion in
 * one pass. copyPages is called per slot so duplicated pages are independent. */
export async function organizePdf(bytes: Uint8Array, ops: OrganizeOp[]): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(bytes, {ignoreEncryption: true});
  const total = srcDoc.getPageCount();
  const out = await PDFDocument.create();
  for (const op of ops) {
    if (op.src == null || op.src < 0 || op.src >= total) {
      const size = total > 0 ? srcDoc.getPage(0).getSize() : {width: 595, height: 842};
      out.addPage([size.width, size.height]);
      continue;
    }
    const [copied] = await out.copyPages(srcDoc, [op.src]);
    if (op.rotation) {
      const cur = copied.getRotation().angle;
      copied.setRotation(degrees((cur + op.rotation) % 360));
    }
    out.addPage(copied);
  }
  if (out.getPageCount() === 0) out.addPage();
  return out.save();
}

function hexToRgb(hex: string): {r: number; g: number; b: number} {
  const h = (hex || '#000000').replace('#', '');
  const v = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(v || '000000', 16);
  return {r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255};
}

export interface SignInput {
  kind: 'Draw' | 'Type' | 'Image';
  drawn?: string;                 // SVG path captured from the on-screen pad
  drawnDims?: {w: number; h: number};
  typed?: string;
  image?: ImageInput;
  color?: string;                 // ink hex
  page?: 'last' | 'first' | 'all';
}

/** Stamp a real signature onto the PDF — typed text (drawText), the drawn ink
 * path (drawSvgPath), or an uploaded image (embed + drawImage). Placed at the
 * bottom-right of the chosen page(s); origin bottom-left so the maths is in PDF
 * points. This is a genuine, on-device signed PDF, not a UI mock. */
export async function signPdf(bytes: Uint8Array, sig: SignInput): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, {ignoreEncryption: true});
  const pages = doc.getPages();
  if (!pages.length) return doc.save();
  const targets =
    sig.page === 'first' ? [pages[0]] : sig.page === 'all' ? pages : [pages[pages.length - 1]];

  const ink = hexToRgb(sig.color || '#0f1729');
  const color = rgb(ink.r, ink.g, ink.b);
  const margin = 36;
  const boxW = 170;

  const img =
    sig.kind === 'Image' && sig.image
      ? sig.image.type === 'png'
        ? await doc.embedPng(sig.image.bytes)
        : await doc.embedJpg(sig.image.bytes)
      : null;
  const font = sig.kind === 'Type' ? await doc.embedFont(StandardFonts.HelveticaOblique) : null;

  for (const page of targets) {
    if (!page) continue;
    const {width} = page.getSize();
    const x = Math.max(margin, width - boxW - margin);
    const y = margin;
    if (sig.kind === 'Type' && font) {
      page.drawText(sig.typed || 'Signature', {x, y: y + 6, size: 24, font, color});
    } else if (sig.kind === 'Image' && img) {
      const ih = boxW * (img.height / img.width);
      page.drawImage(img, {x, y, width: boxW, height: ih});
    } else if (sig.kind === 'Draw' && sig.drawn) {
      const dims = sig.drawnDims && sig.drawnDims.w > 0 ? sig.drawnDims : {w: 300, h: 150};
      const scale = boxW / dims.w;
      // drawSvgPath maps SVG (0,0) → (x,y) and flips y, so the path renders
      // upright extending downward; anchor the TOP so the bottom sits at margin.
      page.drawSvgPath(sig.drawn, {x, y: y + dims.h * scale, scale, borderColor: color, borderWidth: 2});
    }
  }
  return doc.save();
}

export type Corner = 'bottom-center' | 'bottom-right' | 'top-right' | 'top-center';

/** Stamp page numbers onto every page. */
export async function addPageNumbers(bytes: Uint8Array, corner: Corner = 'bottom-center'): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, {ignoreEncryption: true});
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  pages.forEach((page, i) => {
    const {width, height} = page.getSize();
    const label = `${i + 1} / ${pages.length}`;
    const size = 10;
    const tw = font.widthOfTextAtSize(label, size);
    let x = width / 2 - tw / 2;
    let y = 18;
    if (corner === 'bottom-right') {
      x = width - tw - 24;
    } else if (corner === 'top-right') {
      x = width - tw - 24;
      y = height - 24;
    } else if (corner === 'top-center') {
      y = height - 24;
    }
    page.drawText(label, {x, y, size, font, color: rgb(0.4, 0.4, 0.45)});
  });
  return doc.save();
}

/** Tile a translucent diagonal watermark across every page. */
export async function addWatermark(bytes: Uint8Array, text: string): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, {ignoreEncryption: true});
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const pages = doc.getPages();
  const label = text || 'PDF44';
  pages.forEach(page => {
    const {width, height} = page.getSize();
    const size = Math.max(28, Math.min(width, height) / 8);
    const tw = font.widthOfTextAtSize(label, size);
    page.drawText(label, {
      x: width / 2 - tw / 2,
      y: height / 2,
      size,
      font,
      color: rgb(0.6, 0.6, 0.65),
      opacity: 0.18,
      rotate: degrees(35),
    });
  });
  return doc.save();
}

/** Re-save (light "compress"): strips nothing heavy but normalises the object
 * stream and object structure, often shaving size on bloated PDFs. */
export async function resavePdf(bytes: Uint8Array): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, {ignoreEncryption: true});
  return doc.save({useObjectStreams: true});
}

/** Create a simple text PDF (used by "new document" / text-to-pdf demos). */
export async function textToPdf(title: string, body: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([595, 842]); // A4 points
  const margin = 56;
  let y = 842 - margin;
  page.drawText(title || 'Untitled', {x: margin, y, size: 22, font: bold, color: rgb(0.06, 0.09, 0.16)});
  y -= 34;
  const lines = wrap(body || '', 84);
  for (const line of lines) {
    if (y < margin) break;
    page.drawText(line, {x: margin, y, size: 12, font, color: rgb(0.28, 0.33, 0.4)});
    y -= 18;
  }
  return doc.save();
}

function wrap(text: string, max: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = (cur + ' ' + w).trim();
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Read page count of a PDF (used to label imported files). */
export async function pageCount(bytes: Uint8Array): Promise<number> {
  const doc = await PDFDocument.load(bytes, {ignoreEncryption: true});
  return doc.getPageCount();
}
