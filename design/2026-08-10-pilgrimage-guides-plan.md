# アニメ聖地巡礼ガイドページ（SEOコンテンツ・パイロット版） Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 都道府県別3件・作品別3件、計6件の自己完結型HTMLガイドページ（`prototype/guides/*.html`）を新規作成し、`homepage.html`・`map-leaflet.html`・`sitemap.xml`と相互リンクさせる。

**Architecture:** `prototype/privacy.html`と同じ「JA/EN静的2ブロック＋`applyLang()`」パターンを踏襲した自己完結型HTMLファイルを、`scripts/generate-guide-page.js`という共通テンプレート生成スクリプトから作る。生成スクリプトはNode.jsのテンプレート文字列関数`generateGuidePage(data)`を1つエクスポートし、各ガイドページのタスクはそのスクリプトを`require()`して固有データ（コピー文・スポット一覧）を渡し、`fs.writeFileSync`で最終成果物である静的HTMLを書き出す。**生成後のHTMLファイルは完全に自己完結した静的ファイルであり、サイト自体にビルドステップは発生しない**（generate-guide-page.jsは開発時にのみ使うテンプレート生成ツールであり、閲覧者はこのスクリプトを経由しない）。

**Tech Stack:** 素のHTML/CSS/JavaScript（外部JSライブラリなし）。Google Fonts CDN。テンプレート生成にNode.js。検証に`node --check`・`node -e`アサーション・ヘッドレスChrome（実行時コンソールエラー検出）。

## Global Constraints

- 成果物: `prototype/guides/gifu.html`, `prototype/guides/kumamoto.html`, `prototype/guides/ibaraki.html`, `prototype/guides/kiminonaha.html`, `prototype/guides/kimetsu.html`, `prototype/guides/yurucamp.html`（計6ファイル、すべて`<!DOCTYPE html>`を含む通常のWebページ）。加えて`scripts/generate-guide-page.js`（生成ツール、コミット対象）。
- 配色トークン（[design/2026-08-10-pilgrimage-guides-design.md](2026-08-10-pilgrimage-guides-design.md) §5、`prototype/privacy.html`と同一）: 背景 `#F6F0E4`、ネイビー `#1D3550`、テラコッタ `#B5673A`、文字色 `#2B2621`。
- タイポグラフィ: 見出し（日本語）`Shippori Mincho`、見出し（英語）`Fraunces`、本文（日英共通）`Zen Kaku Gothic New`。Google Fonts CDN経由。
- 言語はJA/ENの2言語のみ。`prototype/privacy.html`と全く同じ`data-i18n="ja"`/`data-i18n="en"`静的2ブロック方式＋`detectBrowserLang()`（ja/en判定版）＋`applyLang(lang)`を踏襲する。
- 各ページは`prototype/guides/`配下に置かれるため、サイト内リンクは`../homepage.html`、`../map-leaflet.html`、`../privacy.html`という相対パスになる。
- GA4スニペット（測定ID `G-HQJNYMSM07`）・AdSense検証タグ（`<meta name="google-adsense-account" content="ca-pub-8374504931423627">` + `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8374504931423627" crossorigin="anonymous"></script>`）を、既存ページと全く同じ形で全ページの`<head>`に含める。
- OGP/Twitterカードのタイトル・説明文は英語表記とする（`homepage.html`・`map-leaflet.html`・`privacy.html`・`index.html`の既存踏襲、`og:url`は`https://aopro0306-boop.github.io/anime-pilgrimage/prototype/guides/<slug>.html`）。
- Googleマップリンクは `https://www.google.com/maps/search/?api=1&query=` + `encodeURIComponent(spot.mapsQuery)` の形式で生成する。
- 写真クレジット表記は`map-leaflet.html`の`buildPopupHtml()`と同一文言パターン: `Photo: <a href="${sourceUrl}" target="_blank" rel="noopener">${author}</a> / ${license} (Wikimedia Commons)`。
- 写真が存在しないスポットは、`map-leaflet.html`の実際の挙動（`photoHtml = photo ? ... : ''`）と同じく、画像要素を丸ごと省略する。「準備中」等のプレースホルダー文言は表示しない。
- スポットのデータ（id/name_ja/name_en/anime/description_ja/description_en/mapsQuery/photo）は、`prototype/map-leaflet.html`の`SPOTS`/`PHOTOS`/`SPOT_NAMES_EN`/`SPOT_DESCRIPTIONS_EN`から抽出した値をそのまま使う（下記各タスクに全件を literal に記載済み。新規調査は不要）。
- 検証は各タスクで次を必ず行う: ①`node --check`による生成HTMLの構文チェック、②`node -e`によるDOM構造・スポット件数・写真credit件数のアサーション。最終タスク（Task 8）でヘッドレスChrome（`C:/Program Files/Google/Chrome/Application/chrome.exe`）による6ページ全ての実行時コンソールエラーチェックを行う。

---

## File Structure

- `scripts/generate-guide-page.js` — Task 1で作成。`generateGuidePage(data)`関数をエクスポートする共通テンプレート生成ツール。Task 2〜6はこれを`require()`する。
- `prototype/guides/gifu.html`〜`prototype/guides/yurucamp.html` — Task 1〜6で1ページずつ生成・コミット。
- `prototype/homepage.html`, `sitemap.xml` — Task 7で編集（ガイド一覧への内部リンク追加）。

---

### Task 1: テンプレート生成スクリプト作成 ＋ 岐阜県ガイド生成

**Files:**
- Create: `scripts/generate-guide-page.js`
- Create: `prototype/guides/gifu.html`

**Interfaces:**
- Produces: `function generateGuidePage(data): string`（Node.js, `module.exports`）。`data`の形は下記Step 2のGifuデータ例の通り。後続タスク（Task 2〜6）はこの関数を`require('../scripts/generate-guide-page.js')`し、新しい`data`オブジェクトを渡して呼び出す。

- [ ] **Step 1: `scripts/generate-guide-page.js` を作成する**

```js
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
```

- [ ] **Step 2: 岐阜県ガイドのデータを定義し、`prototype/guides/gifu.html` を生成する**

`scripts/build-gifu.js` という一時実行ファイルを作り、以下を実行してから削除してよい（生成物である`prototype/guides/gifu.html`だけが成果物）:

