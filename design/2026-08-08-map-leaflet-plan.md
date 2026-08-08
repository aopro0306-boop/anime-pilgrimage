# アニメ聖地巡礼マップ Leaflet版（実地図） Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Leaflet.js + OpenStreetMapタイルを使い、既存の78件のアニメ聖地スポットデータを実際の地理タイル上にプロットする、ローカルで動くスタンドアロンHTMLファイル（`prototype/map-leaflet.html`）を作る。

**Architecture:** 単一のローカルHTMLファイルに、Leaflet/Leaflet.markercluster をCDN経由で読み込み、既存プロトタイプ（`prototype/map-prototype.html`）の`SPOTS`データをそのまま埋め込む。ピンは種別ごとに形状・色分けしたカスタムdivIconとし、Leaflet.markerclusterでクラスタリングする。フィルターパネルはクラスターグループへのマーカー追加／除去で表示制御し、詳細情報はLeafletネイティブのポップアップで表示する。

**Tech Stack:** 素のHTML/CSS/JavaScript + Leaflet 1.9.4 + Leaflet.markercluster 1.5.3（いずれもCDN経由）。データ抽出のみNode.jsを使用。

## Global Constraints

- 成果物は `prototype/map-leaflet.html` という**ローカルの通常のWebページ**であり、Artifactとしては公開しない。Artifact版と異なり `<!DOCTYPE html>` `<html>` `<head>` `<body>` を含む通常のHTML文書構造にする。
- 外部CDNへの参照は許可される（むしろ必須）。以下のURLを使う（2026-08-08時点で疎通確認済み）:
  - `https://unpkg.com/leaflet@1.9.4/dist/leaflet.css`
  - `https://unpkg.com/leaflet@1.9.4/dist/leaflet.js`
  - `https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css`
  - `https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css`
  - `https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js`
  - タイルは `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`、アトリビューションに `&copy; OpenStreetMap contributors` を含める。
- このファイルはArtifactツールで公開しない。
- **テスト方針**: ヘッドレスブラウザは使えないため、データ・ロジックの検証は `node -e` によるJSON構造・件数・数値範囲アサーションと `node --check`（自前JSのみ、CDNライブラリ部分は対象外）で行う。実際のタイル読み込み・クラスタリング・ポップアップ等の見た目・操作感は、最後のタスクでユーザーがブラウザで直接ファイルを開いて確認する。
- `SPOTS` データは `prototype/map-prototype.html` に既にある78件をそのまま流用する（座標の再調査はしない）。
- ピンの種別カラーはTask7版と同じ値を使う: scene=`#2a78d6`、monument=`#eb6834`、inspiration=`#1baf7a`。
- ダーク／ライト両テーマ対応は不要（単一のライトテーマのみ）。

---

## File Structure

- `prototype/map-leaflet.html` — 唯一の成果物。Task 1〜6で段階的に追記・編集する。

---

### Task 1: データ抽出とLeaflet基本地図の表示

**Files:**
- Create: `prototype/map-leaflet.html`

**Interfaces:**
- Produces:
  - `const SPOTS = [...]`（78件、`prototype/map-prototype.html`から抽出したものと同一）
  - `const PREFECTURE_NAV = [...]`（21件、以下Step 2で与える正確な値）
  - `const map = L.map('map')...` で初期化された地図インスタンス（グローバル変数`map`）
  - 後続タスクはこの3つをそのまま利用する。

- [ ] **Step 1: SPOTSデータを抽出する**

```bash
node -e "
const fs=require('fs');
const html=fs.readFileSync('prototype/map-prototype.html','utf8');
const spots=JSON.parse(html.match(/const SPOTS = (\[[\s\S]*?\]);/)[1]);
fs.writeFileSync('.tmp-spots.json', JSON.stringify(spots));
console.log('extracted', spots.length, 'spots');
"
```

Expected: `extracted 78 spots`

- [ ] **Step 2: `prototype/map-leaflet.html` を新規作成する**

以下の内容で作成する。`__SPOTS_JSON__` の部分は、Step 1で `.tmp-spots.json` に書き出したJSON文字列（78件の配列）をそのまま貼り付ける。`PREFECTURE_NAV` は以下の21件の配列を**そのまま**使う（`prototype/map-prototype.html` のSPOTSデータから算出済みの実際の値）:

