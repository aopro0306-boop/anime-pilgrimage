# アニメ聖地巡礼アプリ Web版ホームページ（LP） Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 単一HTMLファイル `prototype/homepage.html` として、sankoudesign.com系の旅行LPを参考にした日英バイリンガルのホームページを新規作成し、`map-leaflet.html` への入り口ページとする。

**Architecture:** 単一HTMLファイルにインラインCSS/JSを持たせ、ヘッダー・ヒーロー・コンセプト・特徴カード・写真ギャラリー・クロージングCTA・フッターの各セクションを積み上げる。ギャラリー写真6件のデータは `map-leaflet.html` の `SPOTS`/`PHOTOS` から該当分のみを独立コピーとして埋め込む（共通データファイル化はしない）。多言語対応は `data-i18n` 属性 + `I18N` 辞書オブジェクト + 汎用の `applyLanguage()` 関数による文言差し替え方式で実装する。

**Tech Stack:** 素のHTML/CSS/JavaScript（外部JSライブラリなし）。Google Fonts CDN（Shippori Mincho, Fraunces, Zen Kaku Gothic New）。検証にNode.js（`node --check`、`node -e` アサーション）とヘッドレスChrome（実行時コンソールエラー検出用）を使用。

## Global Constraints

- 成果物は `prototype/homepage.html`。`map-leaflet.html` と同様、Artifactとしては公開しないローカルの通常Webページ（`<!DOCTYPE html>` を含む通常のHTML文書構造）。
- 配色トークン（[design/2026-08-08-homepage-design.md](2026-08-08-homepage-design.md) §6）: 背景 `#F6F0E4`、ネイビー `#1D3550`、テラコッタ `#B5673A`、モスグリーン `#5C7A5E`、文字色 `#2B2621`。
- タイポグラフィ: 見出し（日本語）`Shippori Mincho`、見出し（英語）`Fraunces`、本文（日英共通）`Zen Kaku Gothic New`。すべてGoogle Fonts CDN経由で読み込む。
- 言語はJA（デフォルト）/ENの2言語のみ。`map-leaflet.html` の6言語対応とは独立した実装。
- スポット名・作品名は翻訳しない（`map-leaflet.html` の既存方針を踏襲し、UI言語に関わらず常に日本語表記のまま）。
- ギャラリー写真6件（下記Task 3で使用）・ヒーロー背景写真（Task 1で使用）のURL・author・license・sourceUrlは、`map-leaflet.html` の `SPOTS`/`PHOTOS` から抽出した正確な値をそのまま使う。新規の写真取得・ライセンス調査はしない。
- 「マップを見る」CTAボタンは `href="map-leaflet.html"`（同じ `prototype/` フォルダ内の既存ファイルへの相対パス）。
- 検証は各タスクで次の3点を必ず行う: ①`node --check` による構文チェック、②`node -e` によるデータ・構造アサーション、③最終タスク（Task 6）でのヘッドレスChrome（`C:/Program Files/Google/Chrome/Application/chrome.exe`）による実行時コンソールエラーチェック。`map-leaflet.html` で実際に発生した「構文チェックだけでは検出できないランタイムエラー（`maxZoom`未設定によるクラッシュ）」の再発防止のため、③は省略しない。

---

## File Structure

- `prototype/homepage.html` — 唯一の成果物。Task 1〜6で段階的に追記・編集する。

---

### Task 1: 骨格・ヘッダー・ヒーロー

**Files:**
- Create: `prototype/homepage.html`

**Interfaces:**
- Produces:
  - CSS変数（`--color-bg`, `--color-navy`, `--color-terracotta`, `--color-moss`, `--color-text`）
  - `.heading` クラス（`html[lang]` に応じて見出しフォントを切り替える仕組み）
  - `#site-header`, `#hero`, `#hero-title`（`data-i18n="heroTitle"`）, ヒーローCTA（`data-i18n="heroCta"`）
  - `#lang-toggle` ボタン（Task 5でJSを配線するが、この時点ではまだクリックしても何も起きない）
  - 後続タスクはこのファイルの `<head>`/`<style>`/`<body>` にセクションを追記していく。

- [ ] **Step 1: `prototype/homepage.html` を新規作成する**