```js
const fs = require('fs');
const path = require('path');
const { generateGuidePage } = require('./generate-guide-page.js');

const data = {
  slug: 'gifu',
  titleJa: '岐阜県のアニメ聖地巡礼完全ガイド',
  titleEn: 'Gifu Prefecture Anime Pilgrimage Guide',
  metaDescJa: '『君の名は。』『氷菓』の舞台、岐阜県・飛騨高山エリアのアニメ聖地巡礼スポットを写真付きで紹介。',
  metaDescEn: 'A photo guide to real-world anime pilgrimage spots in Gifu Prefecture\'s Hida-Takayama area, featured in "Your Name" and "Hyouka."',
  introJa: '岐阜県、とりわけ飛騨高山エリアは、映画『君の名は。』の舞台・糸守町のモデルとなった地として世界中のファンが訪れる聖地です。同じ高山の町並みは、TVアニメ『氷菓』の舞台としても描かれており、古い町家が並ぶ本町通りや宮川に架かる橋など、2つの名作の風景を一度に巡ることができます。',
  introEn: 'Gifu Prefecture, especially the historic town of Hida-Takayama, draws anime fans from around the world as the real-world model for Itomori, the fictional town in the film "Your Name." The same streets of Takayama also appear in the TV anime "Hyouka," so visitors can trace the scenery of two beloved series in a single trip, from old merchant houses to bridges over the Miya River.',
  tipsJa: '飛騨高山エリアは公共交通機関で回りやすく、徒歩や自転車での巡礼にも適しています。神社や商店街は地元の方の生活の場でもあるため、静かに見学しましょう。',
  tipsEn: 'The Hida-Takayama area is compact and easy to explore on foot, bicycle, or public transit. Shrines and shopping streets are also part of daily local life, so please visit quietly and respectfully.',
  spots: [
    { id: 'kiminonaha-hidafurukawa-station', name_ja: '飛騨古川駅', name_en: 'Hida-Furukawa Station', anime: '君の名は。', desc_ja: '糸守町のモデルとなった飛騨市の玄関口となる駅。', desc_en: 'The gateway station to Hida City that inspired the fictional town of Itomori.', mapsQuery: '飛騨古川駅', photo: { url: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/View_of_Hida-Furukawa_Station.JPG', author: 'そらみみ', license: 'CC BY-SA 4.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:View_of_Hida-Furukawa_Station.JPG' } },
    { id: 'kiminonaha-keta-wakamiya-jinja', name_ja: '気多若宮神社', name_en: 'Keta Wakamiya Shrine', anime: '君の名は。', desc_ja: '作中の宮水神社の鳥居や境内のモデルとなった神社。', desc_en: 'The shrine that inspired the torii gate and grounds of Miyamizu Shrine in the film.', mapsQuery: '気多若宮神社', photo: { url: 'https://upload.wikimedia.org/wikipedia/commons/8/85/Keta_wakamiya.jpg', author: 'Opqr', license: 'CC BY-SA 4.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Keta_wakamiya.jpg' } },
    { id: 'kiminonaha-hie-jinja', name_ja: '飛騨山王宮 日枝神社', name_en: 'Hida Sanno-gu Hie Shrine', anime: '君の名は。', desc_ja: '劇中の階段や鳥居のシーンに関連するとされる高山の古社。', desc_en: 'An ancient shrine in Takayama said to be linked to the staircase and torii scenes in the film.', mapsQuery: '飛騨山王宮 日枝神社', photo: { url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Takayama-Hie-jinja_torii.jpeg?width=400', author: 'nnh', license: 'Public Domain', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Takayama-Hie-jinja_torii.jpeg' } },
    { id: 'kiminonaha-hida-library', name_ja: '飛騨市図書館', name_en: 'Hida City Library', anime: '君の名は。', desc_ja: '瀧たちが糸守町の記録を調べるシーンのモデルとなった図書館。', desc_en: 'The library that inspired the scene where Taki and friends research the town of Itomori.', mapsQuery: '飛騨市図書館', photo: { url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Hida_City_Library_exterior_ac_(1).jpg?width=400', author: 'Asturio Cantabrio', license: 'CC BY-SA 4.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Hida_City_Library_exterior_ac_(1).jpg' } },
    { id: 'hyouka-kajibashi', name_ja: '鍛冶橋', name_en: 'Kajibashi Bridge', anime: '氷菓', desc_ja: 'OPにも登場する高山市の宮川に架かる橋。', desc_en: 'A bridge over the Miya River in Takayama that also appears in the opening sequence.', mapsQuery: '鍛冶橋 高山市', photo: { url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Kajibashi_Bridge_from_west_side_20150123.JPG?width=400', author: 'そらみみ', license: 'CC BY-SA 4.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Kajibashi_Bridge_from_west_side_20150123.JPG' } },
    { id: 'hyouka-yayoibashi', name_ja: '弥生橋', name_en: 'Yayoibashi Bridge', anime: '氷菓', desc_ja: '作中に登場する高山市内の橋。', desc_en: 'A bridge within Takayama City that appears in the series.', mapsQuery: '弥生橋 高山市', photo: { url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Yayoibashi_Bridge_from_Miyamaebashi_Bridge_in_front_of_Sakurayama_Hachiman_Shrine.JPG?width=400', author: 'そらみみ', license: 'CC BY-SA 4.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Yayoibashi_Bridge_from_Miyamaebashi_Bridge_in_front_of_Sakurayama_Hachiman_Shrine.JPG' } },
    { id: 'hyouka-honmachi-maneki', name_ja: '本町通り 招き猫像前', name_en: 'Honmachi Street, by the Beckoning Cat Statue', anime: '氷菓', desc_ja: 'OP冒頭に登場する招き猫の像がある商店街通り。', desc_en: 'A shopping street with a beckoning-cat statue that appears at the start of the opening sequence.', mapsQuery: '本町通り 高山市', photo: { url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Hommachi_Street_Shopping_Area_in_Takayama_at_dusk_20150123.JPG?width=400', author: 'そらみみ', license: 'CC BY-SA 4.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Hommachi_Street_Shopping_Area_in_Takayama_at_dusk_20150123.JPG' } },
  ],
};

fs.writeFileSync(path.join(__dirname, '..', 'prototype', 'guides', 'gifu.html'), generateGuidePage(data));
console.log('wrote gifu.html');
```

Run: `node scripts/build-gifu.js`（実行後、この一時ファイルは削除してよい。恒久的に残すのは`generate-guide-page.js`のみ）。

- [ ] **Step 3: 検証する**

```bash
node --check prototype/guides/gifu.html 2>&1 | head -5 || true
node -e "
const fs=require('fs');
const html=fs.readFileSync('prototype/guides/gifu.html','utf8');
console.assert(html.includes('<!DOCTYPE html>'), 'missing DOCTYPE');
console.assert(html.includes('G-HQJNYMSM07'), 'missing GA4 snippet');
console.assert(html.includes('ca-pub-8374504931423627'), 'missing AdSense verification');
console.assert((html.match(/class=\"spot-card\"/g)||[]).length === 14, 'expected 14 spot-card divs (7 spots x 2 languages), got ' + (html.match(/class=\"spot-card\"/g)||[]).length);
console.assert((html.match(/class=\"photo-credit\"/g)||[]).length === 16, 'expected 16 photo-credit blocks (7 spots + 1 hero, x2 languages), got ' + (html.match(/class=\"photo-credit\"/g)||[]).length);
console.assert(html.includes('href=\"../homepage.html\"'), 'missing link back to homepage');
console.assert(html.includes('href=\"../map-leaflet.html\"'), 'missing link to map');
console.log('OK gifu.html structure verified');
"
```

（`node --check`はHTMLファイルではなく埋め込みスクリプトの構文確認のため、次のように`<script>`部分を抽出してから実行する）

```bash
node -e "
const fs=require('fs');
const html=fs.readFileSync('prototype/guides/gifu.html','utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(s=>s.trim());
fs.writeFileSync('/tmp/gifu-extracted.js', scripts.join('\n\n'));
"
node --check /tmp/gifu-extracted.js && echo "SYNTAX OK"
```

Expected: `OK gifu.html structure verified` と `SYNTAX OK`、アサーションエラーなし。

