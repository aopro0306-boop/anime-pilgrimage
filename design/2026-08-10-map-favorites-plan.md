# マップ「お気に入り」機能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `prototype/map-leaflet.html`に、スポットをローカル保存して後から見返せる「お気に入り」機能を追加する。

**Architecture:** 単一ファイル`map-leaflet.html`への追記のみ。お気に入りIDは`Set`として保持し`localStorage`に永続化。既存の`#filter-panel`に「絞り込み」「♡ お気に入り」の2タブを新設し、既存の検索・作品フィルター・タイプフィルターは「絞り込み」タブに移動する。ポップアップにハートボタンを追加し、既存の`buildX()`/`wireX()`分離パターン（`buildAnimeFilter`/`buildPrefNav`と同様）を踏襲して`buildFavoritesTab()`/`wireFavoritesTab()`を実装する。

**Tech Stack:** 既存と同じ、素のJS（外部ライブラリなし）。`localStorage` Web API。検証にNode.js（`node --check`、`node -e`アサーション、`localStorage`スタブを使ったロジック単体テスト）とヘッドレスChrome。

## Global Constraints

- 対象ファイルは`prototype/map-leaflet.html`のみ（[design/2026-08-10-map-favorites-design.md](2026-08-10-map-favorites-design.md)）。新規ファイルは作らない。
- `localStorage`キーは`'pilgrimage-favorites'`固定。値はスポットID文字列のJSON配列。
- ハート・タブのアクセントカラーは既存の`#FF4D6D`（既存の`.gmaps-btn`・チェックボックスと同じ色）を使う。
- 既存の`buildX()`（描画のみ）/`wireX()`（一度だけイベント配線）分離パターンを踏襲する。`buildFavoritesTab()`は`applyLanguage()`から再描画されるため、内部でイベントリスナーを再登録してはならない（`buildAnimeFilter`/`buildPrefNav`と同じ制約）。
- スポット名・作品名の表示は既存の`translateSpotName(spot)`/`translateAnime(spot.anime)`をそのまま使う（新規翻訳データは追加しない）。
- 6言語のUI文言は既存の`I18N`オブジェクトに追記する形で実装する。
- 各タスクの検証は次を必ず行う: ①`node --check`（インラインスクリプト抽出後）、②`node -e`によるHTML構造アサーション、③最終タスクでヘッドレスChromeによる実行時コンソールエラーチェック。

---

### Task 1: お気に入りデータ層（永続化ロジック）

**Files:**
- Modify: `prototype/map-leaflet.html`

**Interfaces:**
- Produces: `let favorites`（`Set<string>`）, `function saveFavorites(): void`, `function toggleFavorite(id: string): void`（後続タスクの`buildFavoritesTab()`を呼ぶが、Task 1時点では`buildFavoritesTab`は未定義のため、`typeof buildFavoritesTab === 'function' && buildFavoritesTab()`という防御的呼び出しにする）

- [ ] **Step 1: `const TYPE_COLORS = ...`の直後に追記する**

```js
// Favorites are stored client-side only (localStorage), keyed by spot id.
// No account/server sync — see design/2026-08-10-map-favorites-design.md.
const FAVORITES_KEY = 'pilgrimage-favorites';

let favorites;
try {
  favorites = new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'));
} catch (e) {
  favorites = new Set();
}

function saveFavorites() {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
}

// Called from the popup heart button (Task 3) and the favorites-tab remove
// button (Task 4). buildFavoritesTab isn't defined until Task 4, so the call
// is guarded until then.
function toggleFavorite(id) {
  if (favorites.has(id)) {
    favorites.delete(id);
  } else {
    favorites.add(id);
  }
  saveFavorites();
  if (typeof buildFavoritesTab === 'function') buildFavoritesTab();
}
```

- [ ] **Step 2: 検証する**

```bash
node -e "
const fs=require('fs');
const html=fs.readFileSync('prototype/map-leaflet.html','utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(s=>s.trim());
fs.writeFileSync('/tmp/map-extracted.js', scripts.join('\n\n'));
"
node --check /tmp/map-extracted.js && echo "SYNTAX OK"
```

ロジック単体テスト（`localStorage`スタブを使い、データ層の関数だけを抜き出して検証する）:

