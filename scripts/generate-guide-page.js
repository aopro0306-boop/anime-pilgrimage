function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function mapsUrl(query) {
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query);
}

const LANGS = ['ja', 'en', 'zh-TW', 'ko', 'th', 'fr'];

// UI chrome text only (nav/buttons/labels). Page content (title/intro/tips)
// and spot names/descriptions are JA/EN-authored only, matching the existing
// scope decision for SPOT_NAMES_EN/SPOT_DESCRIPTIONS_EN in map-leaflet.html —
// zh-TW/ko/th/fr fall back to the English content, not machine-translated.
const UI_I18N = {
  ja: { langName: '日本語', tipsTitle: '巡礼のヒント', durationTitle: '所要時間の目安', ctaButton: 'マップで全スポットを見る', googleMapsLink: 'Googleマップで見る', interactiveMapLink: 'インタラクティブマップで見る', backToHome: '← ホームに戻る', privacyPolicy: 'プライバシーポリシー', mapNav: 'マップ' },
  en: { langName: 'English', tipsTitle: 'Pilgrimage Tips', durationTitle: 'Estimated Time Needed', ctaButton: 'See all spots on the map', googleMapsLink: 'View on Google Maps', interactiveMapLink: 'View on interactive map', backToHome: '← Back to Home', privacyPolicy: 'Privacy Policy', mapNav: 'Map' },
  'zh-TW': { langName: '繁體中文', tipsTitle: '巡禮小提示', durationTitle: '所需時間參考', ctaButton: '在地圖上查看所有地點', googleMapsLink: '在Google地圖上查看', interactiveMapLink: '在互動地圖上查看', backToHome: '← 回到首頁', privacyPolicy: '隱私權政策', mapNav: '地圖' },
  ko: { langName: '한국어', tipsTitle: '순례 팁', durationTitle: '예상 소요 시간', ctaButton: '지도에서 모든 스팟 보기', googleMapsLink: 'Google 지도에서 보기', interactiveMapLink: '인터랙티브 지도에서 보기', backToHome: '← 홈으로 돌아가기', privacyPolicy: '개인정보처리방침', mapNav: '지도' },
  th: { langName: 'ไทย', tipsTitle: 'เคล็ดลับการตามรอย', durationTitle: 'ระยะเวลาโดยประมาณ', ctaButton: 'ดูทุกสถานที่บนแผนที่', googleMapsLink: 'ดูใน Google Maps', interactiveMapLink: 'ดูบนแผนที่แบบอินเทอร์แอกทีฟ', backToHome: '← กลับหน้าแรก', privacyPolicy: 'นโยบายความเป็นส่วนตัว', mapNav: 'แผนที่' },
  fr: { langName: 'Français', tipsTitle: 'Conseils pour le pèlerinage', durationTitle: 'Durée estimée', ctaButton: 'Voir tous les lieux sur la carte', googleMapsLink: 'Voir sur Google Maps', interactiveMapLink: 'Voir sur la carte interactive', backToHome: "← Retour à l'accueil", privacyPolicy: 'Politique de confidentialité', mapNav: 'Carte' },
};

// JA/EN-authored content falls back to English for the other 4 UI languages.
function contentLang(lang) {
  return lang === 'ja' ? 'ja' : 'en';
}

function spotCardHtml(spot, lang) {
  const cl = contentLang(lang);
  const name = cl === 'ja' ? spot.name_ja : spot.name_en;
  const desc = cl === 'ja' ? spot.desc_ja : spot.desc_en;
  const photoHtml = spot.photo ? `
        <img class="spot-photo" src="${spot.photo.url}" alt="${escapeHtml(name)}" loading="lazy">
        <p class="photo-credit">Photo: <a href="${spot.photo.sourceUrl}" target="_blank" rel="noopener">${spot.photo.author}</a> / ${spot.photo.license} (Wikimedia Commons)</p>` : '';
  return `
      <div class="spot-card">${photoHtml}
        <span class="spot-tag">${escapeHtml(spot.anime)}</span>
        <h3>${escapeHtml(name)}</h3>
        <p class="spot-desc">${escapeHtml(desc)}</p>
        <div class="spot-links">
          <a href="${mapsUrl(spot.mapsQuery)}" target="_blank" rel="noopener">${UI_I18N[lang].googleMapsLink}</a>
          <a href="../map-leaflet.html">${UI_I18N[lang].interactiveMapLink}</a>
        </div>
      </div>`;
}