```html
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>アニメ聖地巡礼 | Anime Pilgrimage Japan</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@400;600;800&family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  :root{
    --color-bg: #F6F0E4;
    --color-navy: #1D3550;
    --color-terracotta: #B5673A;
    --color-moss: #5C7A5E;
    --color-text: #2B2621;
  }
  *{box-sizing:border-box;}
  html,body{margin:0;padding:0;}
  body{font-family:'Zen Kaku Gothic New', sans-serif; background:var(--color-bg); color:var(--color-text); line-height:1.7;}
  .heading{font-weight:600; text-wrap:balance;}
  html[lang="ja"] .heading{font-family:'Shippori Mincho', serif;}
  html[lang="en"] .heading{font-family:'Fraunces', serif;}
  a{color:inherit;}

  #site-header{position:sticky; top:0; z-index:50; background:rgba(246,240,228,0.92); backdrop-filter:blur(4px); border-bottom:1px solid rgba(29,53,80,0.12);}
  .header-inner{max-width:1100px; margin:0 auto; padding:14px 24px; display:flex; align-items:center; justify-content:space-between;}
  .logo{font-weight:700; color:var(--color-navy); letter-spacing:0.02em;}
  #lang-toggle{background:transparent; border:1px solid var(--color-navy); color:var(--color-navy); border-radius:999px; padding:6px 16px; font-size:13px; cursor:pointer;}
  #lang-toggle:hover{background:var(--color-navy); color:var(--color-bg);}

  #hero{position:relative; min-height:88vh; display:flex; align-items:center; justify-content:center; background-size:cover; background-position:center; background-image:linear-gradient(180deg, rgba(29,53,80,0.35), rgba(29,53,80,0.55)), url('https://upload.wikimedia.org/wikipedia/commons/8/83/D%C5%8Dgo_Onsen.jpg');}
  .hero-inner{text-align:center; color:#F6F0E4; padding:0 24px; max-width:720px;}
  #hero-title{font-size:clamp(28px,5vw,52px); margin:0 0 28px 0; color:#F6F0E4;}
  .cta-button{display:inline-block; background:var(--color-terracotta); color:#F6F0E4; text-decoration:none; padding:14px 36px; border-radius:999px; font-weight:700; font-size:15px; letter-spacing:0.02em; transition:transform 0.15s ease, box-shadow 0.15s ease;}
  .cta-button:hover{transform:translateY(-2px); box-shadow:0 8px 20px rgba(0,0,0,0.25);}
</style>
</head>
<body>
<header id="site-header">
  <div class="header-inner">
    <span class="logo">Anime Pilgrimage Japan</span>
    <button id="lang-toggle" type="button">EN</button>
  </div>
</header>

<section id="hero">
  <div class="hero-inner">
    <h1 id="hero-title" class="heading" data-i18n="heroTitle">アニメの世界を、実際に歩く。</h1>
    <a class="cta-button" data-i18n="heroCta" href="map-leaflet.html">マップを見る</a>
  </div>
</section>

</body>
</html>
```

- [ ] **Step 2: 検証する**

```bash
node -e "
const fs=require('fs');
const html=fs.readFileSync('prototype/homepage.html','utf8');
console.assert(html.includes('<!DOCTYPE html>'), 'missing DOCTYPE (this is a normal webpage, not an Artifact)');
console.assert(html.includes('fonts.googleapis.com/css2?family=Shippori+Mincho'), 'missing Shippori Mincho font link');
console.assert(html.includes('family=Fraunces'), 'missing Fraunces font link');
console.assert(html.includes('family=Zen+Kaku+Gothic+New'), 'missing Zen Kaku Gothic New font link');
console.assert(html.includes('--color-bg: #F6F0E4'), 'background color token missing/wrong');
console.assert(html.includes('--color-navy: #1D3550'), 'navy color token missing/wrong');
console.assert(html.includes('--color-terracotta: #B5673A'), 'terracotta color token missing/wrong');
console.assert(html.includes('D%C5%8Dgo_Onsen.jpg'), 'missing Dogo Onsen hero background photo URL');
console.assert(html.includes('data-i18n=\"heroTitle\"'), 'missing hero title data-i18n hook');
console.assert(html.includes('data-i18n=\"heroCta\"'), 'missing hero CTA data-i18n hook');
console.assert(html.includes('href=\"map-leaflet.html\"'), 'hero CTA must link to map-leaflet.html');
console.assert(html.includes('id=\"lang-toggle\"'), 'missing lang-toggle button');
console.log('OK Task 1 structure present');
"
```

Expected: `OK Task 1 structure present`, no assertion errors.

- [ ] **Step 3: チェックポイント**

検証がパスしたら `git add prototype/homepage.html && git commit` でコミットし、次のタスクへ進む。

---

### Task 2: コンセプト文＋特徴カード

**Files:**
- Modify: `prototype/homepage.html`

**Interfaces:**
- Consumes: なし（静的セクションの追加のみ）
- Produces:
  - `#concept`（`data-i18n="conceptText"`）
  - `#features` 内に4枚の `.feature-card`（`data-i18n="feature1Title"`〜`feature4Body"`）
  - 後続タスク（Task 5）がこれら `data-i18n` 属性を持つ要素をまとめて多言語化する。

