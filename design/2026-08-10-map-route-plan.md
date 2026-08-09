# マップ「ルート作成」機能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `prototype/map-leaflet.html`のお気に入り機能を拡張し、お気に入りスポットを並べ替えて「ルート」として地図上に表示・Googleマップの経路検索に渡せるようにする。

**Architecture:** 既存の`favorites`（Set、メンバーシップ）はそのまま維持し、新たに順序を持つ`favoritesOrder`（配列）を追加する。`buildFavoritesTab()`を「順序に沿って描画し、↑↓ボタンを持つ」形に拡張し、`favoritesOrder.length >= 2`のときだけ表示されるルートアクション（地図上に線を描く／Googleマップで開く）を追加する。

**Tech Stack:** 既存と同じ、素のJS。地図描画はLeaflet標準の`L.polyline`。検証はNode.js（`node --check`、構造・ロジックアサーション、`localStorage`スタブ）とヘッドレスChrome。

## Global Constraints

- 対象ファイルは`prototype/map-leaflet.html`のみ（[design/2026-08-10-map-route-design.md](2026-08-10-map-route-design.md)）。前提として[お気に入り機能](2026-08-10-map-favorites-design.md)（`favorites` Set, `toggleFavorite`, `buildFavoritesTab`/`wireFavoritesTab`）が実装済みであること。
- `localStorage`の新規キーは`'pilgrimage-favorites-order'`固定。値はスポットID文字列のJSON配列（並び順を表す）。
- `favoritesOrder`は`favorites`から独立した状態を持たず、`syncFavoritesOrder()`によって常に`favorites`のメンバーシップと整合させる（`favorites`が正、`favoritesOrder`はその順序付けレイヤー）。
- 既存の`buildX()`/`wireX()`分離パターンを踏襲する。
- ルートアクション（地図で見る／Googleマップで開くボタン）はお気に入りが2件未満のとき非表示にする。
- アクセントカラーは既存の`#FF4D6D`を踏襲する。
- 6言語のUI文言は既存の`I18N`オブジェクトに追記する。
- 各タスクの検証は次を必ず行う: ①`node --check`（インラインスクリプト抽出後）、②`node -e`によるHTML構造・ロジックアサーション、③最終タスクでヘッドレスChromeによる実行時コンソールエラーチェック。

---

### Task 1: 並び順データ層（favoritesOrder）

**Files:**
- Modify: `prototype/map-leaflet.html`

**Interfaces:**
- Produces: `let favoritesOrder`（`Array<string>`）, `function saveFavoritesOrder(): void`, `function syncFavoritesOrder(): void`, `function moveFavorite(id: string, direction: number): void`
- Consumes: 既存の`favorites`（Set）

- [ ] **Step 1: 既存の`function toggleFavorite(id) { ... }`の直後（`// UI-text-only translations...`コメントの直前）に追記する**