- [ ] **Step 4: チェックポイント**

検証がパスしたら `git add scripts/generate-guide-page.js prototype/guides/gifu.html && git commit` でコミットし、次のタスクへ進む。

---

### Task 2: 熊本県ガイド生成

**Files:**
- Create: `prototype/guides/kumamoto.html`

**Interfaces:**
- Consumes: Task 1の`generateGuidePage(data)`

- [ ] **Step 1: データを定義し生成する**

```js
const fs = require('fs');
const path = require('path');
const { generateGuidePage } = require('./generate-guide-page.js');

const data = {
  slug: 'kumamoto',
  titleJa: '熊本県のアニメ聖地巡礼完全ガイド',
  titleEn: 'Kumamoto Prefecture Anime Pilgrimage Guide',
  metaDescJa: '『ONE PIECE』麦わらの一味の銅像や『夏目友人帳』ゆかりの地など、熊本県のアニメ聖地巡礼スポットを紹介。',
  metaDescEn: 'A guide to Kumamoto Prefecture\'s anime pilgrimage spots, including the "ONE PIECE" Straw Hat crew statues and locations linked to "Natsume\'s Book of Friends."',
  introJa: '熊本県には、2016年の熊本地震からの復興を願って設置された『ONE PIECE』麦わらの一味の銅像が、県内各地に点在しています。作者・尾田栄一郎氏の出身地であることにちなむこのプロジェクトは、県庁前のルフィ像を皮切りに、阿蘇や益城など被災地を巡る一種の「復興ロード」となっています。また球磨地方は『夏目友人帳』の舞台のモデルの一つとされ、のどかな田舎町の風景が広がります。',
  introEn: 'Kumamoto Prefecture is home to a series of bronze statues of the Straw Hat crew from "ONE PIECE," installed across the region as a symbol of recovery from the 2016 Kumamoto earthquakes — a tribute inspired by series creator Eiichiro Oda\'s hometown roots. Starting with the Luffy statue at the Prefectural Government building, the statues form a kind of recovery pilgrimage route through Aso, Mashiki, and beyond. The Kuma region is also considered a model for the rural setting of "Natsume\'s Book of Friends."',
  tipsJa: '像は熊本県内の広い範囲に点在しているため、車での移動が現実的です。全10体を1日で回るのは難しいので、エリアを絞って計画することをおすすめします。',
  tipsEn: 'The statues are spread across a wide area of Kumamoto, so travel by car is the most practical option. Visiting all ten statues in a single day is difficult, so we recommend planning around a specific area.',
  spots: [
    { id: 'kumamoto-luffy-statue', name_ja: 'ルフィ像', name_en: 'Luffy Statue', anime: 'ONE PIECE', desc_ja: '熊本地震からの復興を願い、熊本県庁プロムナードに設置された像。', desc_en: 'A statue on the Kumamoto Prefectural Government promenade, erected as a wish for recovery from the Kumamoto earthquake.', mapsQuery: 'ルフィ像 熊本県庁', photo: { url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Kumamoto_Prefectural_office_2022-6-4.jpg?width=400', author: 'Noukei314', license: 'CC BY-SA 4.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Kumamoto_Prefectural_office_2022-6-4.jpg' } },
    { id: 'onepiece-chopper-statue', name_ja: 'チョッパー像', name_en: 'Chopper Statue', anime: 'ONE PIECE', desc_ja: '熊本市動植物園の正面入口前に設置された麦わらの一味の像。', desc_en: 'A statue of the Straw Hat crew installed in front of the main entrance of Kumamoto City Zoo and Botanical Garden.', mapsQuery: 'チョッパー像 熊本市動植物園', photo: null },
    { id: 'onepiece-usopp-statue', name_ja: 'ウソップ像', name_en: 'Usopp Statue', anime: 'ONE PIECE', desc_ja: '熊本地震復興プロジェクトの一環で阿蘇駅前に設置された像。', desc_en: 'A statue installed in front of Aso Station as part of the Kumamoto earthquake recovery project.', mapsQuery: 'ウソップ像 阿蘇駅前', photo: null },
    { id: 'onepiece-franky-statue', name_ja: 'フランキー像', name_en: 'Franky Statue', anime: 'ONE PIECE', desc_ja: '高森町の高森駅前に設置された仲間の像。', desc_en: 'A statue of a crew member installed in front of Takamori Station in Takamori Town.', mapsQuery: 'フランキー像 高森駅', photo: null },
    { id: 'onepiece-sanji-statue', name_ja: 'サンジ像', name_en: 'Sanji Statue', anime: 'ONE PIECE', desc_ja: '益城町総合運動公園内に設置された像。', desc_en: 'A statue installed within Mashiki Town Sports Park.', mapsQuery: 'サンジ像 益城町総合運動公園', photo: null },
    { id: 'onepiece-brook-statue', name_ja: 'ブルック像', name_en: 'Brook Statue', anime: 'ONE PIECE', desc_ja: '御船町ふれあい広場（恐竜公園）に設置された像。', desc_en: 'A statue installed at Mifune Town Fureai Plaza (Dinosaur Park).', mapsQuery: 'ブルック像 御船町ふれあい広場', photo: null },
    { id: 'onepiece-zoro-statue', name_ja: 'ゾロ像', name_en: 'Zoro Statue', anime: 'ONE PIECE', desc_ja: '大津町中央公園に設置された像。', desc_en: 'A statue installed at Ozu Town Central Park.', mapsQuery: 'ゾロ像 大津中央公園', photo: null },
    { id: 'onepiece-nami-statue', name_ja: 'ナミ像', name_en: 'Nami Statue', anime: 'ONE PIECE', desc_ja: '西原村の俵山交流館萌の里内に設置された像。', desc_en: 'A statue installed at Tawarayama Exchange Center Moe no Sato in Nishihara Village.', mapsQuery: 'ナミ像 西原村 萌の里', photo: null },
    { id: 'onepiece-robin-statue', name_ja: 'ロビン像', name_en: 'Robin Statue', anime: 'ONE PIECE', desc_ja: '南阿蘇村の旧東海大学阿蘇キャンパス付近に設置された像。', desc_en: 'A statue installed near the former Tokai University Aso Campus in Minami-Aso Village.', mapsQuery: 'ロビン像 南阿蘇村', photo: null },
    { id: 'onepiece-jinbe-statue', name_ja: 'ジンベエ像', name_en: 'Jinbe Statue', anime: 'ONE PIECE', desc_ja: '宇土市住吉海岸公園に設置された、麦わらの一味の像。', desc_en: 'A statue of the Straw Hat crew installed at Sumiyoshi Coast Park in Uto City.', mapsQuery: 'ジンベエ像 住吉海岸公園', photo: null },
    { id: 'natsume-hitoyoshi', name_ja: '夏目友人帳のモデル地', name_en: 'Model Area for Natsume\'s Book of Friends', anime: '夏目友人帳', desc_ja: '人吉駅周辺など、作中の田舎町の風景のモデルとされるエリア。', desc_en: 'An area around Hitoyoshi Station and elsewhere, believed to be the model for the series\' rural town scenery.', mapsQuery: '人吉駅 夏目友人帳', photo: { url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Hitoyoshi_Station,_ekisha.jpg?width=400', author: 'Saigen Jiro', license: 'CC0 (Public Domain)', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Hitoyoshi_Station,_ekisha.jpg' } },
  ],
};

fs.writeFileSync(path.join(__dirname, '..', 'prototype', 'guides', 'kumamoto.html'), generateGuidePage(data));
console.log('wrote kumamoto.html');
```