- [ ] **Step 1: セクション用CSSを `</style>` の直前に追記する**

```css
  #concept{max-width:640px; margin:0 auto; padding:88px 24px; text-align:center; font-size:18px;}

  #features{max-width:1100px; margin:0 auto; padding:0 24px 88px; display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:28px;}
  .feature-card{background:#fff; border-radius:16px; padding:28px 24px; box-shadow:0 4px 16px rgba(29,53,80,0.08);}
  .feature-card h3{margin:0 0 10px 0; font-size:18px; color:var(--color-navy);}
  .feature-card p{margin:0; font-size:14px; color:var(--color-text); opacity:0.85;}
```

- [ ] **Step 2: `#hero` セクションの直後、`</body>` の前に追記する**

```html
<section id="concept">
  <p data-i18n="conceptText">アニメに描かれたあの景色は、日本のどこかに実在する。世界中のファンを、その本物の舞台へ。</p>
</section>

<section id="features">
  <div class="feature-card">
    <h3 class="heading" data-i18n="feature1Title">実地図で探す</h3>
    <p data-i18n="feature1Body">正確な位置情報を、実際の地図上のピンで確認できます。</p>
  </div>
  <div class="feature-card">
    <h3 class="heading" data-i18n="feature2Title">作品名で検索</h3>
    <p data-i18n="feature2Body">作品名を検索すると、その作品のスポットにまとめてジャンプします。</p>
  </div>
  <div class="feature-card">
    <h3 class="heading" data-i18n="feature3Title">多言語対応</h3>
    <p data-i18n="feature3Body">英語・繁体字中国語・韓国語・タイ語・フランス語に対応しています。</p>
  </div>
  <div class="feature-card">
    <h3 class="heading" data-i18n="feature4Title">出典明記の安心写真</h3>
    <p data-i18n="feature4Body">掲載写真はすべてライセンスを確認済みで、出典を明記しています。</p>
  </div>
</section>
```

- [ ] **Step 3: 検証する**

```bash
node -e "
const fs=require('fs');
const html=fs.readFileSync('prototype/homepage.html','utf8');
console.assert(html.includes('id=\"concept\"'), 'missing #concept section');
console.assert(html.includes('data-i18n=\"conceptText\"'), 'missing conceptText data-i18n hook');
const featureCardCount=(html.match(/class=\"feature-card\"/g)||[]).length;
console.assert(featureCardCount===4, 'expected 4 feature cards, got '+featureCardCount);
for (const n of [1,2,3,4]) {
  console.assert(html.includes('data-i18n=\"feature'+n+'Title\"'), 'missing feature'+n+'Title hook');
  console.assert(html.includes('data-i18n=\"feature'+n+'Body\"'), 'missing feature'+n+'Body hook');
}
console.log('OK Task 2 structure present:', featureCardCount, 'feature cards');
"
```

Expected: `OK Task 2 structure present: 4 feature cards`, no assertion errors.

- [ ] **Step 4: チェックポイント**

検証がパスしたらコミットし、次のタスクへ進む。

---

### Task 3: 写真ギャラリー

**Files:**
- Modify: `prototype/homepage.html`

**Interfaces:**
- Consumes: なし
- Produces:
  - `const GALLERY_SPOTS = [...]`（6件、id/name/anime/photo{url,author,license,sourceUrl}）
  - `function buildGallery(): void`（`#gallery-grid` にDOMを描画）
  - この時点でファイルに初めて `<script>` タグが追加される。後続タスク（Task 5）は同じ `<script>` タグ内にコードを追記していく。

- [ ] **Step 1: セクション用CSSを `</style>` の直前に追記する**

```css
  #gallery{max-width:1100px; margin:0 auto; padding:0 24px 88px;}
  #gallery h2{text-align:center; margin:0 0 40px 0; font-size:clamp(22px,3vw,32px); color:var(--color-navy);}
  .gallery-grid{display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:24px;}
  .gallery-item{border-radius:16px; overflow:hidden; background:#fff; box-shadow:0 4px 16px rgba(29,53,80,0.08);}
  .gallery-item img{width:100%; height:220px; object-fit:cover; display:block;}
  .gallery-caption{padding:14px 16px;}
  .gallery-caption .spot-name{font-weight:700; color:var(--color-navy); font-size:14px;}
  .gallery-caption .photo-credit{margin-top:6px; font-size:11px; color:var(--color-text); opacity:0.6;}
  .gallery-caption .photo-credit a{color:inherit;}
```