function langBlockHtml(data, lang) {
  const cl = contentLang(lang);
  const heroPhoto = data.spots.find(s => s.photo) ? data.spots.find(s => s.photo).photo : null;
  const title = cl === 'ja' ? data.titleJa : data.titleEn;
  const intro = cl === 'ja' ? data.introJa : data.introEn;
  const tips = cl === 'ja' ? data.tipsJa : data.tipsEn;
  const duration = cl === 'ja' ? data.durationJa : data.durationEn;
  const heroHtml = heroPhoto ? `
    <img id="hero-photo" src="${heroPhoto.url}" alt="${escapeHtml(title)}">
    <p class="photo-credit">Photo: <a href="${heroPhoto.sourceUrl}" target="_blank" rel="noopener">${heroPhoto.author}</a> / ${heroPhoto.license} (Wikimedia Commons)</p>` : '';
  const cards = data.spots.map(s => spotCardHtml(s, lang)).join('\n');
  return `
  <div data-i18n="${lang}" lang="${lang}"${lang === 'ja' ? '' : ' hidden'}>
    <h1 class="heading">${escapeHtml(title)}</h1>${heroHtml}
    <p class="intro">${escapeHtml(intro)}</p>

    <div class="spot-grid">${cards}
    </div>

    <div class="mini-map-slot" data-mini-map-slot="${lang}"></div>

    <div class="tips duration">
      <h2>${escapeHtml(UI_I18N[lang].durationTitle)}</h2>
      <p>${escapeHtml(duration)}</p>
    </div>

    <div class="tips">
      <h2>${escapeHtml(UI_I18N[lang].tipsTitle)}</h2>
      <p>${escapeHtml(tips)}</p>
    </div>

    <div class="cta-row">
      <a class="cta-button" href="../map-leaflet.html">${escapeHtml(UI_I18N[lang].ctaButton)}</a>
    </div>

    <p class="footnote"><a href="../homepage.html">${escapeHtml(UI_I18N[lang].backToHome)}</a> / <a href="../privacy.html">${escapeHtml(UI_I18N[lang].privacyPolicy)}</a></p>
  </div>`;
}

// Structured data (schema.org) so search engines can understand this page
// as a list of tourist attractions, not just a generic article — this is
// what enables rich results (map pins / list snippets) in Google Search,
// separate from the OGP/Twitter tags above (which only affect social-share
// link previews). Reuses the same spot data already on the page rather
// than maintaining a second copy.
function structuredDataJson(data) {
  const pageUrl = `https://aopro0306-boop.github.io/anime-pilgrimage/prototype/guides/${data.slug}.html`;
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: data.titleEn,
    description: data.metaDescEn,
    itemListElement: data.spots.map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'TouristAttraction',
        name: s.name_en,
        description: s.desc_en,
        ...(s.photo ? { image: s.photo.url } : {}),
        geo: { '@type': 'GeoCoordinates', latitude: s.lat, longitude: s.lng },
      },
    })),
  };
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://aopro0306-boop.github.io/anime-pilgrimage/prototype/homepage.html' },
      { '@type': 'ListItem', position: 2, name: data.titleEn, item: pageUrl },
    ],
  };
  return [JSON.stringify(itemList), JSON.stringify(breadcrumb)];
}

