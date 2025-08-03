/*
 * Interactive Zodiac Selector Frame for Farcaster
 *
 * This serverless function returns HTML tailored for Farcaster Frames.
 * On the first screens it shows a small set of signs plus a navigation button.
 * Selecting a sign reveals a humorous description and a button to collect the
 * sign's coin on Zora. The frame remains stateless by encoding the selected
 * sign or page number in the query string. Keeping the logic purely
 * server‑side avoids client‑side storage and makes it easy to extend.
 */

const { URL } = require('url');

// Crypto‑Twitter flavoured captions for each zodiac sign
const SIGN_MESSAGES = {
  aries: "Aries apes into every new mint like they're slaying a boss, then asks 'When Lambo?' 30 minutes later.",
  taurus: 'Taurus hodlers treat bear markets like a buffet—accumulation season never ends for these stubborn bulls.',
  gemini: 'Gemini holders represent duality of holding forever and buying more.',
  cancer: 'Cancer stashes their bags like a crab; sideways markets are their natural habitat and they love it.',
  leo: 'Leo calls their bag the king of NFTs and expects everyone else to bow to their floor price.',
  virgo: 'Virgo holders annotate their wallet activity with spreadsheets; analysis paralysis but make it crypto.',
  libra: 'Libra can’t decide between staking and farming, so they do both and call it a balanced portfolio.',
  scorpio: 'Scorpio investors buy your bags in silence and sell in revenge; trust them at your own risk.',
  sagittarius: 'Sagittarius sets off on every airdrop quest like a cosmic crusade—no risk too far, no wallet too degen.',
  capricorn: 'Capricorns treat yield farming like a 9‑to‑9 job—always grinding, even when the market’s asleep.',
  aquarius: 'Aquarius invents new chains in their mind and shills them before the whitepaper even exists.',
  pisces: 'Pisces believe in cosmic charts and RSI alignment; if Mercury’s in retrograde, they blame the red candles.'
};

// Organise signs into pages; each page holds at most three signs. The fourth
// button on each page is reserved for navigation (Next/Start Over).
const SIGN_PAGES = [
  ['aries', 'taurus', 'gemini'],
  ['cancer', 'leo', 'virgo'],
  ['libra', 'scorpio', 'sagittarius'],
  ['capricorn', 'aquarius', 'pisces']
];

/**
 * Capitalise the first letter of a word. Used for button labels.
 * @param {string} s
 * @returns {string}
 */
function capitalise(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Build the HTML for a Farcaster frame.
 * @param {string} title     Title shown in the embed card
 * @param {string} description Description under the title
 * @param {Array<{label:string,action:string,target?:string}>} buttons
 * @returns {string}
 */
function buildFrame(title, description, buttons) {
  let metaTags = '';
  metaTags += `<meta property="og:title" content="${title}" />\n`;
  metaTags += `<meta property="og:description" content="${description}" />\n`;
  // Declare this as a vNext frame
  metaTags += `<meta name="fc:frame" content="vNext" />\n`;
  // Loop over buttons and add meta tags. Only up to 4 buttons are allowed.
  buttons.forEach((btn, idx) => {
    const num = idx + 1;
    metaTags += `<meta name="fc:frame:button:${num}" content="${btn.label}" />\n`;
    metaTags += `<meta name="fc:frame:button:${num}:action" content="${btn.action}" />\n`;
    if (btn.target) {
      metaTags += `<meta name="fc:frame:button:${num}:target" content="${btn.target}" />\n`;
    }
  });
  return `<!DOCTYPE html><html><head><meta charset="utf-8" />${metaTags}</head><body></body></html>`;
}

module.exports = async (req, res) => {
  // Parse the request URL to extract query parameters
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const sign = urlObj.searchParams.get('sign');
  const pageParam = urlObj.searchParams.get('page');
  const pageIndex = pageParam ? Math.max(1, Math.min(SIGN_PAGES.length, parseInt(pageParam, 10))) : 1;

  // If a sign is selected, return its description with a collect link
  if (sign && SIGN_MESSAGES[sign]) {
    const name = capitalise(sign);
    const message = SIGN_MESSAGES[sign];
    const buttons = [
      { label: 'Pick Another', action: 'post', target: '/api/zodiac?page=1' },
      { label: `Collect ${name}`, action: 'link', target: 'https://zora.co/@starfolio' }
    ];
    const title = `${name}'s Cosmic Vibe`;
    const description = message;
    const html = buildFrame(title, description, buttons);
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
  }

  // Otherwise show the page of signs
  const group = SIGN_PAGES[pageIndex - 1];
  const buttons = group.map((s) => ({ label: capitalise(s), action: 'post', target: `/api/zodiac?sign=${s}` }));
  // Add navigation button
  if (pageIndex < SIGN_PAGES.length) {
    buttons.push({ label: 'Next', action: 'post', target: `/api/zodiac?page=${pageIndex + 1}` });
  } else {
    buttons.push({ label: 'Start Over', action: 'post', target: '/api/zodiac?page=1' });
  }
  const title = 'Pick your zodiac sign';
  const description = 'Select a sign to see its CT‑style fortune.';
  const html = buildFrame(title, description, buttons);
  res.setHeader('Content-Type', 'text/html');
  return res.status(200).send(html);
};