- [ ] **Step 2: `#features` セクションの直後、`</body>` の前に追記する**

```html
<section id="gallery">
  <h2 class="heading" data-i18n="galleryHeading">スポットの一例</h2>
  <div class="gallery-grid" id="gallery-grid"></div>
</section>
```

- [ ] **Step 3: `</body>` の直前に `<script>` ブロックを追記する**

```html
<script>
const GALLERY_SPOTS = [
  {
    id: "kamakura-slamdunk-crossing",
    name: "鎌倉高校前駅1号踏切",
    anime: "SLAM DUNK",
    photo: {
      url: "https://upload.wikimedia.org/wikipedia/commons/0/0b/Kamakura_koukou_mae_Fumikiri.jpg",
      author: "Quercus acuta",
      license: "CC BY-SA 4.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Kamakura_koukou_mae_Fumikiri.jpg"
    }
  },
  {
    id: "kiminonaha-hidafurukawa-station",
    name: "飛騨古川駅",
    anime: "君の名は。",
    photo: {
      url: "https://upload.wikimedia.org/wikipedia/commons/c/c5/View_of_Hida-Furukawa_Station.JPG",
      author: "そらみみ",
      license: "CC BY-SA 4.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:View_of_Hida-Furukawa_Station.JPG"
    }
  },
  {
    id: "keion-toyosato-school",
    name: "豊郷小学校旧校舎群",
    anime: "けいおん!",
    photo: {
      url: "https://commons.wikimedia.org/wiki/Special:FilePath/%E8%B1%8A%E9%83%B7%E5%B0%8F%E5%AD%A6%E6%A0%A1%E6%97%A7%E6%A0%A1%E8%88%8E.jpg?width=400",
      author: "オクノサンライズ",
      license: "CC BY-SA 4.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:%E8%B1%8A%E9%83%B7%E5%B0%8F%E5%AD%A6%E6%A0%A1%E6%97%A7%E6%A0%A1%E8%88%8E.jpg"
    }
  },
  {
    id: "girlspanzer-oarai-isosaki",
    name: "大洗磯前神社",
    anime: "ガールズ&パンツァー",
    photo: {
      url: "https://upload.wikimedia.org/wikipedia/commons/5/5b/%E5%A4%A7%E6%B4%97%E7%A3%AF%E5%89%8D%E7%A5%9E%E7%A4%BE_%E6%AD%A3%E9%9D%A2%E9%B3%A5%E5%B1%85.JPG",
      author: "Saigen Jiro",
      license: "Public Domain",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:%E5%A4%A7%E6%B4%97%E7%A3%AF%E5%89%8D%E7%A5%9E%E7%A4%BE_%E6%AD%A3%E9%9D%A2%E9%B3%A5%E5%B1%85.JPG"
    }
  },
  {
    id: "washinomiya-jinja",
    name: "鷲宮神社",
    anime: "らき☆すた",
    photo: {
      url: "https://upload.wikimedia.org/wikipedia/commons/3/38/Washinomiya-Shrine-Washimiya-Saitama-Japan.jpg",
      author: "LERK",
      license: "CC BY-SA 3.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Washinomiya-Shrine-Washimiya-Saitama-Japan.jpg"
    }
  },
  {
    id: "mizuki-shigeru-road",
    name: "水木しげるロード",
    anime: "ゲゲゲの鬼太郎",
    photo: {
      url: "https://upload.wikimedia.org/wikipedia/commons/a/a1/Mizuki_shigeru_road_%2C_%E6%B0%B4%E6%9C%A8%E3%81%97%E3%81%92%E3%82%8B%E3%83%AD%E3%83%BC%E3%83%89_-_panoramio.jpg",
      author: "z tanuki",
      license: "CC BY 3.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Mizuki_shigeru_road_,_%E6%B0%B4%E6%9C%A8%E3%81%97%E3%81%92%E3%82%8B%E3%83%AD%E3%83%BC%E3%83%89_-_panoramio.jpg"
    }
  }
];

function buildGallery() {
  const container = document.getElementById('gallery-grid');
  container.innerHTML = GALLERY_SPOTS.map(spot => `
    <div class="gallery-item">
      <img src="${spot.photo.url}" alt="${spot.name}" loading="lazy">
      <div class="gallery-caption">
        <div class="spot-name">${spot.name}（${spot.anime}）</div>
        <p class="photo-credit">Photo: <a href="${spot.photo.sourceUrl}" target="_blank" rel="noopener">${spot.photo.author}</a> / ${spot.photo.license} (Wikimedia Commons)</p>
      </div>
    </div>
  `).join('');
}

buildGallery();
</script>
```

- [ ] **Step 4: 検証する**