```js
const FAVORITES_ORDER_KEY = 'pilgrimage-favorites-order';

let favoritesOrder;
try {
  favoritesOrder = JSON.parse(localStorage.getItem(FAVORITES_ORDER_KEY) || '[]');
} catch (e) {
  favoritesOrder = [];
}

function saveFavoritesOrder() {
  localStorage.setItem(FAVORITES_ORDER_KEY, JSON.stringify(favoritesOrder));
}

// Reconciles favoritesOrder with the current favorites Set: keeps existing
// entries in their relative order, appends newly favorited ids at the end,
// and drops ids that were unfavorited. Called at the top of every
// buildFavoritesTab() render (Task 2) so favoritesOrder stays in sync
// without needing a separate hook into toggleFavorite().
function syncFavoritesOrder() {
  favoritesOrder = favoritesOrder.filter(id => favorites.has(id));
  for (const id of favorites) {
    if (!favoritesOrder.includes(id)) favoritesOrder.push(id);
  }
  saveFavoritesOrder();
}

function moveFavorite(id, direction) {
  const index = favoritesOrder.indexOf(id);
  const swapWith = index + direction;
  if (index === -1 || swapWith < 0 || swapWith >= favoritesOrder.length) return;
  [favoritesOrder[index], favoritesOrder[swapWith]] = [favoritesOrder[swapWith], favoritesOrder[index]];
  saveFavoritesOrder();
  buildFavoritesTab();
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

ロジック単体テスト（`localStorage`スタブを使い、`favorites`/`toggleFavorite`/`favoritesOrder`/`syncFavoritesOrder`/`moveFavorite`だけを抜き出して検証する。抽出範囲は既存の favorites データ層＋本タスクの追記分をまとめて1ブロックとして扱う）:

```bash
node -e "
const fs=require('fs');
const html=fs.readFileSync('prototype/map-leaflet.html','utf8');
const src=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(s=>s.trim()).join('\n\n');
const m=src.match(/const FAVORITES_KEY[\s\S]*?function moveFavorite\(id, direction\) \{[\s\S]*?\r?\n\}\r?\n/);
if (!m) { console.error('could not extract data-layer block'); process.exit(1); }
const store={};
global.localStorage={getItem:(k)=>(k in store?store[k]:null), setItem:(k,v)=>{store[k]=v;}};
function buildFavoritesTab(){} // stub — real rendering is Task 2's concern
eval(m[0]);
toggleFavorite('a'); toggleFavorite('b'); toggleFavorite('c');
syncFavoritesOrder();
console.assert(JSON.stringify(favoritesOrder)===JSON.stringify(['a','b','c']), 'expected order [a,b,c] after 3 adds, got '+JSON.stringify(favoritesOrder));
moveFavorite('a', 1);
console.assert(JSON.stringify(favoritesOrder)===JSON.stringify(['b','a','c']), 'expected [b,a,c] after moving a down, got '+JSON.stringify(favoritesOrder));
moveFavorite('b', -1);
console.assert(JSON.stringify(favoritesOrder)===JSON.stringify(['b','a','c']), 'moving first item up should be a no-op, got '+JSON.stringify(favoritesOrder));
console.assert(JSON.parse(store['pilgrimage-favorites-order']).length===3, 'favoritesOrder should be persisted');
toggleFavorite('a');
syncFavoritesOrder();
console.assert(JSON.stringify(favoritesOrder)===JSON.stringify(['b','c']), 'expected [b,c] after removing a, got '+JSON.stringify(favoritesOrder));
console.log('OK favoritesOrder data layer verified');
"
```

Expected: `SYNTAX OK`、`OK favoritesOrder data layer verified`。

- [ ] **Step 3: チェックポイント**

コミットして次のタスクへ。

---

### Task 2: お気に入り一覧に↑↓並べ替えボタンを追加

**Files:**
- Modify: `prototype/map-leaflet.html`

**Interfaces:**
- Consumes: Task 1の`favoritesOrder`/`syncFavoritesOrder`/`moveFavorite`
- Produces: 書き換えられた`buildFavoritesTab()`（順序描画＋↑↓ボタン、`#route-actions`の表示切替を含む。`#route-actions`要素自体はTask 3で追加するため、本タスクの時点では`document.getElementById('route-actions')`が`null`を返し得る。防御的に`?.classList.toggle(...)`とする）

- [ ] **Step 1: `</style>`直前にCSSを追記する**

```css
  .favorite-item-actions{display:flex;align-items:center;gap:2px;flex-shrink:0;}
  .favorite-move-btn{background:none;border:none;font-size:14px;cursor:pointer;color:#999;padding:0 4px;}
  .favorite-move-btn:hover:not(:disabled){color:#1a5fc4;}
  .favorite-move-btn:disabled{opacity:0.25;cursor:default;}
```

- [ ] **Step 2: `buildFavoritesTab()`を書き換える**

既存:
```js
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
```

書き換え後:
```js
function buildFavoritesTab() {
  syncFavoritesOrder();
  const container = document.getElementById('favorites-list');
  const favSpots = favoritesOrder.map(id => SPOTS.find(s => s.id === id)).filter(Boolean);
  if (favSpots.length === 0) {
    container.innerHTML = `<p class="favorites-empty">${I18N[currentLang].favoritesEmpty}</p>`;
    document.getElementById('route-actions')?.classList.add('hidden');
    return;
  }
  container.innerHTML = favSpots.map((s, i) => `
    <div class="favorite-item" data-id="${s.id}">
      <div class="favorite-item-info">
        <span class="favorite-item-name">${translateSpotName(s)}</span>
        <span class="favorite-item-anime">${translateAnime(s.anime)}</span>
      </div>
      <div class="favorite-item-actions">
        <button class="favorite-move-btn" type="button" data-move-id="${s.id}" data-direction="-1" aria-label="${I18N[currentLang].moveUp}"${i === 0 ? ' disabled' : ''}>↑</button>
        <button class="favorite-move-btn" type="button" data-move-id="${s.id}" data-direction="1" aria-label="${I18N[currentLang].moveDown}"${i === favSpots.length - 1 ? ' disabled' : ''}>↓</button>
        <button class="favorite-remove-btn" type="button" data-remove-id="${s.id}" aria-label="${I18N[currentLang].removeFavorite}">×</button>
      </div>
    </div>
  `).join('');
  document.getElementById('route-actions')?.classList.toggle('hidden', favSpots.length < 2);
}
```