```bash
node -e "
const fs=require('fs');
const html=fs.readFileSync('prototype/map-leaflet.html','utf8');
const src=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(s=>s.trim()).join('\n\n');
const m=src.match(/const FAVORITES_KEY[\s\S]*?\nfunction toggleFavorite\(id\) \{[\s\S]*?\n\}\n/);
console.assert(m, 'could not extract favorites data-layer block');
const store={};
global.localStorage={
  getItem:(k)=>(k in store ? store[k] : null),
  setItem:(k,v)=>{store[k]=v;}
};
eval(m[0]);
console.assert(favorites.size===0, 'expected empty favorites initially');
toggleFavorite('kamakura-slamdunk-crossing');
console.assert(favorites.has('kamakura-slamdunk-crossing'), 'toggleFavorite should add id');
console.assert(JSON.parse(store['pilgrimage-favorites'])[0]==='kamakura-slamdunk-crossing', 'saveFavorites should persist to localStorage');
toggleFavorite('kamakura-slamdunk-crossing');
console.assert(!favorites.has('kamakura-slamdunk-crossing'), 'toggleFavorite should remove id on second call');
console.assert(JSON.parse(store['pilgrimage-favorites']).length===0, 'saveFavorites should persist removal');
console.log('OK favorites data layer verified');
"
```

Expected: `SYNTAX OK`、`OK favorites data layer verified`。

- [ ] **Step 3: チェックポイント**

コミットして次のタスクへ。

---

### Task 2: フィルターパネルのタブUI

**Files:**
- Modify: `prototype/map-leaflet.html`

**Interfaces:**
- Consumes: なし
- Produces: `#panel-tabs`, `#filter-tab-content`（既存の検索ボックス・作品フィルター・タイプフィルターをラップ）, `#favorites-tab-content`（`#favorites-list`を含む、Task 4で中身を描画）, `.panel-tab`のクリックで表示切り替え。

- [ ] **Step 1: `</style>`直前にCSSを追記する**

```css
  #panel-tabs{display:flex;gap:6px;margin-bottom:8px;}
  .panel-tab{flex:1;padding:7px 0;font-size:12px;font-weight:700;font-family:inherit;border:2px solid #e2ddd0;border-radius:12px;background:#fff;cursor:pointer;color:#555;}
  .panel-tab.active{background:#FF4D6D;border-color:#FF4D6D;color:#fff;}
  #filter-tab-content.hidden, #favorites-tab-content.hidden{display:none;}
  .favorites-empty{font-size:13px;color:#888;padding:8px 4px;}
```

- [ ] **Step 2: `#filter-panel`の中身を、既存の検索ボックス〜タイプフィルターを`#filter-tab-content`でラップする形に書き換える**

既存:
```html
<div id="filter-panel">
  <div id="lang-switcher">
    <select id="lang-select" aria-label="Language">
      <option value="ja">日本語</option>
      <option value="en">English</option>
      <option value="zh-TW">繁體中文</option>
      <option value="ko">한국어</option>
      <option value="th">ไทย</option>
      <option value="fr">Français</option>
    </select>
  </div>
  <div id="anime-search-box">
    <input type="text" id="anime-search-input" placeholder="作品名で検索...">
    <div id="anime-search-results" class="hidden"></div>
  </div>
  <div id="anime-filter"></div>
  <div id="type-filter">
    <button class="type-chip" data-type="scene">実際の舞台</button>
    <button class="type-chip" data-type="monument">像・モニュメント</button>
    <button class="type-chip" data-type="inspiration">着想元</button>
  </div>
</div>
```

書き換え後:
```html
<div id="filter-panel">
  <div id="lang-switcher">
    <select id="lang-select" aria-label="Language">
      <option value="ja">日本語</option>
      <option value="en">English</option>
      <option value="zh-TW">繁體中文</option>
      <option value="ko">한국어</option>
      <option value="th">ไทย</option>
      <option value="fr">Français</option>
    </select>
  </div>
  <div id="panel-tabs">
    <button class="panel-tab active" data-tab="filter" type="button">絞り込み</button>
    <button class="panel-tab" data-tab="favorites" type="button">♡ お気に入り</button>
  </div>
  <div id="filter-tab-content">
    <div id="anime-search-box">
      <input type="text" id="anime-search-input" placeholder="作品名で検索...">
      <div id="anime-search-results" class="hidden"></div>
    </div>
    <div id="anime-filter"></div>
    <div id="type-filter">
      <button class="type-chip" data-type="scene">実際の舞台</button>
      <button class="type-chip" data-type="monument">像・モニュメント</button>
      <button class="type-chip" data-type="inspiration">着想元</button>
    </div>
  </div>
  <div id="favorites-tab-content" class="hidden">
    <div id="favorites-list"></div>
  </div>
</div>
```

