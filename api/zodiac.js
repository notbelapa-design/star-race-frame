const { URL } = require('url');

// CT‑flavoured captions for each zodiac sign
const SIGN_MESSAGES = {
  aries: "Aries apes into every new mint like they're slaying a boss, then asks 'When Lambo?' 30 minutes later.",
  taurus: 'Taurus hodlers treat bear markets like a buffet—accumulation season never ends for these stubborn bulls.',
  gemini: 'Gemini holders represent duality of holding forever and buying more.',
  cancer: 'Cancer stashes their bags like a crab; sideways markets are their natural habitat and they love it.',
  leo: 'Leo calls their bag the king of NFTs and expects everyone else to bow to their floor price.',
  virgo: 'Virgo hodlers annotate their wallet activity with spreadsheets; analysis paralysis but make it crypto.',
  libra: "Libra can't decide between staking and farming, so they do both and call it a balanced portfolio.",
  scorpio: 'Scorpio investors buy your bags in silence and sell in revenge; trust them at your own risk.',
  sagittarius: 'Sagittarius sets off on every airdrop quest like a cosmic crusade—no risk too far, no wallet too degen.',
  capricorn: 'Capricorns treat yield farming like a 9‑to‑5 job—always grinding, even when the market’s asleep.',
  aquarius: 'Aquarius invents new chains in their mind and shills them before the whitepaper even exists.',
  pisces: 'Pisces believe in cosmic charts and RSI alignment; if Mercury’s in retrograde, they blame the red candles.'
};

// Divide the 12 signs into four pages of three buttons each
const SIGN_PAGES = [
  ['aries', 'taurus', 'gemini'],
  ['cancer', 'leo', 'virgo'],
  ['libra', 'scorpio', 'sagittarius'],
  ['capricorn', 'aquarius', 'pisces']
];

// Capitalise the first letter
function capitalise(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Build the frame HTML with meta tags and buttons
function buildFrame(title, description, buttons) {
  const imageUrl = 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=600&q=80'; // publicly accessible starfield
  let meta = '';
  meta += `<meta property="og:title" content="${title}" />\n`;
  meta += `<meta property="og:description" content="${description}" />\n`;
  meta += `<meta property="og:image" content="${imageUrl}" />\n`;
  meta += `<meta name="fc:frame" content="vNext" />\n`;
  meta += `<meta name="fc:frame:image" content="${imageUrl}" />\n`;
  buttons.forEach((btn, idx) => {
    const n = idx + 1;
    meta += `<meta name="fc:frame:button:${n}" content="${btn.label}" />\n`;
    meta += `<meta name="fc:frame:button:${n}:action" content="${btn.action}" />\n`;
    if (btn.target) meta += `<meta name="fc:frame:button:${n}:target" content="${btn.target}" />\n`;
  });
  return `<!DOCTYPE html><html><head><meta charset="utf-8" />${meta}</head><body></body></html>`;
}

// Main handler
module.exports = async (req, res) => {
  try {
    // Use a template literal for the base URL so host is interpolated
    const urlObj = new URL(req.url, `http://${req.headers.host}`);
    const sign = urlObj.searchParams.get('sign');
    const pageParam = parseInt(urlObj.searchParams.get('page'), 10) || 1;
    const pageIndex = Math.min(Math.max(pageParam, 1), SIGN_PAGES.length) - 1;

    // If a sign is selected, return its description and collect link
    if (sign && SIGN_MESSAGES[sign]) {
      const name = capitalise(sign);
      const message = SIGN_MESSAGES[sign];
      const buttons = [
        { label: 'Pick Another', action: 'post', target: '/api/zodiac?page=1' },
        { label: `Collect ${name}`, action: 'link', target: `https://zora.co/coin/base:${sign}` }
      ];
      const title = `${name} Cosmic Vibe`;
      const description = message;
      const html = buildFrame(title, description, buttons);
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).end(html);
    }

    // Otherwise, show a page of signs (max 3 per page)
    const group = SIGN_PAGES[pageIndex];
    const buttons = group.map((s) => ({ label: capitalise(s), action: 'post', target: `/api/zodiac?sign=${s}` }));
    if (pageIndex < SIGN_PAGES.length - 1) {
      buttons.push({ label: 'Next', action: 'post', target: `/api/zodiac?page=${pageIndex + 2}` });
    } else {
      buttons.push({ label: 'Start Over', action: 'post', target: '/api/zodiac?page=1' });
    }
    const title = 'Pick your zodiac sign';
    const description = 'Select a sign to see its CT‑style fortune.';
    const html = buildFrame(title, description, buttons);
    res.setHeader('Content-Type', 'text/html');
    res.status(200).end(html);
  } catch (err) {
    console.error(err);
    // Return 500 to Farcaster; the client will show "Unknown error"
    res.status(500).send('Internal error');
  }
};