- [ ] **Step 3: `wireFavoritesTab()`を書き換え、↑↓ボタンのクリックを配線する**

既存:
```js
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
```

書き換え後:
```js
function wireFavoritesTab() {
  const container = document.getElementById('favorites-list');
  container.addEventListener('click', (e) => {
    const moveBtn = e.target.closest('.favorite-move-btn');
    if (moveBtn) {
      moveFavorite(moveBtn.dataset.moveId, Number(moveBtn.dataset.direction));
      return;
    }
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
```

- [ ] **Step 4: 検証する**

```bash
node -e "
const fs=require('fs');
const html=fs.readFileSync('prototype/map-leaflet.html','utf8');
console.assert(html.includes('favorite-move-btn'), 'missing favorite-move-btn');
console.assert(html.includes('syncFavoritesOrder()'), 'buildFavoritesTab should call syncFavoritesOrder');
console.assert(html.includes('moveFavorite(moveBtn.dataset.moveId'), 'missing moveFavorite wiring');
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

### Task 3: ルートアクション（地図に線を描く／Googleマップで開く）

**Files:**
- Modify: `prototype/map-leaflet.html`

**Interfaces:**
- Consumes: Task 1の`favoritesOrder`/`syncFavoritesOrder`
- Produces: `#route-actions`（`#view-route-btn`, `#open-route-gmaps-btn`を含む）、`function viewRouteOnMap(): void`、`function openRouteInGoogleMaps(): void`、`let routeLine`

- [ ] **Step 1: `</style>`直前にCSSを追記する**

```css
  #route-actions{display:flex;flex-direction:column;gap:6px;margin-top:10px;padding-top:10px;border-top:1px solid #f0ede4;}
  #route-actions.hidden{display:none;}
  #route-actions button{border-radius:999px;padding:8px 0;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;border:2px solid #FF4D6D;}
  #view-route-btn{background:#FF4D6D;color:#fff;}
  #view-route-btn:hover{background:#e8395a;border-color:#e8395a;}
  #open-route-gmaps-btn{background:#fff;color:#FF4D6D;}
  #open-route-gmaps-btn:hover{background:#ffe3ea;}
```

- [ ] **Step 2: `#favorites-tab-content`内、`<div id="favorites-list"></div>`の直後に追記する**

既存:
```html
  <div id="favorites-tab-content" class="hidden">
    <div id="favorites-list"></div>
  </div>
```

書き換え後:
```html
  <div id="favorites-tab-content" class="hidden">
    <div id="favorites-list"></div>
    <div id="route-actions" class="hidden">
      <button id="view-route-btn" type="button">ルートを地図で見る</button>
      <button id="open-route-gmaps-btn" type="button">Googleマップでルートを開く</button>
    </div>
  </div>
```

- [ ] **Step 3: `buildFavoritesTab(); wireFavoritesTab();`の直後に追記する**

```js
let routeLine = null;

function viewRouteOnMap() {
  syncFavoritesOrder();
  const latlngs = favoritesOrder.map(id => {
    const s = SPOTS.find(sp => sp.id === id);
    return [s.lat, s.lng];
  });
  if (routeLine) map.removeLayer(routeLine);
  routeLine = L.polyline(latlngs, { color: '#FF4D6D', weight: 3, dashArray: '6, 8' }).addTo(map);
  map.fitBounds(routeLine.getBounds(), { padding: [40, 40] });
}

function openRouteInGoogleMaps() {
  syncFavoritesOrder();
  const spots = favoritesOrder.map(id => SPOTS.find(s => s.id === id));
  const origin = `${spots[0].lat},${spots[0].lng}`;
  const destination = `${spots[spots.length - 1].lat},${spots[spots.length - 1].lng}`;
  const waypoints = spots.slice(1, -1).map(s => `${s.lat},${s.lng}`).join('|');
  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
  if (waypoints) url += `&waypoints=${encodeURIComponent(waypoints)}`;
  window.open(url, '_blank', 'noopener');
}

document.getElementById('view-route-btn').addEventListener('click', viewRouteOnMap);
document.getElementById('open-route-gmaps-btn').addEventListener('click', openRouteInGoogleMaps);
```

