/**
 * Lightweight Code-128 Barcode Generator (No external dependencies).
 * Encodes ASCII alphanumeric strings and numbers into scannable SVG barcodes.
 */

// Code 128 pattern dictionary for 107 symbols (Pattern lengths of bars & spaces, total width 11 modules each)
const CODE128_PATTERNS: string[] = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", // 0-9
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", // 10-19
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", // 20-29
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", // 30-39
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", // 40-49
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", // 50-59
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", // 60-69
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", // 70-79
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", // 80-89
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", // 90-99
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112" // 100-106 (106 is STOP pattern: 13 modules)
];

const START_CODE_B = 104;
const STOP_CODE = 106;

/**
 * Encodes text into Code 128B bar widths string
 */
export function encodeCode128B(text: string): string {
  if (!text) text = "00000000";
  // Filter ASCII values 32..126
  const clean = text.replace(/[^\x20-\x7E]/g, '');
  const codes: number[] = [START_CODE_B];

  for (let i = 0; i < clean.length; i++) {
    codes.push(clean.charCodeAt(i) - 32);
  }

  // Calculate Checksum
  let checksum = codes[0];
  for (let i = 1; i < codes.length; i++) {
    checksum += codes[i] * i;
  }
  codes.push(checksum % 103);
  codes.push(STOP_CODE);

  // Convert to pattern
  return codes.map(c => CODE128_PATTERNS[c] || CODE128_PATTERNS[0]).join('');
}

/**
 * Generate SVG Path or Elements for a barcode
 */
export function generateBarcodeSvg(value: string, options: { width?: number; height?: number; showText?: boolean } = {}) {
  const { height = 50, showText = true } = options;
  const pattern = encodeCode128B(value);
  
  const quietZone = 10;
  let currentX = quietZone;
  const rects: { x: number; width: number }[] = [];

  for (let i = 0; i < pattern.length; i++) {
    const width = parseInt(pattern[i], 10);
    const isBar = i % 2 === 0;
    if (isBar) {
      rects.push({ x: currentX, width });
    }
    currentX += width;
  }

  const totalWidth = currentX + quietZone;
  const barHeight = showText ? height - 16 : height;

  return {
    viewBox: `0 0 ${totalWidth} ${height}`,
    totalWidth,
    barHeight,
    rects,
    text: value,
    showText,
  };
}

/**
 * Generate standard EAN/UPC-like random barcode for test products
 */
export function generateRandomBarcode(prefix: string = '890'): string {
  const randomDigits = Math.floor(100000000 + Math.random() * 900000000).toString();
  return `${prefix}${randomDigits}`;
}
