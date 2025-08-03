const http = require('http');
const https = require('https');

/*
 * Star Race Dynamic Frame Server
 *
 * This server implements a Farcaster frame that shows a real‑time leaderboard
 * for Starfolio’s zodiac coins.  It queries the DEX Screener API for each
 * specified pair address and computes the current market cap rankings on
 * demand.  Because only the overall Starfolio token appears on DEX Screener
 * today, you will need to populate the `signPairs` object with the correct
 * pair addresses once they become available.  If a sign is missing or the
 * API call fails, that sign’s market cap will default to zero in the
 * leaderboard.
 *
 * Usage:
 *   node star_race_dynamic_frame_server.js
 *
 * Then expose the server via a tunnelling service (e.g. `ngrok http 3000`)
 * and share the public HTTPS URL in a Farcaster cast.  Clicking
 * “Refresh Rankings” will trigger the server to fetch the latest numbers.
 */

/*
 * Mapping of zodiac signs to their DEX Screener pair addresses.
 *
 * To avoid editing this file each time a new pair address becomes known, you can
 * provide a JSON string via the `SIGN_PAIRS` environment variable.  The
 * expected format is an object whose keys are lowercase zodiac signs and values
 * are pair addresses, for example:
 *   SIGN_PAIRS='{"aries":"0x...","taurus":"0x..."}'
 *
 * At runtime, the server merges this object with the defaults below.  Any
 * missing entries will fall back to the empty string, and the overall
 * starfolio pair is included as a working example.
 */
const defaultSignPairs = {
  aries: '',
  taurus: '',
  gemini: '',
  cancer: '',
  leo: '',
  virgo: '',
  libra: '',
  scorpio: '',
  sagittarius: '',
  capricorn: '',
  aquarius: '',
  pisces: '',
  // Overall Starfolio token (used as a fallback example)
  starfolio: '0x4b1b272ff22ea03dbb6d5f0f8c3820b4e70eab76f2937c91c3ac0d6aebed9056',
};

let signPairs = { ...defaultSignPairs };
if (process.env.SIGN_PAIRS) {
  try {
    const override = JSON.parse(process.env.SIGN_PAIRS);
    signPairs = { ...signPairs, ...override };
  } catch (err) {
    console.error('Failed to parse SIGN_PAIRS environment variable:', err);
  }
}

/**
 * Fetch market cap data from DEX Screener for the given pair address.
 * Returns a promise resolving to a numeric market cap in USD, or 0 on error.
 *
 * @param {string} pairAddress The DEX Screener pair address
 * @returns {Promise<number>}
 */
function fetchMarketCap(pairAddress) {
  return new Promise((resolve) => {
    if (!pairAddress) {
      resolve(0);
      return;
    }
    const url = `https://api.dexscreener.com/latest/dex/pairs/base/${pairAddress}`;
    https
      .get(url, (resp) => {
        let data = '';
        resp.on('data', (chunk) => {
          data += chunk;
        });
        resp.on('end', () => {
          try {
            const json = JSON.parse(data);
            const pair = json?.pair;
            const marketCap = pair?.marketCap;
            if (typeof marketCap === 'number') {
              resolve(marketCap);
            } else {
              resolve(0);
            }
          } catch (err) {
            console.error('Failed to parse DEX Screener response:', err);
            resolve(0);
          }
        });
      })
      .on('error', (err) => {
        console.error('Error fetching from DEX Screener:', err);
        resolve(0);
      });
  });
}

/**
 * Fetch market caps for all signs asynchronously.
 * @returns {Promise<Record<string, number>>}
 */
async function fetchAllMarketCaps() {
  const entries = Object.entries(signPairs);
  const results = await Promise.all(
    entries.map(([sign, pair]) =>
      fetchMarketCap(pair).then((cap) => [sign, cap])
    ),
  );
  return Object.fromEntries(results);
}

/**
 * Generate the HTML for a Farcaster frame based on current stats.
 * @param {Record<string, number>} caps
 * @returns {string}
 */
function generateFrameHTML(caps) {
  // Sort signs by market cap descending
  const sorted = Object.entries(caps)
    .filter(([sign]) => sign !== 'starfolio')
    .sort((a, b) => b[1] - a[1]);
  const [leaderSign, leaderCap] = sorted[0] || ['N/A', 0];

  // Build the ranking list as text lines
  const rankings = sorted
    .map(([sign, cap], idx) => `${idx + 1}. ${capitalize(sign)} – $${cap.toLocaleString()}`)
    .join('\n');

  // Prepare the Open Graph title and description
  const title = `${capitalize(leaderSign)} is leading the Star Race!`;
  const description = `Market Cap: $${leaderCap.toLocaleString()}\nClick refresh for latest stats.`;

  // Link to collect the top sign – falls back to starfolio collection page.
  // You can define COLLECT_URL_PREFIX to generate per‑sign links.  For example,
  // set COLLECT_URL_PREFIX="https://zora.co/coin/" and ensure each coin name
  // matches your sign keys.  If undefined, the default Starfolio profile is
  // used.
  let collectUrl = process.env.COLLECT_URL_PREFIX || 'https://zora.co/@starfolio';
  if (process.env.COLLECT_URL_PREFIX && leaderSign && leaderSign !== 'N/A') {
    // Append the sign to the prefix for a per‑sign coin link
    collectUrl = `${process.env.COLLECT_URL_PREFIX}${leaderSign}`;
  }

  // Frame image can be overridden via environment variable
  const frameImage = process.env.FRAME_IMAGE_URL ||
    'https://cdn.jsdelivr.net/gh/farcaster/todo/image-placeholder.png';
  return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta property="og:title" content="${title}" />
      <meta property="og:description" content="${description}" />
      <meta name="fc:frame" content="vNext" />
      <meta name="fc:frame:image" content="${frameImage}" />
      <meta name="fc:frame:button:1" content="Refresh Rankings" />
      <meta name="fc:frame:button:1:action" content="post" />
      <meta name="fc:frame:button:2" content="Collect ${capitalize(leaderSign)}" />
      <meta name="fc:frame:button:2:action" content="link" />
      <meta name="fc:frame:button:2:target" content="${collectUrl}" />
    </head>
    <body style="font-family: sans-serif; margin: 0; padding: 1rem;">
      <pre style="white-space: pre-wrap; margin: 0;">${rankings}</pre>
    </body>
    </html>`;
}

/**
 * Capitalize the first letter of a string
 * @param {string} s
 * @returns {string}
 */
function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Simple HTTP server
const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    const caps = await fetchAllMarketCaps();
    const html = generateFrameHTML(caps);
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  } else if (req.method === 'POST' && req.url === '/refresh') {
    const caps = await fetchAllMarketCaps();
    const html = generateFrameHTML(caps);
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Star Race Dynamic Frame server running on port ${PORT}`);
});