- [ ] **Step 2: 検証する**

```bash
node -e "
const fs=require('fs');
const html=fs.readFileSync('prototype/guides/kumamoto.html','utf8');
console.assert(html.includes('<!DOCTYPE html>'), 'missing DOCTYPE');
console.assert((html.match(/class=\"spot-card\"/g)||[]).length === 22, 'expected 22 spot-card divs (11 spots x 2 languages), got ' + (html.match(/class=\"spot-card\"/g)||[]).length);
console.assert((html.match(/class=\"photo-credit\"/g)||[]).length === 6, 'expected 6 photo-credit blocks (2 spots with photo + 1 hero, x2 languages), got ' + (html.match(/class=\"photo-credit\"/g)||[]).length);
console.log('OK kumamoto.html structure verified');
"
node -e "
const fs=require('fs');
const html=fs.readFileSync('prototype/guides/kumamoto.html','utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(s=>s.trim());
fs.writeFileSync('/tmp/kumamoto-extracted.js', scripts.join('\n\n'));
"
node --check /tmp/kumamoto-extracted.js && echo "SYNTAX OK"
```

Expected: `OK kumamoto.html structure verified`、`SYNTAX OK`、アサーションエラーなし。

- [ ] **Step 3: チェックポイント**

コミットして次のタスクへ。

---

### Task 3: 茨城県ガイド生成

**Files:**
- Create: `prototype/guides/ibaraki.html`

**Interfaces:**
- Consumes: Task 1の`generateGuidePage(data)`

- [ ] **Step 1: データを定義し生成する**

```js
const fs = require('fs');
const path = require('path');
const { generateGuidePage } = require('./generate-guide-page.js');

const data = {
  slug: 'ibaraki',
  titleJa: '茨城県のアニメ聖地巡礼完全ガイド',
  titleEn: 'Ibaraki Prefecture Anime Pilgrimage Guide',
  metaDescJa: '『ガールズ&パンツァー』の舞台・大洗町を中心に、茨城県のアニメ聖地巡礼スポットを写真付きで紹介。',
  metaDescEn: 'A photo guide to anime pilgrimage spots in Ibaraki Prefecture, centered on Oarai, the setting for "Girls und Panzer."',
  introJa: '茨城県大洗町は、TVアニメ『ガールズ&パンツァー』の舞台として国内外のファンに広く知られる港町です。大洗磯前神社の鳥居や商店街に飾られた痛絵馬、大洗海岸など、作中の風景がそのまま残っており、聖地巡礼の定番エリアとなっています。少し足を延ばしたつくば市には、ポケモンのデザインマンホール「ポケふた」もあります。',
  introEn: 'Oarai, a port town in Ibaraki Prefecture, is widely known among fans at home and abroad as the setting for the TV anime "Girls und Panzer." The torii gate of Oarai Isosaki Shrine, fan-decorated votive plaques along the shopping street, and Oarai Beach all remain much as they appear in the series, making it a classic pilgrimage destination. A short trip away in Tsukuba, you can also find a Pokémon-themed manhole cover known as a "Poke Lid."',
  tipsJa: '大洗は東京から特急で日帰りも可能な距離です。商店街のお店では『ガールズ&パンツァー』とのコラボメニューやグッズも楽しめます。',
  tipsEn: 'Oarai is close enough to Tokyo for a day trip by limited express train. Many shops along the shopping street also offer "Girls und Panzer" collaboration menus and merchandise.',
  spots: [
    { id: 'girlspanzer-oarai-isosaki', name_ja: '大洗磯前神社', name_en: 'Oarai Isosaki Shrine', anime: 'ガールズ&パンツァー', desc_ja: '大洗の高台に立つ神社で、作中にたびたび登場する。', desc_en: 'A shrine on a hilltop in Oarai that appears repeatedly throughout the series.', mapsQuery: '大洗磯前神社', photo: { url: 'https://upload.wikimedia.org/wikipedia/commons/5/5b/%E5%A4%A7%E6%B4%97%E7%A3%AF%E5%89%8D%E7%A5%9E%E7%A4%BE_%E6%AD%A3%E9%9D%A2%E9%B3%A5%E5%B1%85.JPG', author: 'Saigen Jiro', license: 'Public Domain', sourceUrl: 'https://commons.wikimedia.org/wiki/File:%E5%A4%A7%E6%B4%97%E7%A3%AF%E5%89%8D%E7%A5%9E%E7%A4%BE_%E6%AD%A3%E9%9D%A2%E9%B3%A5%E5%B1%85.JPG' } },
    { id: 'girlspanzer-marine-tower', name_ja: '大洗マリンタワー', name_en: 'Oarai Marine Tower', anime: 'ガールズ&パンツァー', desc_ja: '大洗のランドマークタワーで、作中の背景にも登場。', desc_en: 'A landmark tower in Oarai that also appears as a backdrop in the series.', mapsQuery: '大洗マリンタワー', photo: { url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Oarai_Marine_Tower.jpg?width=400', author: 'TTTNIS', license: 'Public Domain', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Oarai_Marine_Tower.jpg' } },
    { id: 'girlspanzer-oarai-beach', name_ja: '大洗海岸', name_en: 'Oarai Beach', anime: 'ガールズ&パンツァー', desc_ja: '戦車道の練習や作中シーンの舞台となった海岸。', desc_en: 'A beach that served as the setting for tankery practice and other scenes in the series.', mapsQuery: '大洗サンビーチ', photo: { url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Sunrise_of_the_Pacific_Ocean_-_Oarai_coast.jpg?width=400', author: 't.kunikuni', license: 'CC BY-SA 2.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Sunrise_of_the_Pacific_Ocean_-_Oarai_coast.jpg' } },
    { id: 'girlspanzer-oarai-shopping', name_ja: '大洗の商店街一帯', name_en: 'Oarai Shopping Street Area', anime: 'ガールズ&パンツァー', desc_ja: '多くの痛絵馬やパネルが飾られる大洗の商店街エリア。', desc_en: 'A shopping area in Oarai decorated with many fan-made votive plaques and panels.', mapsQuery: '大洗 商店街', photo: null },
    { id: 'pokelid-tsukuba', name_ja: 'ポケふた つくば市の例', name_en: 'Poke Lid (Pokémon Manhole) in Tsukuba', anime: 'ポケットモンスター', desc_ja: 'つくばエキスポセンター前に設置されたポケモンマンホール「ポケふた」。', desc_en: 'A Pokémon manhole cover ("Poke Lid") installed in front of the Tsukuba Expo Center.', mapsQuery: 'ポケふた つくばエキスポセンター', photo: null },
  ],
};

fs.writeFileSync(path.join(__dirname, '..', 'prototype', 'guides', 'ibaraki.html'), generateGuidePage(data));
console.log('wrote ibaraki.html');
```

- [ ] **Step 2: 検証する**