function generateGuidePage(data) {
  const ogImage = data.spots.find(s => s.photo) ? data.spots.find(s => s.photo).photo.url : '';
  const pageUrl = `https://aopro0306-boop.github.io/anime-pilgrimage/prototype/guides/${data.slug}.html`;
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(data.titleJa)} | Anime Pilgrimage Japan</title>
<meta name="description" content="${escapeHtml(data.metaDescEn)}">
<link rel="canonical" href="${pageUrl}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Anime Pilgrimage Japan">
<meta property="og:url" content="${pageUrl}">
<meta property="og:title" content="${escapeHtml(data.titleEn)} | Anime Pilgrimage Japan">
<meta property="og:description" content="${escapeHtml(data.metaDescEn)}">
<meta property="og:image" content="${ogImage}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(data.titleEn)} | Anime Pilgrimage Japan">
<meta name="twitter:description" content="${escapeHtml(data.metaDescEn)}">
<meta name="twitter:image" content="${ogImage}">
${structuredDataJson(data).map(json => `<script type="application/ld+json">\n${json}\n</script>`).join('\n')}
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
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.css">
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

  #mini-map{height:260px; border-radius:16px; margin:0 0 24px 0; position:relative; z-index:1; overflow:hidden;}

  .tips{background:rgba(29,53,80,0.05); border-radius:14px; padding:20px 24px; margin:0 0 32px 0;}
  .tips h2{margin:0 0 8px 0; font-size:16px; color:var(--color-navy);}
  .tips p{margin:0; font-size:14px;}
  .tips.duration{background:rgba(181,103,58,0.08); margin-bottom:12px;}

  .cta-row{text-align:center; margin:0 0 40px 0;}
  .cta-button{display:inline-block; background:var(--color-terracotta); color:#F6F0E4; text-decoration:none; padding:14px 36px; border-radius:999px; font-weight:700; font-size:15px;}
  .cta-button:hover{transform:translateY(-2px); box-shadow:0 8px 20px rgba(0,0,0,0.2);}

  .footnote{font-size:13px; opacity:0.7;}

  #lang-select{background:transparent; border:1px solid var(--color-navy); color:var(--color-navy); border-radius:999px; padding:6px 14px; font-size:13px; font-family:inherit; cursor:pointer;}
</style>
</head>
<body>
<header id="site-header">
  <div class="header-inner">
    <a class="logo" href="../homepage.html">Anime Pilgrimage Japan</a>
    <div class="header-actions">
      <a class="map-link" href="../map-leaflet.html">${escapeHtml(UI_I18N.ja.mapNav)}</a>
      <select id="lang-select" aria-label="Language">
        ${LANGS.map(l => `<option value="${l}">${escapeHtml(UI_I18N[l].langName)}</option>`).join('\n        ')}
      </select>
    </div>
  </div>
</header>

<main>
${LANGS.map(l => langBlockHtml(data, l)).join('\n')}
</main>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.js"></script>
<script src="https://unpkg.com/@maplibre/maplibre-gl-leaflet/leaflet-maplibre-gl.js"></script>
<script>
const UI_I18N = ${JSON.stringify(UI_I18N)};

// Small locator map for this page's spots (English names only — this
// preview map isn't re-translated on language switch, unlike the full
// interactive map at ../map-leaflet.html which this links out to). Only
// one Leaflet instance is created; since each language's content lives in
// its own hidden/visible <div> (see langBlockHtml), the single map element
// is physically moved into the currently visible language block's
// .mini-map-slot on every language switch (see placeMiniMap below) rather
// than duplicating a live map per language.
let miniMap = null;
let miniMapEl = null;

function initMiniMap() {
  const spots = ${JSON.stringify(data.spots.map(s => ({ name: s.name_en, lat: s.lat, lng: s.lng })))};
  miniMapEl = document.createElement('div');
  miniMapEl.id = 'mini-map';
  // The element must already be attached to the DOM (with real, non-zero
  // dimensions) before L.map()/fitBounds() run — Leaflet computes the
  // initial view from the container's current size, and a detached element
  // has 0x0, which produces a wrong zoom/center that invalidateSize() alone
  // cannot fix later (it only recalculates rendering, not the prior fit).
  document.querySelector('.mini-map-slot[data-mini-map-slot="ja"]').appendChild(miniMapEl);
  miniMap = L.map(miniMapEl, { zoomControl: true, scrollWheelZoom: false, minZoom: 1, maxZoom: 19 });
  L.maplibreGL({ style: 'https://tiles.openfreemap.org/styles/liberty' }).addTo(miniMap);
  const markers = spots.map(s => L.circleMarker([s.lat, s.lng], { radius: 8, color: '#fff', weight: 2, fillColor: '#B5673A', fillOpacity: 1 }).bindPopup(s.name).addTo(miniMap));
  if (markers.length === 1) {
    miniMap.setView([spots[0].lat, spots[0].lng], 13);
  } else {
    miniMap.fitBounds(L.featureGroup(markers).getBounds(), { padding: [24, 24] });
  }
}

function placeMiniMap(lang) {
  if (!miniMapEl) return;
  const slot = document.querySelector('.mini-map-slot[data-mini-map-slot="' + lang + '"]');
  if (!slot) return;
  slot.appendChild(miniMapEl);
  if (miniMap) setTimeout(() => miniMap.invalidateSize(), 0);
}

initMiniMap();

function applyLang(lang) {
  document.documentElement.lang = lang;
  document.querySelectorAll('main > div[data-i18n]').forEach(el => {
    el.hidden = el.dataset.i18n !== lang;
  });
  placeMiniMap(lang);
  const contentLang = lang === 'ja' ? 'ja' : 'en';
  document.title = (contentLang === 'ja' ? '${escapeHtml(data.titleJa)}' : '${escapeHtml(data.titleEn)}') + ' | Anime Pilgrimage Japan';
  document.getElementById('lang-select').value = lang;
  document.querySelector('.map-link').textContent = UI_I18N[lang].mapNav;
}

let currentLang = 'ja';
document.getElementById('lang-select').addEventListener('change', (e) => {
  currentLang = e.target.value;
  applyLang(currentLang);
});

// This site targets overseas visitors, so the default language is detected
// from the browser rather than always starting in Japanese. Falls back to
// English (rather than Japanese) for any language this site doesn't support,
// matching prototype/map-leaflet.html's detectBrowserLang().
function detectBrowserLang() {
  const supported = ['ja', 'en', 'zh-TW', 'ko', 'th', 'fr'];
  const browserLangs = navigator.languages || [navigator.language || 'en'];
  for (const bl of browserLangs) {
    const lower = bl.toLowerCase();
    const exact = supported.find(s => s.toLowerCase() === lower);
    if (exact) return exact;
    const base = lower.split('-')[0];
    if (base === 'zh') return 'zh-TW';
    const baseMatch = supported.find(s => s.toLowerCase() === base);
    if (baseMatch) return baseMatch;
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
