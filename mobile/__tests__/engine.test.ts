import {textToPdf, mergePdfs, extractPages, rotatePdf, addPageNumbers, pageCount, imagesToPdf} from '../src/pdf/engine';
import {PDFDocument} from 'pdf-lib';

async function makePdf(pages: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage([300, 400]);
  return doc.save();
}

describe('pdf engine (real on-device ops)', () => {
  test('textToPdf produces a one-page valid PDF', async () => {
    const bytes = await textToPdf('Title', 'Some body text that wraps across the page nicely.');
    expect(bytes.length).toBeGreaterThan(100);
    expect(await pageCount(bytes)).toBe(1);
  });

  test('mergePdfs concatenates page counts', async () => {
    const a = await makePdf(2);
    const b = await makePdf(3);
    const merged = await mergePdfs([a, b]);
    expect(await pageCount(merged)).toBe(5);
  });

  test('extractPages keeps only requested pages, in order', async () => {
    const src = await makePdf(5);
    const out = await extractPages(src, [4, 0]);
    expect(await pageCount(out)).toBe(2);
  });

  test('extractPages ignores out-of-range indices', async () => {
    const src = await makePdf(2);
    const out = await extractPages(src, [0, 9, 5]);
    expect(await pageCount(out)).toBe(1);
  });

  test('rotatePdf preserves page count and applies rotation', async () => {
    const src = await makePdf(1);
    const out = await rotatePdf(src, 90);
    const doc = await PDFDocument.load(out);
    expect(doc.getPage(0).getRotation().angle).toBe(90);
  });

  test('addPageNumbers preserves page count', async () => {
    const src = await makePdf(3);
    const out = await addPageNumbers(src);
    expect(await pageCount(out)).toBe(3);
  });

  test('imagesToPdf creates one page per image', async () => {
    // 1x1 white JPEG
    const jpg = Uint8Array.from(
      Buffer.from(
        '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAAAv/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AvwAH/9k=',
        'base64',
      ),
    );
    const out = await imagesToPdf([{bytes: jpg, type: 'jpg'}, {bytes: jpg, type: 'jpg'}]);
    expect(await pageCount(out)).toBe(2);
  });
});