```javascript
const PREFECTURE_NAV = [
  {"name":"京都府","count":1,"bounds":[[35.0084,135.7669],[35.0084,135.7669]]},
  {"name":"兵庫県","count":3,"bounds":[[34.7465,135.3128],[34.7611,135.3564]]},
  {"name":"北海道","count":3,"bounds":[[43.0308,141.3507],[43.0923,141.5297]]},
  {"name":"千葉県","count":2,"bounds":[[35.7252,139.9006],[35.7844,140.2297]]},
  {"name":"埼玉県","count":6,"bounds":[[35.793,139.083],[36.0898,139.6754]]},
  {"name":"大分県","count":4,"bounds":[[33.2479,130.9383],[33.3324,131.4833]]},
  {"name":"山梨県","count":3,"bounds":[[35.2822,138.4651],[35.7023,138.6652]]},
  {"name":"岐阜県","count":7,"bounds":[[36.1332,137.1861],[36.2395,137.2614]]},
  {"name":"愛媛県","count":3,"bounds":[[33.7561,132.7021],[33.8886,132.7862]]},
  {"name":"愛知県","count":1,"bounds":[[35.2165,137.0354],[35.2165,137.0354]]},
  {"name":"東京都","count":6,"bounds":[[35.6797,139.5125],[35.7668,139.8479]]},
  {"name":"滋賀県","count":1,"bounds":[[35.1978,136.2308],[35.1978,136.2308]]},
  {"name":"熊本県","count":11,"bounds":[[32.2159,130.581],[32.937,131.1226]]},
  {"name":"神奈川県","count":2,"bounds":[[35.3062,139.5308],[35.61,139.5737]]},
  {"name":"福岡県","count":2,"bounds":[[33.1852,130.5325],[33.5288,130.5524]]},
  {"name":"群馬県","count":4,"bounds":[[36.4752,138.8664],[36.498,139.0083]]},
  {"name":"茨城県","count":5,"bounds":[[36.0868,140.1106],[36.3158,140.5875]]},
  {"name":"長崎県","count":4,"bounds":[[32.58,128.75],[32.697,129]]},
  {"name":"長野県","count":5,"bounds":[[36.1312,138.0324],[36.4223,138.2889]]},
  {"name":"静岡県","count":1,"bounds":[[35.0093,139.0117],[35.0093,139.0117]]},
  {"name":"鳥取県","count":4,"bounds":[[35.4902,133.223],[35.5446,133.7619]]}
];
```

ファイル全体の骨格:

```html
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>アニメ聖地巡礼マップ（実地図版）</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css">
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css">
<style>
  html, body { margin: 0; padding: 0; height: 100%; }
  #map { width: 100%; height: 100vh; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
<script>
const SPOTS = __SPOTS_JSON__;

const PREFECTURE_NAV = [ /* 上記21件をそのまま */ ];

const map = L.map('map').setView([36.5, 138], 5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);
</script>
</body>
</html>
```

`__SPOTS_JSON__` は `.tmp-spots.json` の中身（78件のJSON配列）にそのまま置き換える。

- [ ] **Step 3: 一時ファイルを削除する**

```bash
rm .tmp-spots.json
```

- [ ] **Step 4: 検証する**

```bash
node -e "
const fs=require('fs');
const html=fs.readFileSync('prototype/map-leaflet.html','utf8');
const spots=JSON.parse(html.match(/const SPOTS = (\[[\s\S]*?\]);/)[1]);
const nav=JSON.parse(html.match(/const PREFECTURE_NAV = (\[[\s\S]*?\]);/)[1]);
console.assert(spots.length===78, 'expected 78 spots, got '+spots.length);
console.assert(nav.length===21, 'expected 21 prefecture nav entries, got '+nav.length);
console.assert(html.includes('unpkg.com/leaflet@1.9.4/dist/leaflet.js'), 'missing leaflet.js CDN link');
console.assert(html.includes('unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js'), 'missing markercluster CDN link');
console.assert(html.includes('tile.openstreetmap.org'), 'missing OSM tile layer');
console.assert(html.includes('<!DOCTYPE html>'), 'missing DOCTYPE (this is a normal webpage, not an Artifact)');
console.log('OK', spots.length, 'spots,', nav.length, 'prefectures');
"
```