```bash
node -e "
const fs=require('fs');
const html=fs.readFileSync('prototype/guides/ibaraki.html','utf8');
console.assert((html.match(/class=\"spot-card\"/g)||[]).length === 10, 'expected 10 spot-card divs (5 spots x 2 languages), got ' + (html.match(/class=\"spot-card\"/g)||[]).length);
console.assert((html.match(/class=\"photo-credit\"/g)||[]).length === 8, 'expected 8 photo-credit blocks (3 spots with photo + 1 hero, x2 languages), got ' + (html.match(/class=\"photo-credit\"/g)||[]).length);
console.log('OK ibaraki.html structure verified');
"
node -e "
const fs=require('fs');
const html=fs.readFileSync('prototype/guides/ibaraki.html','utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(s=>s.trim());
fs.writeFileSync('/tmp/ibaraki-extracted.js', scripts.join('\n\n'));
"
node --check /tmp/ibaraki-extracted.js && echo "SYNTAX OK"
```

- [ ] **Step 3: チェックポイント**

コミットして次のタスクへ。

---

### Task 4: 『君の名は。』ガイド生成

**Files:**
- Create: `prototype/guides/kiminonaha.html`

**Interfaces:**
- Consumes: Task 1の`generateGuidePage(data)`

- [ ] **Step 1: データを定義し生成する**

```js
const fs = require('fs');
const path = require('path');
const { generateGuidePage } = require('./generate-guide-page.js');

const data = {
  slug: 'kiminonaha',
  titleJa: '『君の名は。』聖地巡礼完全ガイド',
  titleEn: '"Your Name" Anime Pilgrimage Guide',
  metaDescJa: '映画『君の名は。』の舞台となった岐阜県飛騨市・東京都内の実在スポットを写真付きで紹介する聖地巡礼ガイド。',
  metaDescEn: 'A photo guide to the real-world locations in Hida City, Gifu and Tokyo that inspired the film "Your Name."',
  introJa: '新海誠監督の映画『君の名は。』は、岐阜県飛騨市の風景をモデルにした架空の町・糸守町を舞台に、東京と地方をつなぐ物語を描きました。飛騨古川駅や気多若宮神社など高山エリアの実在スポットに加え、東京都内では瀧たちが訪れるKITTE丸の内屋上庭園や、印象的な電話シーンの舞台となった信濃町の歩道橋も巡礼先として知られています。',
  introEn: 'Director Makoto Shinkai\'s film "Your Name" is set in the fictional town of Itomori, modeled on real locations in Hida City, Gifu Prefecture, weaving a story that connects Tokyo and rural Japan. Beyond real spots in the Takayama area, such as Hida-Furukawa Station and Keta Wakamiya Shrine, fans also visit Tokyo locations including the KITTE Marunouchi rooftop garden and the Shinanomachi pedestrian bridge, the setting for one of the film\'s most memorable scenes.',
  tipsJa: '岐阜エリアと東京エリアは離れているため、一度に回るには複数日の旅程がおすすめです。飛騨エリアはローカル線の本数が少ないため、事前に時刻表を確認しましょう。',
  tipsEn: 'Since the Gifu and Tokyo locations are far apart, we recommend planning a multi-day itinerary to visit both. Local trains in the Hida area run infrequently, so check the timetable in advance.',
  spots: [
    { id: 'kiminonaha-hidafurukawa-station', name_ja: '飛騨古川駅', name_en: 'Hida-Furukawa Station', anime: '君の名は。', desc_ja: '糸守町のモデルとなった飛騨市の玄関口となる駅。', desc_en: 'The gateway station to Hida City that inspired the fictional town of Itomori.', mapsQuery: '飛騨古川駅', photo: { url: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/View_of_Hida-Furukawa_Station.JPG', author: 'そらみみ', license: 'CC BY-SA 4.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:View_of_Hida-Furukawa_Station.JPG' } },
    { id: 'kiminonaha-keta-wakamiya-jinja', name_ja: '気多若宮神社', name_en: 'Keta Wakamiya Shrine', anime: '君の名は。', desc_ja: '作中の宮水神社の鳥居や境内のモデルとなった神社。', desc_en: 'The shrine that inspired the torii gate and grounds of Miyamizu Shrine in the film.', mapsQuery: '気多若宮神社', photo: { url: 'https://upload.wikimedia.org/wikipedia/commons/8/85/Keta_wakamiya.jpg', author: 'Opqr', license: 'CC BY-SA 4.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Keta_wakamiya.jpg' } },
    { id: 'kiminonaha-hie-jinja', name_ja: '飛騨山王宮 日枝神社', name_en: 'Hida Sanno-gu Hie Shrine', anime: '君の名は。', desc_ja: '劇中の階段や鳥居のシーンに関連するとされる高山の古社。', desc_en: 'An ancient shrine in Takayama said to be linked to the staircase and torii scenes in the film.', mapsQuery: '飛騨山王宮 日枝神社', photo: { url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Takayama-Hie-jinja_torii.jpeg?width=400', author: 'nnh', license: 'Public Domain', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Takayama-Hie-jinja_torii.jpeg' } },
    { id: 'kiminonaha-hida-library', name_ja: '飛騨市図書館', name_en: 'Hida City Library', anime: '君の名は。', desc_ja: '瀧たちが糸守町の記録を調べるシーンのモデルとなった図書館。', desc_en: 'The library that inspired the scene where Taki and friends research the town of Itomori.', mapsQuery: '飛騨市図書館', photo: { url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Hida_City_Library_exterior_ac_(1).jpg?width=400', author: 'Asturio Cantabrio', license: 'CC BY-SA 4.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Hida_City_Library_exterior_ac_(1).jpg' } },
    { id: 'kiminonaha-shinanomachi-hodokyo', name_ja: '信濃町歩道橋', name_en: 'Shinanomachi Pedestrian Bridge', anime: '君の名は。', desc_ja: '瀧が三葉に電話をかけようとする印象的なシーンの舞台。', desc_en: 'The setting for the memorable scene where Taki tries to call Mitsuha.', mapsQuery: '信濃町駅 歩道橋', photo: null },
    { id: 'kiminonaha-kitte-garden', name_ja: 'KITTE丸の内屋上庭園', name_en: 'KITTE Marunouchi Rooftop Garden', anime: '君の名は。', desc_ja: '東京駅を見下ろす屋上庭園で、瀧たちが訪れるシーンに登場。', desc_en: 'A rooftop garden overlooking Tokyo Station, which appears in a scene where Taki and friends visit.', mapsQuery: 'KITTE丸の内 屋上庭園', photo: { url: 'https://commons.wikimedia.org/wiki/Special:FilePath/JP-Tower-01.jpg?width=400', author: 'Rs1421', license: 'CC BY-SA 3.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:JP-Tower-01.jpg' } },
  ],
};

fs.writeFileSync(path.join(__dirname, '..', 'prototype', 'guides', 'kiminonaha.html'), generateGuidePage(data));
console.log('wrote kiminonaha.html');
```

- [ ] **Step 2: 検証する**