- [ ] **Step 3: タブ切り替えJSを追記する（`document.getElementById('lang-select').addEventListener(...)`の直前に置く）**

```js
document.querySelectorAll('.panel-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('filter-tab-content').classList.toggle('hidden', tab.dataset.tab !== 'filter');
    document.getElementById('favorites-tab-content').classList.toggle('hidden', tab.dataset.tab !== 'favorites');
  });
});
```

- [ ] **Step 4: 検証する**

```bash
node -e "
const fs=require('fs');
const html=fs.readFileSync('prototype/map-leaflet.html','utf8');
console.assert(html.includes('id=\"panel-tabs\"'), 'missing panel-tabs');
console.assert(html.includes('id=\"filter-tab-content\"'), 'missing filter-tab-content');
console.assert(html.includes('id=\"favorites-tab-content\"'), 'missing favorites-tab-content');
console.assert(html.includes('id=\"favorites-list\"'), 'missing favorites-list container');
console.assert((html.match(/class=\"panel-tab/g)||[]).length===2, 'expected 2 panel-tab buttons');
console.log('OK Task 2 structure present');
"
node -e "
const fs=require('fs');
const html=fs.readFileSync('prototype/map-leaflet.html','utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(s=>s.trim());
fs.writeFileSync('/tmp/map-extracted.js', scripts.join('\n\n'));
"
node --check /tmp/map-extracted.js && echo "SYNTAX OK"
```

- [ ] **Step 5: チェックポイント**

コミットして次のタスクへ。

---

### Task 3: ポップアップのハートボタン

**Files:**
- Modify: `prototype/map-leaflet.html`

**Interfaces:**
- Consumes: Task 1の`favorites`/`toggleFavorite(id)`
- Produces: `buildPopupHtml(spot)`内の`.favorite-heart`ボタン、`map.on('popupopen', ...)`による配線

- [ ] **Step 1: `</style>`直前にCSSを追記する**

```css
  .favorite-heart{background:none;border:none;font-size:18px;cursor:pointer;float:right;line-height:1;padding:0;color:#FF4D6D;}
```

- [ ] **Step 2: `buildPopupHtml(spot)`を書き換える**

既存:
```js
function buildPopupHtml(spot) {
  const mapsUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(spot.mapsQuery);
  const photo = PHOTOS[spot.id];
  const name = translateSpotName(spot);
  const photoHtml = photo ? `
      <img class="photo" src="${photo.url}" alt="${name}" loading="lazy">
      <p class="photo-credit">Photo: <a href="${photo.sourceUrl}" target="_blank" rel="noopener">${photo.author}</a> / ${photo.license} (Wikimedia Commons)</p>
  ` : '';
  return `
    <div class="spot-popup">
      <span class="badge type-${spot.type}">${I18N[currentLang].types[spot.type]}</span>
      <h3>${name}</h3>
      <p>${translateAnime(spot.anime)}${currentLang === 'en' ? ' | ' : '｜'}${translatePrefecture(spot.prefecture)}</p>
      ${photoHtml}
      <p class="desc">${translateDescription(spot)}</p>
      <a class="gmaps-btn" href="${mapsUrl}" target="_blank" rel="noopener">${I18N[currentLang].openInGoogleMaps}</a>
    </div>
  `;
}
```

書き換え後:
```js
function buildPopupHtml(spot) {
  const mapsUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(spot.mapsQuery);
  const photo = PHOTOS[spot.id];
  const name = translateSpotName(spot);
  const isFavorite = favorites.has(spot.id);
  const photoHtml = photo ? `
      <img class="photo" src="${photo.url}" alt="${name}" loading="lazy">
      <p class="photo-credit">Photo: <a href="${photo.sourceUrl}" target="_blank" rel="noopener">${photo.author}</a> / ${photo.license} (Wikimedia Commons)</p>
  ` : '';
  return `
    <div class="spot-popup">
      <button class="favorite-heart" type="button" data-favorite-id="${spot.id}" aria-label="${I18N[currentLang].favoriteToggle}">${isFavorite ? '♥' : '♡'}</button>
      <span class="badge type-${spot.type}">${I18N[currentLang].types[spot.type]}</span>
      <h3>${name}</h3>
      <p>${translateAnime(spot.anime)}${currentLang === 'en' ? ' | ' : '｜'}${translatePrefecture(spot.prefecture)}</p>
      ${photoHtml}
      <p class="desc">${translateDescription(spot)}</p>
      <a class="gmaps-btn" href="${mapsUrl}" target="_blank" rel="noopener">${I18N[currentLang].openInGoogleMaps}</a>
    </div>
  `;
}
```