Expected: `OK 78 spots, 21 prefectures`

- [ ] **Step 5: チェックポイント**

次のタスクに進む前に、Step 4の検証が全てパスしていることを確認する。このプロジェクトはgit管理されているので、`git add prototype/map-leaflet.html && git commit` でコミットする。

---

### Task 2: 種別ごとのカスタムピン＋クラスタリング

**Files:**
- Modify: `prototype/map-leaflet.html`

**Interfaces:**
- Consumes: `SPOTS`, `map`（Task 1）
- Produces:
  - `function createPinIcon(type): L.DivIcon`
  - `const markersById = {}`（spot.id → L.Marker のマップ）
  - `const clusterGroup = L.markerClusterGroup()`（mapに追加済み）
  - 後続タスクはこれらをそのまま利用する。

- [ ] **Step 1: アイコン生成関数とマーカー生成ロジックを追記する**

`</script>`の直前、`L.tileLayer(...).addTo(map);` の後に追記:

```javascript
const TYPE_COLORS = { scene: '#2a78d6', monument: '#eb6834', inspiration: '#1baf7a' };

function createPinIcon(type) {
  const color = TYPE_COLORS[type];
  let shape;
  if (type === 'scene') {
    shape = `<circle cx="12" cy="12" r="7" fill="${color}" stroke="#ffffff" stroke-width="2"/>`;
  } else if (type === 'monument') {
    shape = `<rect x="5.5" y="5.5" width="13" height="13" fill="${color}" stroke="#ffffff" stroke-width="2"/>`;
  } else {
    shape = `<polygon points="12,4 20,19 4,19" fill="${color}" stroke="#ffffff" stroke-width="2"/>`;
  }
  return L.divIcon({
    className: 'pin-icon',
    html: `<svg width="24" height="24" viewBox="0 0 24 24">${shape}</svg>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
}

const clusterGroup = L.markerClusterGroup();
const markersById = {};

for (const spot of SPOTS) {
  const marker = L.marker([spot.lat, spot.lng], { icon: createPinIcon(spot.type) });
  markersById[spot.id] = marker;
  clusterGroup.addLayer(marker);
}

