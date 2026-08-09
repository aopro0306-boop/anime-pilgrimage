function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function mapsUrl(query) {
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query);
}

function spotCardHtml(spot, lang) {
  const name = lang === 'ja' ? spot.name_ja : spot.name_en;
  const desc = lang === 'ja' ? spot.desc_ja : spot.desc_en;
  const photoHtml = spot.photo ? `
        <img class="spot-photo" src="${spot.photo.url}" alt="${escapeHtml(name)}" loading="lazy">
        <p class="photo-credit">Photo: <a href="${spot.photo.sourceUrl}" target="_blank" rel="noopener">${spot.photo.author}</a> / ${spot.photo.license} (Wikimedia Commons)</p>` : '';
  return `
      <div class="spot-card">${photoHtml}
        <span class="spot-tag">${escapeHtml(spot.anime)}</span>
        <h3>${escapeHtml(name)}</h3>
        <p class="spot-desc">${escapeHtml(desc)}</p>
        <div class="spot-links">
          <a href="${mapsUrl(spot.mapsQuery)}" target="_blank" rel="noopener">${lang === 'ja' ? 'Googleマップで見る' : 'View on Google Maps'}</a>
          <a href="../map-leaflet.html">${lang === 'ja' ? 'インタラクティブマップで見る' : 'View on interactive map'}</a>
        </div>
      </div>`;
}

function langBlockHtml(data, lang) {
  const heroPhoto = data.spots.find(s => s.photo) ? data.spots.find(s => s.photo).photo : null;
  const title = lang === 'ja' ? data.titleJa : data.titleEn;
  const intro = lang === 'ja' ? data.introJa : data.introEn;
  const tipsTitle = lang === 'ja' ? '巡礼のヒント' : 'Pilgrimage Tips';
  const tips = lang === 'ja' ? data.tipsJa : data.tipsEn;
  const heroHtml = heroPhoto ? `
    <img id="hero-photo" src="${heroPhoto.url}" alt="${escapeHtml(title)}">
    <p class="photo-credit">Photo: <a href="${heroPhoto.sourceUrl}" target="_blank" rel="noopener">${heroPhoto.author}</a> / ${heroPhoto.license} (Wikimedia Commons)</p>` : '';
  const cards = data.spots.map(s => spotCardHtml(s, lang)).join('\n');
  return `
  <div data-i18n="${lang}" lang="${lang}"${lang === 'en' ? ' hidden' : ''}>
    <h1 class="heading">${escapeHtml(title)}</h1>${heroHtml}
    <p class="intro">${escapeHtml(intro)}</p>

    <div class="spot-grid">${cards}
    </div>

    <div class="tips">
      <h2>${escapeHtml(tipsTitle)}</h2>
      <p>${escapeHtml(tips)}</p>
    </div>

    <div class="cta-row">
      <a class="cta-button" href="../map-leaflet.html">${lang === 'ja' ? 'マップで全スポットを見る' : 'See all spots on the map'}</a>
    </div>

    <p class="footnote"><a href="../homepage.html">${lang === 'ja' ? '← ホームに戻る' : '← Back to Home'}</a> / <a href="../privacy.html">${lang === 'ja' ? 'プライバシーポリシー' : 'Privacy Policy'}</a></p>
  </div>`;
}