（`I18N[currentLang].favoriteToggle`はTask 4で全言語分追加する。Task 3の時点では未定義のため`undefined`がaria-labelに入るが、構文・表示は壊れない。Task 4完了後に正しい文言になる。）

- [ ] **Step 3: ポップアップ内のハートボタンを配線する。`map.addLayer(clusterGroup);`の直後に追記する**

```js
// Popup content is regenerated by buildPopupHtml() every time Leaflet
// opens a popup (see marker.bindPopup(() => buildPopupHtml(spot)) above),
// so the heart button's click listener must be re-attached on every open
// rather than once at page load.
map.on('popupopen', (e) => {
  const el = e.popup.getElement();
  if (!el) return;
  const btn = el.querySelector('.favorite-heart');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const id = btn.dataset.favoriteId;
    toggleFavorite(id);
    btn.textContent = favorites.has(id) ? '♥' : '♡';
  });
});
```

- [ ] **Step 4: 検証する**

```bash
node -e "
const fs=require('fs');
const html=fs.readFileSync('prototype/map-leaflet.html','utf8');
console.assert(html.includes('class=\"favorite-heart\"'), 'missing favorite-heart button in popup template');
console.assert(html.includes('data-favorite-id'), 'missing data-favorite-id attribute');
console.assert(html.includes(\"map.on('popupopen'\"), 'missing popupopen wiring');
console.log('OK Task 3 structure present');
"
node -e "
const fs=require('fs');
const html=fs.readFileSync('prototype/map-leaflet.html','utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(s=>s.trim());
fs.writeFileSync('/tmp/map-extracted.js', scripts.join('\n\n'));
"
node --check /tmp/map-extracted.js && echo "SYNTAX OK"
```

- [ ] **Step 5: チェックポイント**

コミットして次のタスクへ。

---

### Task 4: お気に入りタブの一覧表示 ＋ 多言語対応

**Files:**
- Modify: `prototype/map-leaflet.html`

**Interfaces:**
- Consumes: Task 1の`favorites`/`toggleFavorite`、Task 2の`#favorites-list`、既存の`translateSpotName`/`translateAnime`/`markersById`
- Produces: `function buildFavoritesTab(): void`, `function wireFavoritesTab(): void`。`applyLanguage()`から`buildFavoritesTab()`が呼ばれるようになる。

- [ ] **Step 1: `</style>`直前にCSSを追記する**

```css
  .favorite-item{display:flex;align-items:center;justify-content:space-between;padding:6px 8px;border-radius:12px;cursor:pointer;font-size:13px;}
  .favorite-item:hover{background:#f5f2ea;}
  .favorite-item .favorite-item-info{flex:1;min-width:0;}
  .favorite-item .favorite-item-name{font-weight:700;display:block;}
  .favorite-item .favorite-item-anime{font-size:11px;color:#888;display:block;}
  .favorite-remove-btn{background:none;border:none;font-size:16px;cursor:pointer;color:#999;padding:0 0 0 8px;flex-shrink:0;}
  .favorite-remove-btn:hover{color:#e8395a;}
```

- [ ] **Step 2: `buildPrefNav()`/`wirePrefNav()`の呼び出し（`buildPrefNav(); wirePrefNav();`）の直後に追記する**

