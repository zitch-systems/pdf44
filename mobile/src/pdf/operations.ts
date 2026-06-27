/**
 * Bridges the pure pdf-lib engine to on-device file I/O (react-native-fs) and
 * the system pickers. Real operations are implemented where a pure-JS engine
 * suffices; the rest return a structured "stubbed" result so the UI stays
 * honest about what actually ran. All file output stays on the device.
 */
import RNFS from 'react-native-fs';
import {launchImageLibrary, launchCamera} from 'react-native-image-picker';
import DocumentPicker, {types as DocTypes} from 'react-native-document-picker';
import {base64ToUint8, uint8ToBase64} from './bytes';
import * as engine from './engine';
import {REAL_TOOLS, isReal} from './registry';

export {REAL_TOOLS, isReal};

export interface OpResult {
  name: string;
  uri: string;
  pages: number;
  real: boolean;
  message: string;
}

const OUT_DIR = RNFS.DocumentDirectoryPath + '/pdf44';

async function ensureDir() {
  const exists = await RNFS.exists(OUT_DIR);
  if (!exists) await RNFS.mkdir(OUT_DIR);
}

export async function writePdf(bytes: Uint8Array, name: string): Promise<string> {
  await ensureDir();
  const safe = name.replace(/[^\w.\-]+/g, '_');
  const path = `${OUT_DIR}/${Date.now()}_${safe}`;
  await RNFS.writeFile(path, uint8ToBase64(bytes), 'base64');
  return 'file://' + path;
}

async function readUriBytes(uri: string): Promise<Uint8Array> {
  const path = uri.replace(/^file:\/\//, '');
  const b64 = await RNFS.readFile(path, 'base64');
  return base64ToUint8(b64);
}

/** Pick one or more images from the gallery. */
export async function pickImages(): Promise<engine.ImageInput[]> {
  const res = await launchImageLibrary({mediaType: 'photo', selectionLimit: 0, includeBase64: true});
  if (res.didCancel || !res.assets) return [];
  return res.assets
    .filter(a => a.base64)
    .map(a => ({
      bytes: base64ToUint8(a.base64 as string),
      type: (a.type || '').includes('png') ? ('png' as const) : ('jpg' as const),
    }));
}

/** Capture a photo with the camera (used by Scan and Image→PDF). */
export async function captureImage(): Promise<engine.ImageInput | null> {
  const res = await launchCamera({mediaType: 'photo', includeBase64: true, saveToPhotos: false});
  if (res.didCancel || !res.assets || !res.assets[0]?.base64) return null;
  const a = res.assets[0];
  return {bytes: base64ToUint8(a.base64 as string), type: (a.type || '').includes('png') ? 'png' : 'jpg'};
}

/** Pick one or more PDFs. */
export async function pickPdfs(): Promise<{uri: string; name: string}[]> {
  const res = await DocumentPicker.pick({type: [DocTypes.pdf], allowMultiSelection: true});
  return res.map(r => ({uri: r.uri, name: r.name || 'document.pdf'}));
}

/**
 * Execute a generic tool flow. Returns a produced on-device file for real ops,
 * or a structured stub result (with a clear message) for ops that need a heavier
 * native engine than ships in this build.
 */
export async function runTool(toolId: string, title: string): Promise<OpResult> {
  if (toolId === 'jpg2pdf') {
    const imgs = await pickImages();
    if (!imgs.length) throw new Error('cancelled');
    const bytes = await engine.imagesToPdf(imgs);
    const uri = await writePdf(bytes, 'images.pdf');
    return {name: 'images.pdf', uri, pages: imgs.length, real: true, message: `Built a ${imgs.length}-page PDF from your images`};
  }

  if (toolId === 'merge') {
    const picks = await pickPdfs();
    if (picks.length < 2) throw new Error('Pick at least two PDFs to merge');
    const buffers = await Promise.all(picks.map(p => readUriBytes(p.uri)));
    const bytes = await engine.mergePdfs(buffers);
    const pages = await engine.pageCount(bytes);
    const uri = await writePdf(bytes, 'merged.pdf');
    return {name: 'merged.pdf', uri, pages, real: true, message: `Merged ${picks.length} files into ${pages} pages`};
  }

  // Single-input pdf-lib transforms
  if (['split', 'extract', 'rotate', 'compress', 'pagenumber', 'watermark', 'flatten'].includes(toolId)) {
    const picks = await pickPdfs();
    if (!picks.length) throw new Error('cancelled');
    const src = await readUriBytes(picks[0].uri);
    let bytes: Uint8Array;
    let label = picks[0].name.replace(/\.pdf$/i, '');
    const total = await engine.pageCount(src);
    // Honest per-tool message (empty = use the generic "Done — N pages").
    let note = '';
    switch (toolId) {
      case 'split':
      case 'extract': {
        // No page-selection UI yet, so this keeps the first half. Say so plainly
        // instead of silently discarding the rest behind a "Done" toast.
        const half = Math.max(1, Math.ceil(total / 2));
        const idx = Array.from({length: half}, (_, i) => i);
        bytes = await engine.extractPages(src, idx);
        label += '-pages-1-' + half;
        note = `Kept pages 1–${half} of ${total} (page picking isn't available yet)`;
        break;
      }
      case 'rotate':
        bytes = await engine.rotatePdf(src, 90);
        label += '-rotated';
        break;
      case 'compress':
        bytes = await engine.resavePdf(src);
        label += '-compressed';
        note = 'Re-saved (structure only — images are not recompressed, so size may be similar)';
        break;
      case 'pagenumber':
        bytes = await engine.addPageNumbers(src, 'bottom-center');
        label += '-numbered';
        break;
      case 'watermark':
        bytes = await engine.addWatermark(src, 'PDF44');
        label += '-watermarked';
        break;
      case 'flatten':
        bytes = await engine.resavePdf(src);
        label += '-flattened';
        note = 'Re-saved (note: interactive annotations are not truly flattened yet)';
        break;
      default:
        bytes = src;
    }
    const pages = await engine.pageCount(bytes);
    const uri = await writePdf(bytes, label + '.pdf');
    return {name: label + '.pdf', uri, pages, real: true, message: note || `Done — ${pages} page${pages === 1 ? '' : 's'}`};
  }

  // Stubbed: needs a heavier engine (rasteriser / OCR / docx writer) than this
  // build ships. We simulate the work and report honestly.
  await new Promise(r => setTimeout(r, 700));
  return {
    name: title.replace(/\s+/g, '-').toLowerCase() + '.pdf',
    uri: '',
    pages: 0,
    real: false,
    message: `${title} ran in preview mode — output engine not bundled in this build`,
  };
}

export const engineApi = engine;