```bash
node -e "
const fs=require('fs');
const html=fs.readFileSync('prototype/homepage.html','utf8');
const m=html.match(/const GALLERY_SPOTS = (\[[\s\S]*?\]);/);
console.assert(!!m, 'GALLERY_SPOTS not found');
const spots=eval(m[1]);
console.assert(spots.length===6, 'expected 6 gallery spots, got '+spots.length);
const expectedIds=['kamakura-slamdunk-crossing','kiminonaha-hidafurukawa-station','keion-toyosato-school','girlspanzer-oarai-isosaki','washinomiya-jinja','mizuki-shigeru-road'];
const actualIds=spots.map(s=>s.id).sort();
console.assert(JSON.stringify(actualIds)===JSON.stringify([...expectedIds].sort()), 'gallery spot ids mismatch: '+actualIds.join(','));
for (const s of spots) {
  console.assert(typeof s.name==='string' && s.name.length>0, s.id+' missing name');
  console.assert(typeof s.anime==='string' && s.anime.length>0, s.id+' missing anime');
  console.assert(s.photo && s.photo.url && s.photo.author && s.photo.license && s.photo.sourceUrl, s.id+' missing photo fields');
}
console.log('OK Task 3 data present:', spots.length, 'gallery spots');
"
node -e "
const fs=require('fs');
const html=fs.readFileSync('prototype/homepage.html','utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
fs.writeFileSync('_extracted_t3.js', scripts.filter(s=>s.trim()).join('\n'));
"
node --check _extracted_t3.js && echo "SYNTAX OK"
rm _extracted_t3.js
```

Expected: `OK Task 3 data present: 6 gallery spots` and `SYNTAX OK`, no assertion errors.

- [ ] **Step 5: チェックポイント**

検証がパスしたらコミットし、次のタスクへ進む。

---

### Task 4: クロージングCTA・フッター

**Files:**
- Modify: `prototype/homepage.html`

**Interfaces:**
- Consumes: なし
- Produces: `#closing`（`data-i18n="closingHeading"`、2つ目のCTAボタン `data-i18n="heroCta"`）、`<footer>`（`data-i18n="footerCredit"`）

- [ ] **Step 1: セクション用CSSを `</style>` の直前に追記する**

```css
  #closing{background:var(--color-navy); color:#F6F0E4; text-align:center; padding:88px 24px;}
  #closing h2{margin:0 0 28px 0; color:#F6F0E4;}

  footer{max-width:1100px; margin:0 auto; padding:32px 24px; font-size:12px; color:var(--color-text); opacity:0.6; text-align:center;}
```

- [ ] **Step 2: `#gallery` セクションの直後、`<script>` タグの前に追記する**

```html
<section id="closing">
  <h2 class="heading" data-i18n="closingHeading">さあ、地図を開いて聖地を巡ろう</h2>
  <a class="cta-button" data-i18n="heroCta" href="map-leaflet.html">マップを見る</a>
</section>

<footer>
  <p data-i18n="footerCredit">写真提供: Wikimedia Commons（詳細は各写真のクレジット参照）</p>
</footer>
```

- [ ] **Step 3: 検証する**

```bash
node -e "
const fs=require('fs');
const html=fs.readFileSync('prototype/homepage.html','utf8');
console.assert(html.includes('id=\"closing\"'), 'missing #closing section');
console.assert(html.includes('data-i18n=\"closingHeading\"'), 'missing closingHeading data-i18n hook');
const ctaCount=(html.match(/data-i18n=\"heroCta\"/g)||[]).length;
console.assert(ctaCount===2, 'expected 2 CTA buttons (hero + closing) sharing heroCta key, got '+ctaCount);
const mapLinkCount=(html.match(/href=\"map-leaflet\.html\"/g)||[]).length;
console.assert(mapLinkCount===2, 'expected 2 links to map-leaflet.html, got '+mapLinkCount);
console.assert(html.includes('<footer>'), 'missing footer element');
console.assert(html.includes('data-i18n=\"footerCredit\"'), 'missing footerCredit data-i18n hook');
console.log('OK Task 4 structure present');
"
```

Expected: `OK Task 4 structure present`, no assertion errors.

- [ ] **Step 4: チェックポイント**

検証がパスしたらコミットし、次のタスクへ進む。

---

### Task 5: 日英バイリンガル切り替え

**Files:**
- Modify: `prototype/homepage.html`

**Interfaces:**
- Consumes: `data-i18n` 属性を持つ全DOM要素（Task 1, 2, 4）、`#lang-toggle` ボタン（Task 1）
- Produces:
  - `const I18N = { ja: {...}, en: {...} }`
  - `let currentLang`
  - `function applyLanguage(lang: string): void`
  - `document.title` および `document.documentElement.lang` の切り替え

