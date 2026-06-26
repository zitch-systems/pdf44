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
