const SIGN_MESSAGES = {
  aries:      "Aries apes into every new mint like they're slaying a boss, then asks 'When Lambo?' 30 minutes later.",
  taurus:     'Taurus hodlers treat bear markets like a buffet—accumulation season never ends for these stubborn bulls.',
  gemini:     'Gemini holders represent duality of holding forever and buying more.',
  cancer:     'Cancer stashes their bags like a crab; sideways markets are their natural habitat and they love it.',
  leo:        'Leo calls their bag the king of NFTs and expects everyone else to bow to their floor price.',
  virgo:      'Virgo hodlers annotate their wallet activity with spreadsheets; analysis paralysis but make it crypto.',
  libra:      "Libra can't decide between staking and farming, so they do both and call it a balanced portfolio.",
  scorpio:    'Scorpio investors buy your bags in silence and sell in revenge; trust them at your own risk.',
  sagittarius:'Sagittarius sets off on every airdrop quest like a cosmic crusade—no risk too far, no wallet too degen.',
  capricorn:  'Capricorns treat yield farming like a 9‑to‑5 job—always grinding, even when the market’s asleep.',
  aquarius:   'Aquarius invents new chains in their mind and shills them before the whitepaper even exists.',
  pisces:     'Pisces believe in cosmic charts and RSI alignment; if Mercury’s in retrograde, they blame the red candles.'
};

const SIGN_LINKS = {
  aries:      'https://zora.co/coin/base:0x64fdc8dc83b272a3613ad1b029baa04fa77fe9e2',
  taurus:     'https://zora.co/coin/base:0xc9610c793f9dd4d99e0b6249d62d22b0d9e5adeb',
  gemini:     'https://zora.co/coin/base:0xca3cb7f5e086c7dcb2733834a32da7469d0399c3',
  cancer:     'https://zora.co/coin/base:0xf628572d8c72f472ada175a382b4c31363184ca0',
  leo:        'https://zora.co/coin/base:0x75aba7910cb10c248479968569c18b99b8e6dbbc',
  virgo:      'https://zora.co/coin/base:0x37353a08eac909fefa1d57d171e245625826a684',
  libra:      'https://zora.co/coin/base:0xaa1a1efef9338731dd662c2fd4dab41b5696484862',
  scorpio:    'https://zora.co/coin/base:0xc4f924ac9e7f0bbf74dcf1b11e4d84ff91cd63ba',
  sagittarius:'https://zora.co/coin/base:0x82878ceafd561b1e464ab7db152569cdd742a5c0',
  capricorn:  'https://zora.co/coin/base:0x82839fc26cee917c03da1c9944b2965589805486',
  aquarius:   'https://zora.co/coin/base:0x433f3d39b8eab3c70199d220ac20ef3416bc193a',
  pisces:     'https://zora.co/coin/base:0x4164fcb7f7047f4d39d4f6e77def100c80b40dcb'
};

// Pages of three signs each
const SIGN_PAGES = [
  ['aries', 'taurus', 'gemini'],
  ['cancer', 'leo', 'virgo'],
  ['libra', 'scorpio', 'sagittarius'],
  ['capricorn', 'aquarius', 'pisces']
];

const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function buildFrame(title, description, buttons) {
  const img = 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=600&q=80';
  let meta = '';
  meta += `<meta property="og:title" content="${title}" />\n`;
  meta += `<meta property="og:description" content="${description}" />\n`;
  meta += `<meta property="og:image" content="${img}" />\n`;
  meta += `<meta name="fc:frame" content="vNext" />\n`;
  meta += `<meta name="fc:frame:image" content="${img}" />\n`;
  buttons.forEach((btn, idx) => {
    const n = idx + 1;
    meta += `<meta name="fc:frame:button:${n}" content="${btn.label}" />\n`;
    meta += `<meta name="fc:frame:button:${n}:action" content="${btn.action}" />\n`;
    if (btn.target) {
      meta += `<meta name="fc:frame:button:${n}:target" content="${btn.target}" />\n`;
    }
  });
  return `<!DOCTYPE html><html><head><meta charset="utf-8" />${meta}</head><body></body></html>`;
}

module.exports = async (req, res) => {
  try {
    // Parse the query string manually; ignore host completely
    const queryString = req.url.split('?')[1] || '';
    const params = new URLSearchParams(queryString);
    const sign = params.get('sign');
    const pageParam = parseInt(params.get('page') || '1', 10);
    const pageIndex = Math.min(Math.max(pageParam, 1), SIGN_PAGES.length) - 1;

    // If a sign is selected
    if (sign && SIGN_MESSAGES[sign]) {
      const name = capitalise(sign);
      const description = SIGN_MESSAGES[sign];
      const buttons = [
        { label: 'Pick Another', action: 'post', target: '/api/zodiac?page=1' },
        { label: `Collect ${name}`, action: 'link', target: SIGN_LINKS[sign] }
      ];
      const html = buildFrame(`${name} Cosmic Vibe`, description, buttons);
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).end(html);
    }

    // Otherwise display a page of sign buttons
    const group = SIGN_PAGES[pageIndex];
    const buttons = group.map((s) => ({
      label: capitalise(s),
      action: 'post',
      target: `/api/zodiac?sign=${s}`
    }));
    if (pageIndex < SIGN_PAGES.length - 1) {
      buttons.push({ label: 'Next', action: 'post', target: `/api/zodiac?page=${pageIndex + 2}` });
    } else {
      buttons.push({ label: 'Start Over', action: 'post', target: '/api/zodiac?page=1' });
    }
    const html = buildFrame('Pick your zodiac sign', 'Select a sign to see its CT‑style fortune.', buttons);
    res.setHeader('Content-Type', 'text/html');
    res.status(200).end(html);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal error');
  }
};