- [ ] **Step 1: `<script>` 内、`buildGallery();` の直後に追記する**

```javascript
const I18N = {
  ja: {
    pageTitle: 'アニメ聖地巡礼 | Anime Pilgrimage Japan',
    heroTitle: 'アニメの世界を、実際に歩く。',
    heroCta: 'マップを見る',
    conceptText: 'アニメに描かれたあの景色は、日本のどこかに実在する。世界中のファンを、その本物の舞台へ。',
    feature1Title: '実地図で探す',
    feature1Body: '正確な位置情報を、実際の地図上のピンで確認できます。',
    feature2Title: '作品名で検索',
    feature2Body: '作品名を検索すると、その作品のスポットにまとめてジャンプします。',
    feature3Title: '多言語対応',
    feature3Body: '英語・繁体字中国語・韓国語・タイ語・フランス語に対応しています。',
    feature4Title: '出典明記の安心写真',
    feature4Body: '掲載写真はすべてライセンスを確認済みで、出典を明記しています。',
    galleryHeading: 'スポットの一例',
    closingHeading: 'さあ、地図を開いて聖地を巡ろう',
    footerCredit: '写真提供: Wikimedia Commons（詳細は各写真のクレジット参照）'
  },
  en: {
    pageTitle: 'Anime Pilgrimage Japan',
    heroTitle: 'Walk Into the World of Anime.',
    heroCta: 'Explore the Map',
    conceptText: 'The scenery you saw in anime is real — somewhere in Japan. Connecting fans across the world to the real places behind the stories.',
    feature1Title: 'Explore on a Real Map',
    feature1Body: 'Every spot is pinned on an actual map, not an illustration.',
    feature2Title: 'Search by Title',
    feature2Body: 'Search any anime title to jump straight to its locations.',
    feature3Title: 'Multiple Languages',
    feature3Body: 'Available in English, Traditional Chinese, Korean, Thai, and French.',
    feature4Title: 'Verified, Credited Photos',
    feature4Body: 'Every photo is license-checked and properly credited.',
    galleryHeading: 'A Few Featured Locations',
    closingHeading: 'Ready to Start Your Pilgrimage?',
    footerCredit: 'Photos via Wikimedia Commons (see individual credits above).'
  }
};

let currentLang = 'ja';

function applyLanguage(lang) {
  currentLang = lang;
  document.documentElement.lang = lang;
  document.title = I18N[lang].pageTitle;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (I18N[lang][key] !== undefined) el.textContent = I18N[lang][key];
  });
  document.getElementById('lang-toggle').textContent = lang === 'ja' ? 'EN' : '日本語';
}

document.getElementById('lang-toggle').addEventListener('click', () => {
  applyLanguage(currentLang === 'ja' ? 'en' : 'ja');
});

applyLanguage('ja');
```

- [ ] **Step 2: `data-i18n` キーの網羅性を検証する**

HTML側に存在する全ての `data-i18n` 値が、`I18N.ja` と `I18N.en` の両方に存在することを確認する（片方の言語だけキーが抜けている、はよくある実装漏れなので機械的にチェックする）。

```bash
node -e "
const fs=require('fs');
const html=fs.readFileSync('prototype/homepage.html','utf8');
const usedKeys=[...new Set([...html.matchAll(/data-i18n=\"([^\"]+)\"/g)].map(m=>m[1]))];
console.assert(usedKeys.length===14, 'expected exactly 14 distinct data-i18n keys (heroTitle, heroCta, conceptText, feature1-4 Title/Body, galleryHeading, closingHeading, footerCredit), got '+usedKeys.length+': '+usedKeys.join(','));
const scriptMatch=html.match(/const I18N = (\{[\s\S]*?\n\});/);
console.assert(!!scriptMatch, 'I18N object not found');
const I18N=eval('('+scriptMatch[1]+')');
console.assert(Object.keys(I18N).length===2 && I18N.ja && I18N.en, 'I18N must have exactly ja and en');
for (const key of usedKeys) {
  console.assert(I18N.ja[key]!==undefined, 'I18N.ja missing key used in HTML: '+key);
  console.assert(I18N.en[key]!==undefined, 'I18N.en missing key used in HTML: '+key);
}
console.log('OK Task 5 i18n key coverage:', usedKeys.length, 'keys, all present in both languages');
"
```

Expected: `OK Task 5 i18n key coverage: 14 keys, all present in both languages`。

- [ ] **Step 3: `node --check` で構文チェックする**