```bash
node -e "
const fs=require('fs');
const html=fs.readFileSync('prototype/guides/kiminonaha.html','utf8');
console.assert((html.match(/class=\"spot-card\"/g)||[]).length === 12, 'expected 12 spot-card divs (6 spots x 2 languages), got ' + (html.match(/class=\"spot-card\"/g)||[]).length);
console.assert((html.match(/class=\"photo-credit\"/g)||[]).length === 12, 'expected 12 photo-credit blocks (5 spots with photo + 1 hero, x2 languages), got ' + (html.match(/class=\"photo-credit\"/g)||[]).length);
console.log('OK kiminonaha.html structure verified');
"
node -e "
const fs=require('fs');
const html=fs.readFileSync('prototype/guides/kiminonaha.html','utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(s=>s.trim());
fs.writeFileSync('/tmp/kiminonaha-extracted.js', scripts.join('\n\n'));
"
node --check /tmp/kiminonaha-extracted.js && echo "SYNTAX OK"
```

- [ ] **Step 3: チェックポイント**

コミットして次のタスクへ。

---

### Task 5: 『鬼滅の刃』ガイド生成

**Files:**
- Create: `prototype/guides/kimetsu.html`

**Interfaces:**
- Consumes: Task 1の`generateGuidePage(data)`

- [ ] **Step 1: データを定義し生成する**

```js
const fs = require('fs');
const path = require('path');
const { generateGuidePage } = require('./generate-guide-page.js');

const data = {
  slug: 'kimetsu',
  titleJa: '『鬼滅の刃』聖地巡礼完全ガイド',
  titleEn: '"Demon Slayer" Anime Pilgrimage Guide',
  metaDescJa: '竈門炭治郎の名字ゆかりの神社など、『鬼滅の刃』の聖地とされる九州の神社を紹介するガイド。',
  metaDescEn: 'A guide to the Kyushu shrines associated with "Demon Slayer," including the shrine linked to Tanjiro Kamado\'s surname.',
  introJa: '『鬼滅の刃』の主人公・竈門炭治郎の名字は、福岡県の宝満宮竈門神社に由来するとされ、同神社は全国のファンが訪れる代表的な聖地となっています。九州には「竈門」の名を持つ神社が他にも複数あり、大分県の八幡竈門神社などもファンの間で聖地として知られています。',
  introEn: 'The surname of "Demon Slayer" protagonist Tanjiro Kamado is said to derive from Homangu Kamado Shrine in Fukuoka Prefecture, now one of the series\' best-known pilgrimage sites, drawing fans from across Japan. Kyushu is home to several shrines bearing the name "Kamado," including Hachiman Kamado Shrine in Oita Prefecture, also recognized among fans as a pilgrimage destination.',
  tipsJa: '宝満宮竈門神社は太宰府天満宮からも近く、あわせて参拝する観光客も多いです。神社は信仰の場でもあるため、マナーを守って参拝しましょう。',
  tipsEn: 'Homangu Kamado Shrine is close to Dazaifu Tenmangu Shrine, and many visitors combine the two. Please remember these are active places of worship, and visit respectfully.',
  spots: [
    { id: 'kimetsu-homan-kamado-jinja', name_ja: '宝満宮竈門神社', name_en: 'Homangu Kamado Shrine', anime: '鬼滅の刃', desc_ja: '「竈門」の名から炭治郎の名字のモデルとされ、ファンの聖地となっている神社。', desc_en: 'A shrine believed to have inspired protagonist Tanjiro\'s surname "Kamado," now a pilgrimage site for fans.', mapsQuery: '宝満宮竈門神社', photo: { url: 'https://commons.wikimedia.org/wiki/Special:FilePath/1st_torii_of_Kamado_Shrine.jpg?width=400', author: 'そらみみ', license: 'CC BY-SA 4.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:1st_torii_of_Kamado_Shrine.jpg' } },
    { id: 'kimetsu-mizoguchi-kamado-jinja', name_ja: '溝口竈門神社', name_en: 'Mizoguchi Kamado Shrine', anime: '鬼滅の刃', desc_ja: '耳飾りに似た紋様や竈門の名から聖地とされる神社。', desc_en: 'A shrine considered a pilgrimage site for its pattern resembling the characters\' earrings and its "Kamado" name.', mapsQuery: '溝口竈門神社', photo: null },
    { id: 'kimetsu-hachiman-kamado-jinja', name_ja: '八幡竈門神社', name_en: 'Hachiman Kamado Shrine', anime: '鬼滅の刃', desc_ja: '「竈門」の名を持ち、作品世界観との類似から聖地とされる神社。', desc_en: 'A shrine bearing the name "Kamado," considered a pilgrimage site for its resemblance to the series\' world.', mapsQuery: '八幡竈門神社', photo: null },
  ],
};

fs.writeFileSync(path.join(__dirname, '..', 'prototype', 'guides', 'kimetsu.html'), generateGuidePage(data));
console.log('wrote kimetsu.html');
```

- [ ] **Step 2: 検証する**

```bash
node -e "
const fs=require('fs');
const html=fs.readFileSync('prototype/guides/kimetsu.html','utf8');
console.assert((html.match(/class=\"spot-card\"/g)||[]).length === 6, 'expected 6 spot-card divs (3 spots x 2 languages), got ' + (html.match(/class=\"spot-card\"/g)||[]).length);
console.assert((html.match(/class=\"photo-credit\"/g)||[]).length === 4, 'expected 4 photo-credit blocks (1 spot with photo + 1 hero, x2 languages), got ' + (html.match(/class=\"photo-credit\"/g)||[]).length);
console.log('OK kimetsu.html structure verified');
"
node -e "
const fs=require('fs');
const html=fs.readFileSync('prototype/guides/kimetsu.html','utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(s=>s.trim());
fs.writeFileSync('/tmp/kimetsu-extracted.js', scripts.join('\n\n'));
"
node --check /tmp/kimetsu-extracted.js && echo "SYNTAX OK"
```

- [ ] **Step 3: チェックポイント**

コミットして次のタスクへ。

---

### Task 6: 『ゆるキャン△』ガイド生成

**Files:**
- Create: `prototype/guides/yurucamp.html`

**Interfaces:**
- Consumes: Task 1の`generateGuidePage(data)`

- [ ] **Step 1: データを定義し生成する**