function generateGuidePage(data) {
  const ogImage = data.spots.find(s => s.photo) ? data.spots.find(s => s.photo).photo.url : '';
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(data.titleJa)} | Anime Pilgrimage Japan</title>
<meta name="description" content="${escapeHtml(data.metaDescEn)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Anime Pilgrimage Japan">
<meta property="og:url" content="https://aopro0306-boop.github.io/anime-pilgrimage/prototype/guides/${data.slug}.html">
<meta property="og:title" content="${escapeHtml(data.titleEn)} | Anime Pilgrimage Japan">
<meta property="og:description" content="${escapeHtml(data.metaDescEn)}">
<meta property="og:image" content="${ogImage}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(data.titleEn)} | Anime Pilgrimage Japan">
<meta name="twitter:description" content="${escapeHtml(data.metaDescEn)}">
<meta name="twitter:image" content="${ogImage}">
<!-- Google AdSense site-verification code -->
<meta name="google-adsense-account" content="ca-pub-8374504931423627">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8374504931423627" crossorigin="anonymous"></script>
<!-- Google Analytics (GA4) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-HQJNYMSM07"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-HQJNYMSM07');
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@400;600;800&family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  :root{
    --color-bg: #F6F0E4;
    --color-navy: #1D3550;
    --color-terracotta: #B5673A;
    --color-text: #2B2621;
  }
  *{box-sizing:border-box;}
  html,body{margin:0;padding:0;}
  body{font-family:'Zen Kaku Gothic New', sans-serif; background:var(--color-bg); color:var(--color-text); line-height:1.8;}
  .heading{font-weight:600; text-wrap:balance;}
  html[lang="ja"] .heading{font-family:'Shippori Mincho', serif;}
  html[lang="en"] .heading{font-family:'Fraunces', serif;}
  a{color:var(--color-navy);}

  #site-header{position:sticky; top:0; z-index:50; background:rgba(246,240,228,0.92); -webkit-backdrop-filter:blur(4px); backdrop-filter:blur(4px); border-bottom:1px solid rgba(29,53,80,0.12);}
  .header-inner{max-width:760px; margin:0 auto; padding:14px 24px; display:flex; align-items:center; justify-content:space-between;}
  .logo{font-weight:700; color:var(--color-navy); letter-spacing:0.02em; text-decoration:none;}
  .header-actions{display:flex; align-items:center; gap:16px;}
  .map-link{font-size:13px; color:var(--color-navy); text-decoration:none; font-weight:600;}
  #lang-toggle{background:transparent; border:1px solid var(--color-navy); color:var(--color-navy); border-radius:999px; padding:6px 16px; font-size:13px; font-family:inherit; cursor:pointer;}
  #lang-toggle:hover{background:var(--color-navy); color:var(--color-bg);}

  main{max-width:760px; margin:0 auto; padding:40px 24px 88px;}
  h1.heading{font-size:clamp(24px,4vw,34px); margin:0 0 12px 0; color:var(--color-navy);}
  #hero-photo{width:100%; max-height:360px; object-fit:cover; border-radius:16px; display:block;}
  .photo-credit{margin:4px 0 0 0; font-size:10px; color:#999;}
  .photo-credit a{color:#999;}
  .intro{font-size:16px; margin:16px 0 32px 0;}

  .spot-grid{display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:24px; margin:0 0 40px 0;}
  .spot-card{background:#fff; border-radius:14px; padding:18px; box-shadow:0 4px 14px rgba(29,53,80,0.08);}
  .spot-card .spot-photo{width:100%; height:150px; object-fit:cover; border-radius:10px; display:block;}
  .spot-tag{display:inline-block; background:rgba(181,103,58,0.12); color:var(--color-terracotta); font-size:11px; font-weight:700; padding:3px 10px; border-radius:999px; margin-top:10px;}
  .spot-card h3{margin:8px 0 6px 0; font-size:16px; color:var(--color-navy);}
  .spot-card .spot-desc{font-size:13px; margin:0 0 10px 0;}
  .spot-links{display:flex; flex-direction:column; gap:4px; font-size:12px;}

  .tips{background:rgba(29,53,80,0.05); border-radius:14px; padding:20px 24px; margin:0 0 32px 0;}
  .tips h2{margin:0 0 8px 0; font-size:16px; color:var(--color-navy);}
  .tips p{margin:0; font-size:14px;}

  .cta-row{text-align:center; margin:0 0 40px 0;}
  .cta-button{display:inline-block; background:var(--color-terracotta); color:#F6F0E4; text-decoration:none; padding:14px 36px; border-radius:999px; font-weight:700; font-size:15px;}
  .cta-button:hover{transform:translateY(-2px); box-shadow:0 8px 20px rgba(0,0,0,0.2);}

  .footnote{font-size:13px; opacity:0.7;}
</style>
</head>
<body>
<header id="site-header">
  <div class="header-inner">
    <a class="logo" href="../homepage.html">Anime Pilgrimage Japan</a>
    <div class="header-actions">
      <a class="map-link" href="../map-leaflet.html">Map</a>
      <button id="lang-toggle" type="button" aria-label="Language">English</button>
    </div>
  </div>
</header>

<main>${langBlockHtml(data, 'ja')}
${langBlockHtml(data, 'en')}
</main>

<script>
function applyLang(lang) {
  document.documentElement.lang = lang;
  document.querySelectorAll('main > div[data-i18n]').forEach(el => {
    el.hidden = el.dataset.i18n !== lang;
  });
  document.title = lang === 'ja'
    ? '${escapeHtml(data.titleJa)} | Anime Pilgrimage Japan'
    : '${escapeHtml(data.titleEn)} | Anime Pilgrimage Japan';
  document.getElementById('lang-toggle').textContent = lang === 'ja' ? 'English' : '日本語';
}

let currentLang = 'ja';
document.getElementById('lang-toggle').addEventListener('click', () => {
  currentLang = currentLang === 'ja' ? 'en' : 'ja';
  applyLang(currentLang);
});

function detectBrowserLang() {
  const browserLangs = navigator.languages || [navigator.language || 'en'];
  for (const bl of browserLangs) {
    if (bl.toLowerCase().startsWith('ja')) return 'ja';
  }
  return 'en';
}

currentLang = detectBrowserLang();
applyLang(currentLang);
</script>
</body>
</html>
`;
}

module.exports = { generateGuidePage };