```bash
node -e "
const fs=require('fs');
const html=fs.readFileSync('prototype/homepage.html','utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
fs.writeFileSync('_extracted_t5.js', scripts.filter(s=>s.trim()).join('\n'));
"
node --check _extracted_t5.js && echo "SYNTAX OK"
```

- [ ] **Step 4: 軽量DOMスタブで `applyLanguage()` の実際の動作を検証する**

`node --check` は構文しか見ないため、実際に言語切り替えロジックを実行して確認する（`map-leaflet.html` の多言語化タスクで使った手法と同じ、軽量な `document` スタブを使う）。

Note: `eval()` at the top level of a `node -e` string does NOT leak `const`/`let` bindings to the surrounding scope (this is standard JS direct-eval semantics, not a bug in Node). Running the harness and the extracted script as two separate `eval()`-ed strings in the same process will fail with `ReferenceError: currentLang is not defined` even when the implementation is correct. To avoid this, write the harness and the extracted script into ONE file and execute that file directly with `node file.js` (not via `eval`):

```bash
cat > _harness_t5.js << 'HARNESS'
class FakeEl {
  constructor(){ this._text=''; this.dataset={}; this._listeners={}; }
  addEventListener(ev,fn){ (this._listeners[ev]=this._listeners[ev]||[]).push(fn); }
  get textContent(){ return this._text; }
  set textContent(v){ this._text=v; }
}
const heroTitleEl = new FakeEl(); heroTitleEl.dataset.i18n='heroTitle';
const heroCtaEl = new FakeEl(); heroCtaEl.dataset.i18n='heroCta';
const langToggleEl = new FakeEl();
const galleryGridEl = new FakeEl(); galleryGridEl.innerHTML='';
const fakeElements = [heroTitleEl, heroCtaEl];
global.document = {
  title: '',
  documentElement: { lang: 'ja' },
  getElementById(id){ if (id==='gallery-grid') return galleryGridEl; if (id==='lang-toggle') return langToggleEl; return new FakeEl(); },
  querySelectorAll(sel){ return sel === '[data-i18n]' ? fakeElements : []; },
};
HARNESS
cat > _assertions_t5.js << 'ASSERTIONS'
console.assert(currentLang === 'ja', 'currentLang should default to ja, got '+currentLang);
console.assert(heroTitleEl.textContent === I18N.ja.heroTitle, 'hero title should show Japanese text initially');
console.assert(langToggleEl.textContent === 'EN', 'lang-toggle should show EN when current language is ja');

applyLanguage('en');
console.assert(currentLang === 'en', 'currentLang should be en after applyLanguage(en)');
console.assert(heroTitleEl.textContent === I18N.en.heroTitle, 'hero title should switch to English text');
console.assert(heroCtaEl.textContent === I18N.en.heroCta, 'hero CTA should switch to English text');
console.assert(langToggleEl.textContent === '日本語', 'lang-toggle should show 日本語 when current language is en');
console.assert(document.title === I18N.en.pageTitle, 'document.title should switch to English page title');

applyLanguage('ja');
console.assert(heroTitleEl.textContent === I18N.ja.heroTitle, 'hero title should switch back to Japanese text');
console.log('ALL ASSERTIONS PASSED');
ASSERTIONS
cat _harness_t5.js _extracted_t5.js _assertions_t5.js > _full_check_t5.js
node _full_check_t5.js
rm _extracted_t5.js _harness_t5.js _assertions_t5.js _full_check_t5.js
```

Expected: `ALL ASSERTIONS PASSED`, no assertion errors.

- [ ] **Step 5: チェックポイント**

検証がパスしたらコミットし、次のタスクへ進む。

---

### Task 6: レスポンシブ調整・最終検証

**Files:**
- Modify: `prototype/homepage.html`

- [ ] **Step 1: レスポンシブ対応を `</style>` の直前に追記する**

```css
  @media (max-width: 640px) {
    .header-inner{padding:12px 16px;}
    #concept{padding:56px 20px;}
    #features{padding:0 20px 56px;}
    #gallery{padding:0 20px 56px;}
    #closing{padding:56px 20px;}
  }
```

- [ ] **Step 2: 最終構造検証を実行する**

```bash
node -e "
const fs=require('fs');
const html=fs.readFileSync('prototype/homepage.html','utf8');
console.assert(html.includes('<!DOCTYPE html>'), 'missing DOCTYPE');
console.assert(html.includes('@media (max-width: 640px)'), 'missing responsive media query');
const requiredIds=['site-header','hero','concept','features','gallery','closing','lang-toggle','gallery-grid'];
for (const id of requiredIds) { console.assert(html.includes('id=\"'+id+'\"'), 'missing element id: '+id); }
console.assert(html.includes('function applyLanguage('), 'missing applyLanguage function');
console.assert(html.includes('function buildGallery('), 'missing buildGallery function');
console.log('OK final structure check: all sections and functions present');
"
node -e "
const fs=require('fs');
const html=fs.readFileSync('prototype/homepage.html','utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
fs.writeFileSync('_final_extracted.js', scripts.filter(s=>s.trim()).join('\n'));
"
node --check _final_extracted.js && echo "SYNTAX OK"
rm _final_extracted.js
```

