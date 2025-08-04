const SIGN_MESSAGES = {
  // (same messages as before)
  // ...
};

const SIGN_LINKS = {
  // (same sign links as before)
  // ...
};

const SIGN_PAGES = [
  ['aries','taurus','gemini'],
  ['cancer','leo','virgo'],
  ['libra','scorpio','sagittarius'],
  ['capricorn','aquarius','pisces']
];

const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function buildFrame(title, description, buttons) {
  const img = 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=600&q=80';
  let meta = '';
  meta += `<meta property="og:title" content="${title}" />\\n`;
  meta += `<meta property="og:description" content="${description}" />\\n`;
  meta += `<meta property="og:image" content="${img}" />\\n`;
  meta += `<meta name="fc:frame" content="vNext" />\\n`;
  meta += `<meta name="fc:frame:image" content="${img}" />\\n`;
  buttons.forEach((btn, idx) => {
    const n = idx + 1;
    meta += `<meta name="fc:frame:button:${n}" content="${btn.label}" />\\n`;
    meta += `<meta name="fc:frame:button:${n}:action" content="${btn.action}" />\\n`;
    if (btn.target) {
      meta += `<meta name="fc:frame:button:${n}:target" content="${btn.target}" />\\n`;
    }
  });
  return `<!DOCTYPE html><html><head><meta charset="utf-8" />${meta}</head><body></body></html>`;
}

module.exports = async (req, res) => {
  try {
    // Determine base URL from environment; fallback to request host
    const baseUrl = `https://${process.env.VERCEL_URL || req.headers['x-forwarded-host'] || req.headers.host}`;

    const queryString = req.url.split('?')[1] || '';
    const params = new URLSearchParams(queryString);
    const sign = params.get('sign');
    const pageParam = parseInt(params.get('page') || '1', 10);
    const pageIndex = Math.min(Math.max(pageParam, 1), SIGN_PAGES.length) - 1;

    if (sign && SIGN_MESSAGES[sign]) {
      const name = capitalise(sign);
      const description = SIGN_MESSAGES[sign];
      const buttons = [
        { label: 'Pick Another', action: 'post', target: `${baseUrl}/api/zodiac?page=1` },
        { label: `Collect ${name}`, action: 'link', target: SIGN_LINKS[sign] }
      ];
      const html = buildFrame(`${name} Cosmic Vibe`, description, buttons);
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).end(html);
    }

    // Show a page of sign buttons
    const group = SIGN_PAGES[pageIndex];
    const buttons = group.map((s) => ({
      label: capitalise(s),
      action: 'post',
      target: `${baseUrl}/api/zodiac?sign=${s}`
    }));
    if (pageIndex < SIGN_PAGES.length - 1) {
      buttons.push({ label: 'Next', action: 'post', target: `${baseUrl}/api/zodiac?page=${pageIndex + 2}` });
    } else {
      buttons.push({ label: 'Start Over', action: 'post', target: `${baseUrl}/api/zodiac?page=1` });
    }
    const html = buildFrame('Pick your zodiac sign', 'Select a sign to see its CT‑style fortune.', buttons);
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).end(html);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal error');
  }
};