```js
// Same build/wire split as buildAnimeFilter/buildPrefNav: buildFavoritesTab
// only renders (called again from applyLanguage() and toggleFavorite()),
// wireFavoritesTab attaches the one-time delegated click listener.
function buildFavoritesTab() {
  const container = document.getElementById('favorites-list');
  const favSpots = SPOTS.filter(s => favorites.has(s.id));
  if (favSpots.length === 0) {
    container.innerHTML = `<p class="favorites-empty">${I18N[currentLang].favoritesEmpty}</p>`;
    return;
  }
  container.innerHTML = favSpots.map(s => `
    <div class="favorite-item" data-id="${s.id}">
      <div class="favorite-item-info">
        <span class="favorite-item-name">${translateSpotName(s)}</span>
        <span class="favorite-item-anime">${translateAnime(s.anime)}</span>
      </div>
      <button class="favorite-remove-btn" type="button" data-remove-id="${s.id}" aria-label="${I18N[currentLang].removeFavorite}">×</button>
    </div>
  `).join('');
}

function wireFavoritesTab() {
  const container = document.getElementById('favorites-list');
  container.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('.favorite-remove-btn');
    if (removeBtn) {
      toggleFavorite(removeBtn.dataset.removeId);
      return;
    }
    const item = e.target.closest('.favorite-item');
    if (item) {
      const spot = SPOTS.find(s => s.id === item.dataset.id);
      if (spot) {
        map.flyTo([spot.lat, spot.lng], 15);
        markersById[spot.id].openPopup();
      }
    }
  });
}

buildFavoritesTab();
wireFavoritesTab();
```

- [ ] **Step 3: `I18N`の6言語ブロックそれぞれに、下記キーを追記する（各言語オブジェクトの最後のキーの後にカンマを追加してから続ける）**

`ja`ブロック（`openInGoogleMaps: 'Googleマップで開く'`の後）:
```js
    openInGoogleMaps: 'Googleマップで開く',
    filterTab: '絞り込み',
    favoritesTab: 'お気に入り',
    favoritesEmpty: 'まだお気に入りがありません',
    favoriteToggle: 'お気に入りに追加',
    removeFavorite: 'お気に入りから削除'
```

`en`ブロック（`openInGoogleMaps: 'Open in Google Maps'`の後）:
```js
    openInGoogleMaps: 'Open in Google Maps',
    filterTab: 'Filter',
    favoritesTab: 'Favorites',
    favoritesEmpty: 'No favorites yet.',
    favoriteToggle: 'Add to favorites',
    removeFavorite: 'Remove from favorites'
```

`zh-TW`ブロック（`openInGoogleMaps: '在Google地圖開啟'`の後）:
```js
    openInGoogleMaps: '在Google地圖開啟',
    filterTab: '篩選',
    favoritesTab: '收藏',
    favoritesEmpty: '尚無收藏的地點。',
    favoriteToggle: '加入收藏',
    removeFavorite: '從收藏中移除'
```

`ko`ブロック（`openInGoogleMaps: 'Google 지도에서 열기'`の後）:
```js
    openInGoogleMaps: 'Google 지도에서 열기',
    filterTab: '필터',
    favoritesTab: '즐겨찾기',
    favoritesEmpty: '아직 즐겨찾기가 없습니다.',
    favoriteToggle: '즐겨찾기에 추가',
    removeFavorite: '즐겨찾기에서 삭제'
```

`th`ブロック（`openInGoogleMaps: 'เปิดใน Google Maps'`の後）:
```js
    openInGoogleMaps: 'เปิดใน Google Maps',
    filterTab: 'ตัวกรอง',
    favoritesTab: 'รายการโปรด',
    favoritesEmpty: 'ยังไม่มีรายการโปรด',
    favoriteToggle: 'เพิ่มในรายการโปรด',
    removeFavorite: 'ลบออกจากรายการโปรด'
```

`fr`ブロック（`openInGoogleMaps: 'Ouvrir dans Google Maps'`の後）:
```js
    openInGoogleMaps: 'Ouvrir dans Google Maps',
    filterTab: 'Filtrer',
    favoritesTab: 'Favoris',
    favoritesEmpty: 'Aucun favori pour le moment.',
    favoriteToggle: 'Ajouter aux favoris',
    removeFavorite: 'Retirer des favoris'
```

- [ ] **Step 4: `applyLanguage(lang)`を書き換え、タブラベルの更新と`buildFavoritesTab()`呼び出しを追加する**