Expected: `OK final structure check: all sections and functions present` and `SYNTAX OK`, no assertion errors.

- [ ] **Step 3: ヘッドレスChromeで実行時コンソールエラーをチェックする**

`node --check` は構文のみを見るため、`map-leaflet.html` の `maxZoom` バグのような実行時エラー（DOM要素が見つからずthrowする、等）を検出できない。実際にChromeでファイルを開いてコンソールにエラーが出ていないことを確認する。`homepage.html` は絶対パスをプロジェクトの実際のパスに置き換えて実行する。

Note: on Git Bash (Windows), `$(pwd)` returns a POSIX-style path (`/c/Users/...`), which produces an invalid `file:///` URL and makes Chrome silently load its own error page instead of the target file. Convert to a Windows-style path first with `cygpath -m` (or hardcode the absolute Windows path directly):

```bash
CHROME="C:/Program Files/Google/Chrome/Application/chrome.exe"
FILE="$(cygpath -m "$(pwd)/prototype/homepage.html")"
"$CHROME" --headless=new --disable-gpu --dump-dom --virtual-time-budget=8000 --enable-logging=stderr --v=1 "file:///$FILE" > _dump.html 2> _chrome_log.txt
echo "exit $?"
```

続けて、コンソールエラーの有無とDOMの内容を確認する。DOMカウントは `<script>` タグの中身（`buildGallery()` 内のテンプレートリテラルに `class="gallery-item"` という文字列がソースコードとしてそのまま含まれている）を除外してから数える必要がある。`--dump-dom` は `<script>` タグのテキスト内容もそのままシリアライズするため、除外しないと実際のレンダリング数より1件多くカウントされてしまう:

```bash
node -e "
const fs=require('fs');
const log=fs.readFileSync('_chrome_log.txt','utf8');
const errorLines=log.split('\n').filter(l=>/Uncaught|SyntaxError|TypeError|ReferenceError/.test(l));
console.assert(errorLines.length===0, 'Chrome console errors found:\n'+errorLines.join('\n'));
console.log(errorLines.length===0 ? 'OK no console errors' : 'FOUND ERRORS (see above)');

const dom=fs.readFileSync('_dump.html','utf8');
const domWithoutScripts=dom.replace(/<script[\s\S]*?<\/script>/gi, '');
const galleryItemCount=(domWithoutScripts.match(/class=\"gallery-item\"/g)||[]).length;
console.assert(galleryItemCount===6, 'expected 6 rendered gallery items in DOM, got '+galleryItemCount);
const featureCardCount=(domWithoutScripts.match(/class=\"feature-card\"/g)||[]).length;
console.assert(featureCardCount===4, 'expected 4 rendered feature cards in DOM, got '+featureCardCount);
console.log('OK DOM check:', galleryItemCount, 'gallery items,', featureCardCount, 'feature cards');
"
rm _dump.html _chrome_log.txt
```

Expected: `OK no console errors` および `OK DOM check: 6 gallery items, 4 feature cards`。エラーが見つかった場合はそのタスク（多くの場合Task 3かTask 5）に戻って原因を特定・修正する。

- [ ] **Step 4: チェックポイント・最終コミット**

すべての検証がパスしたらコミットする。

- [ ] **Step 5: ユーザーによるブラウザでの目視QA**

ユーザーに `prototype/homepage.html` をブラウザで直接開いてもらい、以下を確認してもらう:
- ヒーローの背景写真（道後温泉）とキャッチコピー、CTAボタンが正しく表示されるか
- 右上の「EN」ボタンを押すと全文言（見出し・コンセプト文・特徴カード・ギャラリー見出し・クロージング・フッター）が英語に切り替わり、ボタン表示が「日本語」に変わるか。もう一度押すと日本語に戻るか
- ギャラリーの6枚の写真が正しく表示され、各写真下にスポット名・作品名・出典クレジットが表示されているか
- ヒーロー／クロージング、どちらの「マップを見る」ボタンを押しても `map-leaflet.html` に正しく遷移するか
- スマホ幅（ブラウザの開発者ツールでの幅変更）でもレイアウトが崩れないか

フィードバックがあれば該当タスクに戻って修正する。
