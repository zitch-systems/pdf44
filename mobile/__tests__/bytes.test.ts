import {base64ToUint8, uint8ToBase64} from '../src/pdf/bytes';

describe('base64 codec', () => {
  const cases: number[][] = [
    [],
    [0],
    [255],
    [0, 1, 2],
    [72, 101, 108, 108, 111], // "Hello"
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    Array.from({length: 256}, (_, i) => i),
  ];

  test('round-trips arbitrary byte arrays', () => {
    for (const c of cases) {
      const bytes = Uint8Array.from(c);
      const b64 = uint8ToBase64(bytes);
      const back = base64ToUint8(b64);
      expect(Array.from(back)).toEqual(c);
    }
  });

  test('matches Node Buffer base64 output', () => {
    const bytes = Uint8Array.from([255, 254, 253, 0, 1, 2, 100]);
    const expected = Buffer.from(bytes).toString('base64');
    expect(uint8ToBase64(bytes)).toBe(expected);
  });

  test('decodes a known string', () => {
    const decoded = base64ToUint8('SGVsbG8=');
    expect(Buffer.from(decoded).toString('utf8')).toBe('Hello');
  });
});