```js
const fs = require('fs');
const path = require('path');
const { generateGuidePage } = require('./generate-guide-page.js');

const data = {
  slug: 'yurucamp',
  titleJa: '『ゆるキャン△』聖地巡礼完全ガイド',
  titleEn: '"Laid-Back Camp" Anime Pilgrimage Guide',
  metaDescJa: '山梨県・長野県の実在キャンプ場や絶景スポットなど、『ゆるキャン△』の聖地巡礼ガイド。',
  metaDescEn: 'A guide to the real campsites and scenic viewpoints in Yamanashi and Nagano featured in "Laid-Back Camp."',
  introJa: '『ゆるキャン△』は、山梨県・長野県のキャンプ場や絶景スポットを舞台に、少女たちのソロキャンプの魅力を描いた作品です。富士山を望む笛吹川フルーツ公園や高ボッチ高原、山上湖・四尾連湖畔の水明荘など、実際にキャンプや観光で訪れられるスポットばかりで、作品をきっかけにアウトドアに興味を持った海外ファンにも人気の巡礼先です。',
  introEn: '"Laid-Back Camp" depicts the appeal of solo camping through campsites and scenic spots across Yamanashi and Nagano Prefectures. From Fuefukigawa Fruit Park and Takabocchi Highland, both with views of Mt. Fuji, to Suimeiso Lodge beside the mountain lake Shibire, every location is a real place you can actually camp or visit — making it a popular pilgrimage for international fans who discovered the outdoors through the series.',
  tipsJa: '山間部のスポットが多いため、車での移動が便利です。標高が高いエリアもあるので、季節に応じた服装で訪れましょう。',
  tipsEn: 'Many of these spots are in mountainous areas, so traveling by car is convenient. Some locations are at higher elevations, so dress appropriately for the season.',
  spots: [
    { id: 'yurucamp-fuefukigawa-park', name_ja: '笛吹川フルーツ公園', name_en: 'Fuefukigawa Fruit Park', anime: 'ゆるキャン△', desc_ja: '夜景と富士山を望む展望スポットとして作中に登場する公園。', desc_en: 'A park that appears in the series as a viewpoint overlooking the night view and Mt. Fuji.', mapsQuery: '笛吹川フルーツ公園', photo: { url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Fuefukigawa_Fruits_Park,_Yamanashi,_Yamanashi,_Japan.jpg?width=400', author: 'っ', license: 'CC BY-SA 3.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Fuefukigawa_Fruits_Park,_Yamanashi,_Yamanashi,_Japan.jpg' } },
    { id: 'yurucamp-shibireko-suimeiso', name_ja: '四尾連湖 水明荘', name_en: 'Lake Shibire: Suimeiso Lodge', anime: 'ゆるキャン△', desc_ja: '山上湖・四尾連湖畔のキャンプ場として登場する宿。', desc_en: 'A lodge that appears in the series as a campsite beside the mountain lake, Lake Shibire.', mapsQuery: '四尾連湖 水明荘', photo: { url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Lake_Shibire.JPG?width=400', author: 'さかおり', license: 'CC BY-SA 3.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Lake_Shibire.JPG' } },
    { id: 'yurucamp-utsubuna-station', name_ja: '内船駅', name_en: 'Utsubuna Station', anime: 'ゆるキャン△', desc_ja: '身延線沿線のローカル駅として作中に描かれる。', desc_en: 'Depicted in the series as a local station along the Minobu Line.', mapsQuery: '内船駅', photo: { url: 'https://commons.wikimedia.org/wiki/Special:FilePath/JR_Central_Utsubuna_Station_building.jpg?width=400', author: 'Mister0124', license: 'CC BY-SA 4.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:JR_Central_Utsubuna_Station_building.jpg' } },
    { id: 'yurucamp-takabocchi-kogen', name_ja: '高ボッチ高原', name_en: 'Takabocchi Highland', anime: 'ゆるキャン△', desc_ja: '諏訪湖と富士山を一望できる、志摩リンたちが訪れる高原。', desc_en: 'A highland offering views of Lake Suwa and Mt. Fuji, visited by Rin Shima and friends in the series.', mapsQuery: '高ボッチ高原', photo: { url: 'https://commons.wikimedia.org/wiki/Special:FilePath/View_from_Takabocchi_early_in_the_morning.jpg?width=400', author: 'TAKAO Tsushima', license: 'CC BY 4.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:View_from_Takabocchi_early_in_the_morning.jpg' } },
  ],
};

fs.writeFileSync(path.join(__dirname, '..', 'prototype', 'guides', 'yurucamp.html'), generateGuidePage(data));
console.log('wrote yurucamp.html');
```

- [ ] **Step 2: 検証する**

```bash
node -e "
const fs=require('fs');
const html=fs.readFileSync('prototype/guides/yurucamp.html','utf8');
console.assert((html.match(/class=\"spot-card\"/g)||[]).length === 8, 'expected 8 spot-card divs (4 spots x 2 languages), got ' + (html.match(/class=\"spot-card\"/g)||[]).length);
console.assert((html.match(/class=\"photo-credit\"/g)||[]).length === 10, 'expected 10 photo-credit blocks (4 spots with photo + 1 hero, x2 languages), got ' + (html.match(/class=\"photo-credit\"/g)||[]).length);
console.log('OK yurucamp.html structure verified');
"
node -e "
const fs=require('fs');
const html=fs.readFileSync('prototype/guides/yurucamp.html','utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(s=>s.trim());
fs.writeFileSync('/tmp/yurucamp-extracted.js', scripts.join('\n\n'));
"
node --check /tmp/yurucamp-extracted.js && echo "SYNTAX OK"
```

- [ ] **Step 3: チェックポイント**

コミットして次のタスクへ。

---

### Task 7: サイト内リンク統合（ホームページ・サイトマップ）

**Files:**
- Modify: `prototype/homepage.html`
- Modify: `sitemap.xml`

**Interfaces:**
- Consumes: なし（静的リンクの追加のみ）

- [ ] **Step 1: `prototype/homepage.html`のフッターにガイド一覧リンクを追加する**

`homepage.html`内の既存フッター（`<a data-i18n="privacyLink" href="privacy.html">`を含む要素）の直前に、以下のガイド一覧ブロックを追記する:

```html
<div id="guide-links">
  <p data-i18n="guidesHeading">エリア・作品別ガイド</p>
  <ul>
    <li><a href="guides/gifu.html">Gifu</a></li>
    <li><a href="guides/kumamoto.html">Kumamoto</a></li>
    <li><a href="guides/ibaraki.html">Ibaraki</a></li>
    <li><a href="guides/kiminonaha.html">Your Name</a></li>
    <li><a href="guides/kimetsu.html">Demon Slayer</a></li>
    <li><a href="guides/yurucamp.html">Laid-Back Camp</a></li>
  </ul>
</div>
```

`I18N`オブジェクトの全6言語ブロックに`guidesHeading`キーを追加する（値は各言語で「エリア・作品別ガイド」に相当する訳語。日本語:"エリア・作品別ガイド"、英語:"Guides by Area & Anime"、繁体字中国語:"依地區與作品分類的指南"、韓国語:"지역·작품별 가이드"、タイ語:"คู่มือแยกตามพื้นที่และผลงาน"、フランス語:"Guides par région et par anime"）。

CSSを`</style>`直前に追記:

```css
  #guide-links{max-width:1100px; margin:0 auto; padding:0 24px 24px; text-align:center;}
  #guide-links p{font-weight:700; color:var(--color-navy); margin:0 0 10px 0; font-size:14px;}
  #guide-links ul{list-style:none; padding:0; margin:0; display:flex; flex-wrap:wrap; justify-content:center; gap:10px 18px;}
  #guide-links a{font-size:13px; text-decoration:none; color:var(--color-navy); opacity:0.8;}
  #guide-links a:hover{opacity:1; text-decoration:underline;}
```

- [ ] **Step 2: `sitemap.xml`に6件のURLを追加する**

`sitemap.xml`の既存3件（homepage.html, map-leaflet.html, privacy.html）の`<url>`要素と同じ形式で、以下6件を追加する（`<lastmod>`は本タスク実施日、`<changefreq>`・`<priority>`は既存のガイド以外ページと同じ値を踏襲）:

