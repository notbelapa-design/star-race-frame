/*
 * FrameForms: generative ASCII-like terrain art for Farcaster frames.
 *
 * Each visit generates a pseudo-random 10x10 grid of height values using a seeded PRNG.
 * Heights map to characters and colours reminiscent of on-chain art like Terraforms.
 * A "Next Terrain" button refreshes the seed and produces a new variation.
 *
 * Usage: Deploy this file as a serverless function at /api/frameforms.
 * The first render uses a random seed. Subsequent clicks include ?seed=<seed>.
 * Set BASE_URL via environment or edit below.
 */

const GRID_SIZE = 10;
const BASE_URL = process.env.BASE_URL || 'https://star-race-frame.vercel.app';

// Map height ranges to characters and colours
const SYMBOLS = [
  { max: 0.2, char: '.', color: '#95a5a6' },       // lowlands
  { max: 0.4, char: '~', color: '#5dade2' },       // water
  { max: 0.6, char: '^', color: '#58d68d' },       // hills
  { max: 0.8, char: '#', color: '#f4d03f' },       // mountains
  { max: 1.0, char: '@', color: '#e74c3c' }        // peaks
];

// Simple seeded PRNG (mulberry32)
function mulberry32(a) {
  return function() {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stringToSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function generateGrid(seedStr) {
  const seed = stringToSeed(seedStr);
  const rand = mulberry32(seed);
  const grid = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const row = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      const h = rand();
      row.push(h);
    }
    grid.push(row);
  }
  return grid;
}

function heightToSymbol(h) {
  for (const sym of SYMBOLS) {
    if (h <= sym.max) return sym;
  }
  return SYMBOLS[SYMBOLS.length - 1];
}

function generateSVG(grid) {
  const cellSize = 20;
  const width = GRID_SIZE * cellSize;
  const height = GRID_SIZE * cellSize;
  let rects = '';
  let texts = '';
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const sym = heightToSymbol(grid[y][x]);
      const cx = x * cellSize;
      const cy = y * cellSize;
      rects += `<rect x="${cx}" y="${cy}" width="${cellSize}" height="${cellSize}" fill="${sym.color}" />`;
      texts += `<text x="${cx + cellSize / 2}" y="${cy + cellSize * 0.7}" font-family="monospace" font-size="14" fill="#1c2833" text-anchor="middle">${sym.char}</text>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${rects}${texts}</svg>`;
}

function randomSeed() {
  return Math.random().toString(36).substring(2, 10);
}

module.exports = async (req, res) => {
  try {
    const queryString = req.url.split('?')[1] || '';
    const params = new URLSearchParams(queryString);
    let seed = params.get('seed');
    if (!seed) {
      seed = randomSeed();
    }
    const grid = generateGrid(seed);
    const svg = generateSVG(grid);
    const imageData = Buffer.from(svg).toString('base64');
    const nextSeed = randomSeed();

    const title = 'FrameForms Terrain';
    const description = `Seed: ${seed}`;
    let meta = '';
    meta += `<meta property="og:title" content="${title}" />\n`;
    meta += `<meta property="og:description" content="${description}" />\n`;
    meta += `<meta property="og:image" content="data:image/svg+xml;base64,${imageData}" />\n`;
    meta += `<meta name="fc:frame" content="vNext" />\n`;
    meta += `<meta name="fc:frame:image" content="data:image/svg+xml;base64,${imageData}" />\n`;
    // button: Next Terrain
    meta += `<meta name="fc:frame:button:1" content="Next Terrain" />\n`;
    meta += `<meta name="fc:frame:button:1:action" content="post" />\n`;
    meta += `<meta name="fc:frame:button:1:target" content="${BASE_URL}/api/frameforms?seed=${nextSeed}" />\n`;
    // button 2: Reset
    meta += `<meta name="fc:frame:button:2" content="Reset" />\n`;
    meta += `<meta name="fc:frame:button:2:action" content="post" />\n`;
    meta += `<meta name="fc:frame:button:2:target" content="${BASE_URL}/api/frameforms" />\n`;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8" />${meta}</head><body></body></html>`;
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).end(html);
  } catch (err) {
    console.error(err);
    return res.status(500).send('Internal error');
  }
};