- [ ] **Step 4: 検証する**

```bash
node -e "
const fs=require('fs');
const html=fs.readFileSync('prototype/map-leaflet.html','utf8');
console.assert(html.includes('id=\"route-actions\"'), 'missing route-actions container');
console.assert(html.includes('id=\"view-route-btn\"'), 'missing view-route-btn');
console.assert(html.includes('id=\"open-route-gmaps-btn\"'), 'missing open-route-gmaps-btn');
console.assert(html.includes('function viewRouteOnMap'), 'missing viewRouteOnMap');
console.assert(html.includes('function openRouteInGoogleMaps'), 'missing openRouteInGoogleMaps');
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

ロジック単体テスト（`openRouteInGoogleMaps`が生成するURLの検証。`map`/`L`/`window.open`をスタブし、3スポットのルートで`origin`/`destination`/`waypoints`が正しく組まれることを確認する）:

```bash
node -e "
const fs=require('fs');
const html=fs.readFileSync('prototype/map-leaflet.html','utf8');
const src=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(s=>s.trim()).join('\n\n');
const m=src.match(/function openRouteInGoogleMaps\(\) \{[\s\S]*?\n\}\r?\n/);
if (!m) { console.error('could not extract openRouteInGoogleMaps'); process.exit(1); }
const SPOTS = [
  { id: 'a', lat: 35.1, lng: 139.1 },
  { id: 'b', lat: 35.2, lng: 139.2 },
  { id: 'c', lat: 35.3, lng: 139.3 },
];
let favoritesOrder = ['a', 'b', 'c'];
function syncFavoritesOrder() {}
let openedUrl = null;
global.window = { open: (url) => { openedUrl = url; } };
eval(m[0]);
openRouteInGoogleMaps();
console.assert(openedUrl.includes('origin=35.1,139.1'), 'origin should be the first spot, got '+openedUrl);
console.assert(openedUrl.includes('destination=35.3,139.3'), 'destination should be the last spot, got '+openedUrl);
console.assert(openedUrl.includes(encodeURIComponent('35.2,139.2')), 'waypoints should include the middle spot, got '+openedUrl);
console.log('OK openRouteInGoogleMaps URL verified');
"
```

Expected: `SYNTAX OK`、`OK Task 3 structure present`、`OK openRouteInGoogleMaps URL verified`。

- [ ] **Step 5: チェックポイント**

コミットして次のタスクへ。

---

### Task 4: 多言語対応

**Files:**
- Modify: `prototype/map-leaflet.html`

**Interfaces:**
- Consumes: なし
- Produces: `I18N`の6言語ブロックへの追記、`applyLanguage()`からのボタンテキスト更新

- [ ] **Step 1: `I18N`の6言語ブロックそれぞれに、下記キーを追記する**

`ja`ブロック（`removeFavorite: 'お気に入りから削除'`の後）:
```js
    removeFavorite: 'お気に入りから削除',
    moveUp: '上へ移動',
    moveDown: '下へ移動',
    viewRouteOnMap: 'ルートを地図で見る',
    openRouteInGoogleMaps: 'Googleマップでルートを開く'
```

`en`ブロック（`removeFavorite: 'Remove from favorites'`の後）:
```js
    removeFavorite: 'Remove from favorites',
    moveUp: 'Move up',
    moveDown: 'Move down',
    viewRouteOnMap: 'View route on map',
    openRouteInGoogleMaps: 'Open route in Google Maps'
```

`zh-TW`ブロック（`removeFavorite: '從收藏中移除'`の後）:
```js
    removeFavorite: '從收藏中移除',
    moveUp: '上移',
    moveDown: '下移',
    viewRouteOnMap: '在地圖上查看路線',
    openRouteInGoogleMaps: '在Google地圖開啟路線'