map.addLayer(clusterGroup);
```

- [ ] **Step 2: 検証する**

```bash
node -e "
const fs=require('fs');
const html=fs.readFileSync('prototype/map-leaflet.html','utf8');
console.assert(html.includes('function createPinIcon('), 'missing createPinIcon function');
console.assert(html.includes('const clusterGroup = L.markerClusterGroup()'), 'missing clusterGroup init');
console.assert(html.includes('const markersById = {}'), 'missing markersById map');
console.assert(html.includes(\"TYPE_COLORS = { scene: '#2a78d6', monument: '#eb6834', inspiration: '#1baf7a' }\"), 'pin colors do not match Task 7 tokens');
console.log('OK structure present');
"
node -e "
const fs=require('fs');
const html=fs.readFileSync('prototype/map-leaflet.html','utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
fs.writeFileSync('_extracted.js', scripts.filter(s=>s.trim()).join('\n'));
"
node --check _extracted.js && echo "SYNTAX OK"
rm _extracted.js
```

Note: `node --check` will fail here because `L` (Leaflet's global) is undefined outside a browser — this is expected for a Leaflet-dependent script. If the check fails specifically due to `ReferenceError`-style runtime issues when actually executed, that's fine; `node --check` only validates **syntax**, it does not execute the script, so it will not hit the undefined-`L` runtime error. Expected: `SYNTAX OK`.

- [ ] **Step 3: チェックポイント**

Step 2の検証がパスしたらコミットし、次のタスクへ進む。

---

### Task 3: 作品名・スポット種別フィルター機能

**Files:**
- Modify: `prototype/map-leaflet.html`

**Interfaces:**
- Consumes: `SPOTS`, `clusterGroup`, `markersById`（Task 1, 2）
- Produces:
  - DOM: `#filter-panel`（作品名チェックリスト、種別トグルチップ）
  - `const filterState = { animes: Set<string>, types: Set<string> }`
  - `function applyFilters(): void`

- [ ] **Step 1: フィルターパネルのHTMLとスタイルを追記する**

`<div id="map"></div>` の直前に追記:

```html
<div id="filter-panel">
  <div id="anime-filter"></div>
  <div id="type-filter">
    <button class="type-chip" data-type="scene">実際の舞台</button>
    <button class="type-chip" data-type="monument">像・モニュメント</button>
    <button class="type-chip" data-type="inspiration">着想元</button>
  </div>
</div>
```

`<style>` に追記:

```css
#filter-panel{position:absolute;top:12px;left:12px;z-index:1000;padding:12px;max-width:280px;background:rgba(255,255,255,0.95);border-radius:8px;max-height:70vh;overflow-y:auto;box-shadow:0 2px 8px rgba(0,0,0,0.2);}
#anime-filter label{display:block;font-size:13px;margin:2px 0;}
.type-chip{display:inline-block;margin:4px 4px 0 0;padding:4px 10px;border-radius:999px;border:1px solid #ccc;background:#fff;cursor:pointer;font-size:12px;}
.type-chip.active{background:#333;color:#fff;}
```

Note: `z-index:1000` はLeafletの内部要素（ズームボタン等、z-index 400〜1000程度）より確実に上に来るようにするため。

- [ ] **Step 2: フィルターロジックを追記する**

`map.addLayer(clusterGroup);` の直後に追記:

```javascript
const filterState = {
  animes: new Set(SPOTS.map(s => s.anime)),
  types: new Set(['scene', 'monument', 'inspiration'])
};

function buildAnimeFilter() {
  const container = document.getElementById('anime-filter');
  const animeList = [...new Set(SPOTS.map(s => s.anime))].sort();
  container.innerHTML = animeList.map(anime => `
    <label><input type="checkbox" value="${anime}" checked> ${anime}</label>
  `).join('');
  container.addEventListener('change', (e) => {
    if (e.target.matches('input[type=checkbox]')) {
      if (e.target.checked) filterState.animes.add(e.target.value);
      else filterState.animes.delete(e.target.value);
      applyFilters();
    }
  });
}

function buildTypeFilter() {
  document.querySelectorAll('.type-chip').forEach(chip => {
    chip.classList.add('active');
    chip.addEventListener('click', () => {
      const type = chip.dataset.type;
      if (filterState.types.has(type)) {
        filterState.types.delete(type);
        chip.classList.remove('active');
      } else {
        filterState.types.add(type);
        chip.classList.add('active');
      }
      applyFilters();
    });
  });
}

function applyFilters() {
  for (const spot of SPOTS) {
    const marker = markersById[spot.id];
    const visible = filterState.animes.has(spot.anime) && filterState.types.has(spot.type);
    const inCluster = clusterGroup.hasLayer(marker);
    if (visible && !inCluster) clusterGroup.addLayer(marker);
    if (!visible && inCluster) clusterGroup.removeLayer(marker);
  }
}

buildAnimeFilter();
buildTypeFilter();
```

- [ ] **Step 3: 検証する**

```bash
node -e "
const fs=require('fs');
const html=fs.readFileSync('prototype/map-leaflet.html','utf8');
console.assert(html.includes('id=\"filter-panel\"'), 'missing filter-panel');
console.assert(html.includes('function applyFilters('), 'missing applyFilters');
console.assert(html.includes('clusterGroup.hasLayer(marker)'), 'applyFilters must use hasLayer to avoid duplicate add/remove');
console.log('OK filter structure present');
"
node -e "
const SPOTS=[{id:'a',anime:'X',type:'scene'},{id:'b',anime:'Y',type:'monument'}];
const filterState={animes:new Set(['X']), types:new Set(['scene','monument','inspiration'])};
const visible=SPOTS.filter(s=>filterState.animes.has(s.anime)&&filterState.types.has(s.type));
console.assert(visible.length===1 && visible[0].id==='a', 'filter logic broken');
console.log('OK filter logic');
"
```

Expected: both `OK filter structure present` and `OK filter logic`, no assertion errors.

- [ ] **Step 4: チェックポイント**

検証がパスしたらコミットし、次のタスクへ進む。

---

### Task 4: 詳細ポップアップ（Googleマップリンク付き）

**Files:**
- Modify: `prototype/map-leaflet.html`

**Interfaces:**
- Consumes: `SPOTS`, `markersById`（Task 1, 2）
- Produces: 各マーカーに `bindPopup()` 済みのポップアップ

- [ ] **Step 1: ポップアップ用CSSを追記する**

`<style>` に追記:

```css
.spot-popup{font-family:sans-serif;min-width:180px;}
.spot-popup .badge{display:inline-block;font-size:11px;padding:2px 8px;border-radius:999px;background:#eee;margin-bottom:6px;}
.spot-popup h3{margin:4px 0;font-size:15px;}
.spot-popup p{margin:2px 0;font-size:13px;color:#555;}
.spot-popup .desc{margin-top:6px;font-size:13px;color:#333;}
.spot-popup a{display:inline-block;margin-top:8px;font-size:13px;}
```

- [ ] **Step 2: ポップアップ生成・バインドロジックを追記する**

まず、Task 2で追記した `const clusterGroup = L.markerClusterGroup();` の行の直前に、`TYPE_LABELS` の定義を追記する（ループの外に1回だけ定義する）:

```javascript
const TYPE_LABELS = { scene: '実際の舞台', monument: '像・モニュメント', inspiration: '着想元' };
```

次に、マーカー生成ループ（Task 2の `for (const spot of SPOTS) { ... }`）の中、`markersById[spot.id] = marker;` の直後に追記:

```javascript
  const mapsUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(spot.mapsQuery);
  marker.bindPopup(`
    <div class="spot-popup">
      <span class="badge">${TYPE_LABELS[spot.type]}</span>
      <h3>${spot.name}</h3>
      <p>${spot.anime}｜${spot.prefecture}</p>
      <p class="desc">${spot.description}</p>
      <a href="${mapsUrl}" target="_blank" rel="noopener">Googleマップで開く</a>
    </div>
  `);
```

- [ ] **Step 3: 検証する**

```bash
node -e "
const fs=require('fs');
const html=fs.readFileSync('prototype/map-leaflet.html','utf8');
console.assert(html.includes('.bindPopup('), 'missing bindPopup call');
console.assert(html.includes('spot-popup'), 'missing popup CSS class usage');
console.assert(html.includes('maps.google.com') || html.includes('google.com/maps'), 'missing Google Maps link');
console.log('OK popup structure present');
"
node -e "
const spot={mapsQuery:'鎌倉高校前駅 踏切'};
const url='https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(spot.mapsQuery);
console.assert(url==='https://www.google.com/maps/search/?api=1&query=%E9%8E%8C%E5%80%89%E9%AB%98%E6%A0%A1%E5%89%8D%E9%A7%85%20%E8%B8%8F%E5%88%87', 'unexpected encoded url: '+url);
console.log('OK', url);
"
```

Expected: both checks pass with no assertion errors.

- [ ] **Step 4: チェックポイント**

検証がパスしたらコミットし、次のタスクへ進む。

---

### Task 5: 都道府県ナビ（簡易サイドパネル）

**Files:**
- Modify: `prototype/map-leaflet.html`

**Interfaces:**
- Consumes: `PREFECTURE_NAV`（Task 1）、`map`
- Produces: `#pref-nav`（DOM）

- [ ] **Step 1: ナビパネルのHTML・CSSを追記する**

`</div>`（`#filter-panel` の閉じタグ）の直後に追記:

```html
<div id="pref-nav">
  <h4>都道府県から探す</h4>
  <div id="pref-nav-list"></div>
</div>
```

`<style>` に追記:

```css
#pref-nav{position:absolute;top:12px;right:12px;z-index:1000;padding:12px;width:200px;max-height:70vh;overflow-y:auto;background:rgba(255,255,255,0.95);border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.2);}
#pref-nav h4{margin:0 0 8px 0;font-size:13px;}
.pref-nav-item{padding:4px 2px;font-size:13px;cursor:pointer;border-bottom:1px solid #eee;}
.pref-nav-item:hover{background:#f5f5f5;}
```

- [ ] **Step 2: ナビロジックを追記する**

`buildAnimeFilter(); buildTypeFilter();`（Task 3末尾）の後に追記:

```javascript
function buildPrefNav() {
  const container = document.getElementById('pref-nav-list');
  container.innerHTML = PREFECTURE_NAV.map(p => `
    <div class="pref-nav-item" data-name="${p.name}">${p.name}（${p.count}）</div>
  `).join('');
  container.addEventListener('click', (e) => {
    const item = e.target.closest('.pref-nav-item');
    if (!item) return;
    const pref = PREFECTURE_NAV.find(p => p.name === item.dataset.name);
    if (pref) map.flyToBounds(pref.bounds, { padding: [40, 40], maxZoom: 14 });
  });
}

buildPrefNav();
```

- [ ] **Step 3: 検証する**

```bash
node -e "
const fs=require('fs');
const html=fs.readFileSync('prototype/map-leaflet.html','utf8');
console.assert(html.includes('function buildPrefNav('), 'missing buildPrefNav');
console.assert(html.includes('map.flyToBounds('), 'missing flyToBounds call');
console.assert(html.includes('id=\"pref-nav\"'), 'missing pref-nav element');
console.log('OK pref-nav structure present');
"
node -e "
const fs=require('fs');
const html=fs.readFileSync('prototype/map-leaflet.html','utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
fs.writeFileSync('_extracted2.js', scripts.filter(s=>s.trim()).join('\n'));
"
node --check _extracted2.js && echo "SYNTAX OK"
rm _extracted2.js
```

Expected: `OK pref-nav structure present` and `SYNTAX OK`.

- [ ] **Step 4: チェックポイント**

検証がパスしたらコミットし、次のタスクへ進む。

---

### Task 6: 最終仕上げ・構造検証・ブラウザでの手動QA

**Files:**
- Modify: `prototype/map-leaflet.html`

- [ ] **Step 1: レスポンシブ対応と最終スタイル調整を追記する**

`<style>` に追記:

```css
@media (max-width: 640px) {
  #filter-panel, #pref-nav { width: calc(50vw - 24px); max-width: none; }
}
```

- [ ] **Step 2: 最終構造検証を実行する**

```bash
node -e "
const fs=require('fs');
const html=fs.readFileSync('prototype/map-leaflet.html','utf8');
console.assert(html.includes('<!DOCTYPE html>'), 'missing DOCTYPE');
const spots=JSON.parse(html.match(/const SPOTS = (\[[\s\S]*?\]);/)[1]);
const nav=JSON.parse(html.match(/const PREFECTURE_NAV = (\[[\s\S]*?\]);/)[1]);
console.assert(spots.length===78, 'expected 78 spots');
console.assert(nav.length===21, 'expected 21 prefecture nav entries');
const requiredFns=['function createPinIcon(','function applyFilters(','function buildAnimeFilter(','function buildTypeFilter(','function buildPrefNav('];
for (const fn of requiredFns){ console.assert(html.includes(fn), 'missing function: '+fn); }
console.log('OK final structure check:', spots.length, 'spots,', nav.length, 'prefectures, all functions present');
"
node -e "
const fs=require('fs');
const html=fs.readFileSync('prototype/map-leaflet.html','utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
fs.writeFileSync('_final_extracted.js', scripts.filter(s=>s.trim()).join('\n'));
"
node --check _final_extracted.js && echo "SYNTAX OK"
rm _final_extracted.js
```

Expected: both checks pass with no assertion errors.

- [ ] **Step 3: チェックポイント・最終コミット**

検証がパスしたらコミットする。

- [ ] **Step 4: ユーザーによるブラウザでの目視QA**

ユーザーに `prototype/map-leaflet.html` をブラウザで直接開いてもらい、以下を確認してもらう:
- OpenStreetMapの実タイルが表示され、パン・ズームができるか
- 密集エリア（例: 秩父・大洗・上田・熊本など）でピンがクラスタリングされ、ズームすると展開するか
- 作品名フィルター・種別フィルターでピンの表示/非表示が切り替わるか
- ピンをクリックするとポップアップが表示され、「Googleマップで開く」が正しい場所にリンクしているか
- 右上の都道府県ナビをクリックすると、その都道府県にズームするか
- スマホ幅（ブラウザの開発者ツールでの幅変更）でもパネルが画面からはみ出さないか

フィードバックがあれば該当タスクに戻って修正する。
