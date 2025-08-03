const https = require('https');

// Default mapping of zodiac signs to DEX Screener pair addresses.
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
  starfolio: '0x4b1b272ff22ea03dbb6d5f0f8c3820b4e70eab76f2937c91c3ac0d6aebed9056',
};

// Allow overriding pairs via SIGN_PAIRS env variable (JSON string)
let signPairs = { ...defaultSignPairs };
if (process.env.SIGN_PAIRS) {
  try {
    const override = JSON.parse(process.env.SIGN_PAIRS);
    signPairs = { ...signPairs, ...override };
  } catch (err) {
    console.error('Failed to parse SIGN_PAIRS:', err);
  }
}

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
            const marketCap = json?.pair?.marketCap;
            resolve(typeof marketCap === 'number' ? marketCap : 0);
          } catch {
            resolve(0);
          }
        });
      })
      .on('error', () => resolve(0));
  });
}

async function fetchAllMarketCaps() {
  const entries = Object.entries(signPairs);
  const results = await Promise.all(
    entries.map(([sign, pair]) =>
      fetchMarketCap(pair).then((cap) => [sign, cap])
    ),
  );
  return Object.fromEntries(results);
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function generateFrameHTML(caps) {
  const sorted = Object.entries(caps)
    .filter(([sign]) => sign !== 'starfolio')
    .sort((a, b) => b[1] - a[1]);
  const [leaderSign, leaderCap] = sorted[0] || ['N/A', 0];
  const rankings = sorted
    .map(([sign, cap], idx) => `${idx + 1}. ${capitalize(sign)} – $${cap.toLocaleString()}`)
    .join('\n');

  const frameImage = process.env.FRAME_IMAGE_URL ||
    'https://cdn.jsdelivr.net/gh/farcaster/todo/image-placeholder.png';
  let collectUrl = process.env.COLLECT_URL_PREFIX || 'https://zora.co/@starfolio';
  if (process.env.COLLECT_URL_PREFIX && leaderSign && leaderSign !== 'N/A') {
    collectUrl = `${process.env.COLLECT_URL_PREFIX}${leaderSign}`;
  }
  const title = `${capitalize(leaderSign)} is leading the Star Race!`;
  const description = `Market Cap: $${leaderCap.toLocaleString()}\nClick refresh for latest stats.`;

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

module.exports = async (req, res) => {
  const caps = await fetchAllMarketCaps();
  const html = generateFrameHTML(caps);
  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
};