```xml
  <url>
    <loc>https://aopro0306-boop.github.io/anime-pilgrimage/prototype/guides/gifu.html</loc>
    <lastmod>2026-08-10</lastmod>
  </url>
  <url>
    <loc>https://aopro0306-boop.github.io/anime-pilgrimage/prototype/guides/kumamoto.html</loc>
    <lastmod>2026-08-10</lastmod>
  </url>
  <url>
    <loc>https://aopro0306-boop.github.io/anime-pilgrimage/prototype/guides/ibaraki.html</loc>
    <lastmod>2026-08-10</lastmod>
  </url>
  <url>
    <loc>https://aopro0306-boop.github.io/anime-pilgrimage/prototype/guides/kiminonaha.html</loc>
    <lastmod>2026-08-10</lastmod>
  </url>
  <url>
    <loc>https://aopro0306-boop.github.io/anime-pilgrimage/prototype/guides/kimetsu.html</loc>
    <lastmod>2026-08-10</lastmod>
  </url>
  <url>
    <loc>https://aopro0306-boop.github.io/anime-pilgrimage/prototype/guides/yurucamp.html</loc>
    <lastmod>2026-08-10</lastmod>
  </url>
```

（既存ファイルの`<url>`要素の正確なタグ構成は`sitemap.xml`を直接読んで確認し、それに揃える。）

- [ ] **Step 3: 検証する**

```bash
node -e "
const fs=require('fs');
const html=fs.readFileSync('prototype/homepage.html','utf8');
console.assert(html.includes('guides/gifu.html'), 'missing gifu guide link');
console.assert(html.includes('guides/kumamoto.html'), 'missing kumamoto guide link');
console.assert(html.includes('guides/ibaraki.html'), 'missing ibaraki guide link');
console.assert(html.includes('guides/kiminonaha.html'), 'missing kiminonaha guide link');
console.assert(html.includes('guides/kimetsu.html'), 'missing kimetsu guide link');
console.assert(html.includes('guides/yurucamp.html'), 'missing yurucamp guide link');
console.assert(html.includes('data-i18n=\"guidesHeading\"'), 'missing guidesHeading data-i18n hook');
const sitemap=fs.readFileSync('sitemap.xml','utf8');
const urlCount=(sitemap.match(/<loc>/g)||[]).length;
console.assert(urlCount===9, 'expected 9 URLs in sitemap.xml (3 existing + 6 guides), got '+urlCount);
console.log('OK Task 7 verified,', urlCount, 'sitemap URLs');
"
```

Expected: `OK Task 7 verified, 9 sitemap URLs`、アサーションエラーなし。

- [ ] **Step 4: チェックポイント**

コミットして次のタスクへ。

---

### Task 8: 全ページ最終検証（ヘッドレスChrome）

**Files:**
- Modify: なし（検証のみ）

- [ ] **Step 1: 6ページ全てでコンソールエラーがないことを確認する**

```bash
for f in gifu kumamoto ibaraki kiminonaha kimetsu yurucamp; do
  FILE_URL="file:///$(cygpath -m "$(pwd)/prototype/guides/$f.html")"
  "C:/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --dump-dom --virtual-time-budget=8000 --enable-logging=stderr --v=1 "$FILE_URL" > /tmp/dump-$f.html 2> /tmp/log-$f.txt
  echo "=== $f ==="
  grep -Ei "Uncaught|SyntaxError|TypeError|ReferenceError" /tmp/log-$f.txt || echo "NO JS ERRORS FOUND"
done
```

- [ ] **Step 2: 更新後の`homepage.html`もコンソールエラーがないことを確認する**

```bash
FILE_URL="file:///$(cygpath -m "$(pwd)/prototype/homepage.html")"
"C:/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --dump-dom --virtual-time-budget=8000 --enable-logging=stderr --v=1 "$FILE_URL" > /tmp/dump-homepage.html 2> /tmp/log-homepage.txt
grep -Ei "Uncaught|SyntaxError|TypeError|ReferenceError" /tmp/log-homepage.txt || echo "NO JS ERRORS FOUND"
```

- [ ] **Step 3: 全写真URLがHTTP 200であることを再確認する（既存の検証済みURLの再利用のため、リンク切れがないことのみ確認）**

```bash
for url in \
  "https://upload.wikimedia.org/wikipedia/commons/c/c5/View_of_Hida-Furukawa_Station.JPG" \
  "https://upload.wikimedia.org/wikipedia/commons/8/85/Keta_wakamiya.jpg" \
  "https://commons.wikimedia.org/wiki/Special:FilePath/Takayama-Hie-jinja_torii.jpeg?width=400" \
  "https://commons.wikimedia.org/wiki/Special:FilePath/Hida_City_Library_exterior_ac_(1).jpg?width=400" \
  "https://commons.wikimedia.org/wiki/Special:FilePath/Kajibashi_Bridge_from_west_side_20150123.JPG?width=400" \
  "https://commons.wikimedia.org/wiki/Special:FilePath/Yayoibashi_Bridge_from_Miyamaebashi_Bridge_in_front_of_Sakurayama_Hachiman_Shrine.JPG?width=400" \
  "https://commons.wikimedia.org/wiki/Special:FilePath/Hommachi_Street_Shopping_Area_in_Takayama_at_dusk_20150123.JPG?width=400" \
  "https://commons.wikimedia.org/wiki/Special:FilePath/Kumamoto_Prefectural_office_2022-6-4.jpg?width=400" \
  "https://commons.wikimedia.org/wiki/Special:FilePath/Hitoyoshi_Station,_ekisha.jpg?width=400" \
  "https://upload.wikimedia.org/wikipedia/commons/5/5b/%E5%A4%A7%E6%B4%97%E7%A3%AF%E5%89%8D%E7%A5%9E%E7%A4%BE_%E6%AD%A3%E9%9D%A2%E9%B3%A5%E5%B1%85.JPG" \
  "https://commons.wikimedia.org/wiki/Special:FilePath/Oarai_Marine_Tower.jpg?width=400" \
  "https://commons.wikimedia.org/wiki/Special:FilePath/Sunrise_of_the_Pacific_Ocean_-_Oarai_coast.jpg?width=400" \
  "https://commons.wikimedia.org/wiki/Special:FilePath/JP-Tower-01.jpg?width=400" \
  "https://commons.wikimedia.org/wiki/Special:FilePath/1st_torii_of_Kamado_Shrine.jpg?width=400" \
  "https://commons.wikimedia.org/wiki/Special:FilePath/Fuefukigawa_Fruits_Park,_Yamanashi,_Yamanashi,_Japan.jpg?width=400" \
  "https://commons.wikimedia.org/wiki/Special:FilePath/Lake_Shibire.JPG?width=400" \
  "https://commons.wikimedia.org/wiki/Special:FilePath/JR_Central_Utsubuna_Station_building.jpg?width=400" \
  "https://commons.wikimedia.org/wiki/Special:FilePath/View_from_Takabocchi_early_in_the_morning.jpg?width=400" ; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -L --max-time 10 -A "Mozilla/5.0" "$url")
  echo "$code  $url"
done
```

Expected: 全て`200`。

- [ ] **Step 4: 最終チェックポイント**

全て緑になったら、ユーザーに完了報告のうえコミット・プッシュする。