```

`ko`ブロック（`removeFavorite: '즐겨찾기에서 삭제'`の後）:
```js
    removeFavorite: '즐겨찾기에서 삭제',
    moveUp: '위로 이동',
    moveDown: '아래로 이동',
    viewRouteOnMap: '지도에서 경로 보기',
    openRouteInGoogleMaps: 'Google 지도에서 경로 열기'
```

`th`ブロック（`removeFavorite: 'ลบออกจากรายการโปรด'`の後）:
```js
    removeFavorite: 'ลบออกจากรายการโปรด',
    moveUp: 'เลื่อนขึ้น',
    moveDown: 'เลื่อนลง',
    viewRouteOnMap: 'ดูเส้นทางบนแผนที่',
    openRouteInGoogleMaps: 'เปิดเส้นทางใน Google Maps'
```

`fr`ブロック（`removeFavorite: 'Retirer des favoris'`の後）:
```js
    removeFavorite: 'Retirer des favoris',
    moveUp: 'Monter',
    moveDown: 'Descendre',
    viewRouteOnMap: "Voir l'itinéraire sur la carte",
    openRouteInGoogleMaps: "Ouvrir l'itinéraire dans Google Maps"
```

- [ ] **Step 2: `applyLanguage(lang)`内、`buildFavoritesTab();`の直前にボタンテキスト更新を追加する**

既存:
```js
  document.querySelector('.panel-tab[data-tab="filter"]').textContent = I18N[lang].filterTab;
  document.querySelector('.panel-tab[data-tab="favorites"]').textContent = '♡ ' + I18N[lang].favoritesTab;
  buildAnimeFilter();
  buildPrefNav();
  buildFavoritesTab();
}
```

書き換え後:
```js
  document.querySelector('.panel-tab[data-tab="filter"]').textContent = I18N[lang].filterTab;
  document.querySelector('.panel-tab[data-tab="favorites"]').textContent = '♡ ' + I18N[lang].favoritesTab;
  document.getElementById('view-route-btn').textContent = I18N[lang].viewRouteOnMap;
  document.getElementById('open-route-gmaps-btn').textContent = I18N[lang].openRouteInGoogleMaps;
  buildAnimeFilter();
  buildPrefNav();
  buildFavoritesTab();
}
```

- [ ] **Step 3: 検証する**

```bash
node -e "
const fs=require('fs');
const html=fs.readFileSync('prototype/map-leaflet.html','utf8');
for (const key of ['moveUp','moveDown','viewRouteOnMap','openRouteInGoogleMaps']) {
  const count = (html.match(new RegExp(key+':','g'))||[]).length;
  console.assert(count===6, 'expected '+key+' in all 6 I18N language blocks, found '+count);
}
console.assert(html.includes(\"getElementById('view-route-btn').textContent\"), 'applyLanguage should update view-route-btn text');
console.log('OK Task 4 I18N verified');
"
node -e "
const fs=require('fs');
const html=fs.readFileSync('prototype/map-leaflet.html','utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(s=>s.trim());
fs.writeFileSync('/tmp/map-extracted.js', scripts.join('\n\n'));
"
node --check /tmp/map-extracted.js && echo "SYNTAX OK"
```

- [ ] **Step 4: チェックポイント**

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

- [ ] **Step 2: DOMスタブ環境で「3件お気に入り追加→並べ替え→ルートアクションの表示切替→2件未満で非表示」の一連の流れをシミュレーションする**

このプロジェクトの既存の検証パターン（`FakeEl`スタブ + `global.document`/`global.localStorage`を用意し、抽出したスクリプトと結合して1ファイルとして`node`実行する方式、[お気に入り機能のTask 5](2026-08-10-map-favorites-plan.md)と同様）に倣い、以下を確認するテストスクリプトを作成・実行する:

1. お気に入りを0件→1件に増やしても`#route-actions`は`hidden`のまま
2. 2件目を追加すると`#route-actions`から`hidden`が外れる
3. `moveFavorite`で並び替えた結果が、次の`buildFavoritesTab()`描画に反映される（1件目・2件目の`.favorite-item-name`の表示順が入れ替わる）
4. 1件まで減らすと`#route-actions`に`hidden`が再度付与される

Expected: 上記4点がすべて成立する。

- [ ] **Step 3: 最終チェックポイント**

全て緑になったら、ユーザーに完了報告のうえコミット・プッシュする。