既存:
```js
function applyLanguage(lang) {
  currentLang = lang;
  document.title = I18N[lang].title;
  document.documentElement.lang = lang;
  document.getElementById('anime-search-input').placeholder = I18N[lang].searchPlaceholder;
  document.querySelectorAll('.type-chip').forEach(chip => {
    chip.textContent = I18N[lang].types[chip.dataset.type];
  });
  document.querySelector('#pref-nav h4').textContent = I18N[lang].prefNavHeader;
  document.getElementById('privacy-link').textContent = I18N[lang].privacyLink;
  buildAnimeFilter();
  buildPrefNav();
}
```

書き換え後:
```js
function applyLanguage(lang) {
  currentLang = lang;
  document.title = I18N[lang].title;
  document.documentElement.lang = lang;
  document.getElementById('anime-search-input').placeholder = I18N[lang].searchPlaceholder;
  document.querySelectorAll('.type-chip').forEach(chip => {
    chip.textContent = I18N[lang].types[chip.dataset.type];
  });
  document.querySelector('#pref-nav h4').textContent = I18N[lang].prefNavHeader;
  document.getElementById('privacy-link').textContent = I18N[lang].privacyLink;
  document.querySelector('.panel-tab[data-tab="filter"]').textContent = I18N[lang].filterTab;
  document.querySelector('.panel-tab[data-tab="favorites"]').textContent = '♡ ' + I18N[lang].favoritesTab;
  buildAnimeFilter();
  buildPrefNav();
  buildFavoritesTab();
}
```

- [ ] **Step 5: 検証する**

```bash
node -e "
const fs=require('fs');
const html=fs.readFileSync('prototype/map-leaflet.html','utf8');
console.assert(html.includes('function buildFavoritesTab'), 'missing buildFavoritesTab');
console.assert(html.includes('function wireFavoritesTab'), 'missing wireFavoritesTab');
console.assert(html.includes('buildFavoritesTab();'), 'buildFavoritesTab never called');
for (const key of ['filterTab','favoritesTab','favoritesEmpty','favoriteToggle','removeFavorite']) {
  const count = (html.match(new RegExp(key+':','g'))||[]).length;
  console.assert(count===6, 'expected '+key+' in all 6 I18N language blocks, found '+count);
}
console.log('OK Task 4 structure present');
"
node -e "
const fs=require('fs');
const html=fs.readFileSync('prototype/map-leaflet.html','utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(s=>s.trim());
fs.writeFileSync('/tmp/map-extracted.js', scripts.join('\n\n'));
"
node --check /tmp/map-extracted.js && echo "SYNTAX OK"
```

Expected: `OK Task 4 structure present`、`SYNTAX OK`、アサーションエラーなし。

- [ ] **Step 6: チェックポイント**

コミットして次のタスクへ。

---

### Task 5: 最終検証（ヘッドレスChrome・操作フロー）

**Files:**
- Modify: なし（検証のみ）

- [ ] **Step 1: コンソールエラーがないことを確認する**

```bash
FILE_URL="file:///$(cygpath -m "$(pwd)/prototype/map-leaflet.html")"
"C:/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --dump-dom --virtual-time-budget=8000 --enable-logging=stderr --v=1 "$FILE_URL" > /tmp/dump-map.html 2> /tmp/log-map.txt
grep -Ei "Uncaught|SyntaxError|TypeError|ReferenceError" /tmp/log-map.txt || echo "NO JS ERRORS FOUND"
```

- [ ] **Step 2: DOMスタブ環境で「ハートをクリック→お気に入りタブに反映→一覧クリックで地図移動→×で解除」の一連の流れをシミュレーションする**

このプロジェクトの既存の検証パターン（`FakeClassList`/`FakeEl`スタブ + `global.document`/`global.L`/`global.window`/`global.navigator`/`global.localStorage`を用意し、抽出したスクリプトと結合して1ファイルとして`node`実行する方式）に倣い、以下を確認するテストスクリプトを作成・実行する:

1. `toggleFavorite('kamakura-slamdunk-crossing')`を呼んだ後、`favorites.has('kamakura-slamdunk-crossing')`が`true`になる
2. `buildFavoritesTab()`実行後、`#favorites-list`のinnerHTMLに`favorite-item`が1件含まれる
3. `toggleFavorite('kamakura-slamdunk-crossing')`をもう一度呼ぶと`favorites`から削除され、`buildFavoritesTab()`後は`favorites-empty`が表示される

Expected: 上記3点がすべて成立する。

- [ ] **Step 3: 最終チェックポイント**

全て緑になったら、ユーザーに完了報告のうえコミット・プッシュする。
