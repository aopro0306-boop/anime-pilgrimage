# アニメ聖地巡礼マップ プロトタイプ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `research/anime-pilgrimage-spots.md` に登場する全アニメ聖地・関連施設（約78件）を、日本地図（自作SVG）の上にプロットし、作品名／スポット種別で絞り込み・都道府県ズーム・詳細カード表示ができる単一HTMLのWebプロトタイプ（Artifact）を作る。

**Architecture:** 単一の自己完結HTMLファイル（`anime-pilgrimage-app/prototype/map-prototype.html`）に、都道府県境界SVGパス・スポットデータ・描画ロジック・インタラクションロジックをすべてインライン化する。都道府県境界はパブリックドメインのGeoJSONをビルド時（Node.jsスクリプト）に取得・簡略化してSVGパス化し、スポットの緯度経度と同一の投影パラメータで座標変換することでピンと地図を正しく重ね合わせる。

**Tech Stack:** 素のHTML/CSS/JavaScript（フレームワーク・外部ライブラリ・CDN依存なし）。データ生成のみNode.js（v24で動作確認済み）を使用。

## Global Constraints

- Artifactの制約上、公開後のページから外部ホストへの通信（fetch/XHR/外部タイル読み込み等）は一切行わない。都道府県境界・スポットデータはすべて静的にファイルへ埋め込む。
- 唯一の例外は詳細カードの「Googleマップで開く」リンク（`<a href="https://www.google.com/maps/search/?api=1&query=...">`）。これは通信ではなく単純なページ遷移（別タブで開くナビゲーション）であり許容される。
- 表示言語は日本語のみ（多言語対応は本番アプリ実装時の別スコープ）。
- 出力ファイル `anime-pilgrimage-app/prototype/map-prototype.html` には `<!DOCTYPE>` `<html>` `<head>` `<body>` タグを含めない（Artifact公開時に自動でラップされるため）。`<title>` はファイル内に書かず、Artifact公開時に `title` パラメータで渡す。
- **テスト方針**: この環境にはヘッドレスブラウザ／DOM検証ツールがないため、自動テストは (a) データ生成タスクでは `node -e` によるJSON構造・件数・数値範囲のアサーション、(b) DOM操作を伴うタスクでは埋め込みスクリプトを抽出して `node --check` で構文検証、を用いる。実際の見た目・操作感の最終確認は、最後のタスクでArtifactとして公開したものをユーザーが目視で確認する。
- データの座標精度は「デモとして地図上の位置がおおよそ正しく見える」レベルで十分（緯度経度は小数点以下4桁程度）。番地レベルの精度は不要。

---

## File Structure

- `anime-pilgrimage-app/prototype/map-prototype.html` — 唯一の成果物。Task 1〜7で段階的に追記・編集し、Task 8でArtifactとして公開する。
- スクラッチ用の一時ファイル（GeoJSONダウンロード・生成スクリプト）は各自のスクラッチパッドディレクトリに置き、成果物には含めない。

---

### Task 1: 都道府県境界データの取得とSVGパス生成

**Files:**
- Create: `anime-pilgrimage-app/prototype/map-prototype.html`（このタスクで新規作成）
- Create（一時）: スクラッチパッド内 `japan.geojson`, `generate-map-data.js`

**Interfaces:**
- Produces: `map-prototype.html` 内に以下のグローバル定数を定義する `<script>` ブロック
  - `const PROJECTION = { minLng: number, maxLat: number, cosAvg: number, scale: number, width: number, height: number }`
  - `const PREFECTURES = [{ id: number, name: string, path: string, bbox: { minX, minY, maxX, maxY } }, ...]`（47件）
  - 後続タスクはこの2つの定数名・形状をそのまま利用する。

- [ ] **Step 1: GeoJSONを取得する**

自分のスクラッチパッドディレクトリで実行:

```bash
curl -s -o japan.geojson "https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson"
node -e "const d=require('./japan.geojson'); console.log(d.features.length, d.features[0].properties)"
```

Expected: `47 { nam: 'Kyoto Fu', nam_ja: '京都府', id: 26 }`（都道府県数と、`nam_ja`にカタカナでなく漢字の都道府県名が入っていることを確認）

- [ ] **Step 2: 生成スクリプトを書く**

同じディレクトリに `generate-map-data.js` を作成:

```javascript
const fs = require('fs');

function distanceToSegment(p, a, b) {
  const [px, py] = p, [ax, ay] = a, [bx, by] = b;
  const dx = bx - ax, dy = by - ay;
  if (dx === 0 && dy === 0) return Math.hypot(px - ax, py - ay);
  const t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  const clamped = Math.max(0, Math.min(1, t));
  const cx = ax + clamped * dx, cy = ay + clamped * dy;
  return Math.hypot(px - cx, py - cy);
}

function simplify(points, epsilon) {
  if (points.length < 3) return points;
  let maxDist = 0, index = 0;
  const first = points[0], last = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = distanceToSegment(points[i], first, last);
    if (d > maxDist) { maxDist = d; index = i; }
  }
  if (maxDist > epsilon) {
    const left = simplify(points.slice(0, index + 1), epsilon);
    const right = simplify(points.slice(index), epsilon);
    return left.slice(0, -1).concat(right);
  }
  return [first, last];
}

const raw = JSON.parse(fs.readFileSync(__dirname + '/japan.geojson', 'utf8'));

let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
for (const f of raw.features) {
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  for (const poly of polys) for (const ring of poly) for (const [lng, lat] of ring) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }
}

const HEIGHT = 900;
const latRange = maxLat - minLat;
const cosAvg = Math.cos((minLat + maxLat) / 2 * Math.PI / 180);
const scale = HEIGHT / latRange;
const WIDTH = Math.round((maxLng - minLng) * cosAvg * scale);

function project([lng, lat]) {
  return [(lng - minLng) * cosAvg * scale, (maxLat - lat) * scale];
}

const prefectures = raw.features.map(f => {
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  let d = '';
  const bbox = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const poly of polys) {
    for (const ring of poly) {
      const projected = ring.map(project);
      const simplified = simplify(projected, 1.0);
      simplified.forEach(([x, y], i) => {
        d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1) + ' ';
        if (x < bbox.minX) bbox.minX = x;
        if (x > bbox.maxX) bbox.maxX = x;
        if (y < bbox.minY) bbox.minY = y;
        if (y > bbox.maxY) bbox.maxY = y;
      });
      d += 'Z ';
    }
  }
  return { id: f.properties.id, name: f.properties.nam_ja, path: d.trim(), bbox };
});

const PROJECTION = { minLng, maxLat, cosAvg, scale, width: WIDTH, height: HEIGHT };

const output = `<style>
*{box-sizing:border-box;margin:0;padding:0;}
</style>
<div id="map-root">
  <svg id="map-svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="100%" height="100%"></svg>
</div>
<script>
const PROJECTION = ${JSON.stringify(PROJECTION)};
const PREFECTURES = ${JSON.stringify(prefectures)};
</script>
`;

const outPath = 'c:/Users/aoppp/OneDrive/ドキュメント/work/anime-pilgrimage-app/prototype/map-prototype.html';
fs.mkdirSync(require('path').dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, output);
console.log('prefectures:', prefectures.length, 'viewBox:', WIDTH, HEIGHT);
```

- [ ] **Step 3: スクリプトを実行する**

```bash
node generate-map-data.js
```

Expected: `prefectures: 47 viewBox: <900〜1100の間の数値> 900`

- [ ] **Step 4: 生成結果を検証する**

```bash
node -e "
const fs=require('fs');
const html=fs.readFileSync('c:/Users/aoppp/OneDrive/ドキュメント/work/anime-pilgrimage-app/prototype/map-prototype.html','utf8');
const prefMatch=html.match(/const PREFECTURES = (\[[\s\S]*?\]);/);
const projMatch=html.match(/const PROJECTION = (\{[\s\S]*?\});/);
const prefectures=JSON.parse(prefMatch[1]);
const projection=JSON.parse(projMatch[1]);
console.assert(prefectures.length===47, 'expected 47 prefectures, got '+prefectures.length);
console.assert(prefectures.every(p=>typeof p.path==='string' && p.path.startsWith('M')), 'invalid path found');
console.assert(projection.width>500 && projection.width<1500, 'unexpected width '+projection.width);
console.assert(projection.height===900, 'unexpected height');
console.log('OK', prefectures.length, projection.width, projection.height);
"
```

Expected: `OK 47 <width> 900`（アサーションエラーが出ないこと）

- [ ] **Step 5: チェックポイント**

このタスクでは自動コミットは行わない（このプロジェクトはgit管理されていないため）。次のタスクに進む前に、Step 4の検証が全てパスしていることを確認する。

---

### Task 2: 聖地スポットデータの収集と埋め込み

**Files:**
- Modify: `anime-pilgrimage-app/prototype/map-prototype.html`（Task 1で作成した `<script>` ブロック内に `SPOTS` を追記）

**Interfaces:**
- Consumes: なし（Task 1の成果物ファイルに追記するのみ）
- Produces: `const SPOTS = [...]`（78件）。各要素は以下の型:
  ```
  {
    id: string,          // 一意なkebab-case ID
    name: string,         // スポット名
    anime: string,         // 作品名
    prefecture: string,     // 都道府県（例: "神奈川県"。Task1のPREFECTURES.nameと表記を合わせる）
    lat: number,
    lng: number,
    type: "scene" | "monument" | "inspiration",
    description: string,     // 1〜2文の概要
    mapsQuery: string       // Googleマップ検索用の文字列（例: "鎌倉高校前駅 踏切"）
  }
  ```
  後続タスク（Task 3以降）はこの `SPOTS` 配列とフィールド名をそのまま利用する。

- [ ] **Step 1: スキーマ例を確認する**

以下5件は実装済みの参考例（そのまま使ってよい正確な値）:

```javascript
{ id:"kamakura-slamdunk-crossing", name:"鎌倉高校前駅1号踏切", anime:"SLAM DUNK", prefecture:"神奈川県", lat:35.3062, lng:139.5308, type:"scene", description:"OP映像で桜木花道が江ノ電を待つシーンのモデルとなった踏切。", mapsQuery:"鎌倉高校前駅 踏切" },
{ id:"washinomiya-jinja", name:"鷲宮神社", anime:"らき☆すた", prefecture:"埼玉県", lat:36.0898, lng:139.6754, type:"scene", description:"作中の「鷹宮神社」のモデル。痛絵馬発祥の地とされる、聖地巡礼文化の原点。", mapsQuery:"鷲宮神社 埼玉県久喜市" },
{ id:"kumamoto-luffy-statue", name:"ルフィ像", anime:"ONE PIECE", prefecture:"熊本県", lat:32.7898, lng:130.7379, type:"monument", description:"熊本地震からの復興を願い、熊本県庁プロムナードに設置された像。", mapsQuery:"ルフィ像 熊本県庁" },
{ id:"ueda-castle-summerwars", name:"上田城", anime:"サマーウォーズ", prefecture:"長野県", lat:36.4041, lng:138.2494, type:"scene", description:"陣内家の物語の舞台となった長野県上田市の城跡。", mapsQuery:"上田城" },
{ id:"dogo-onsen-honkan", name:"道後温泉本館", anime:"千と千尋の神隠し", prefecture:"愛媛県", lat:33.8518, lng:132.7862, type:"inspiration", description:"油屋のモデルの一つとされる、国指定重要文化財の共同浴場。", mapsQuery:"道後温泉本館" }
```

- [ ] **Step 2: 残り73件のスポットについて座標を調査する**

以下の完全なチェックリスト（作品名・所在地・種別）に対し、それぞれ「`<スポット名> <所在地>` 緯度経度」または施設名でWebSearchし、Step 1の形式に合わせて `SPOTS` 配列のエントリを作成する。`type` は以下の3値のいずれか: `scene`（実際の舞台・ロケ地）、`monument`（像・モニュメント・記念施設）、`inspiration`（着想元・非公式のモデル地）。

**君の名は。(scene, 岐阜県/東京都):**
飛騨古川駅(岐阜県飛騨市) / 気多若宮神社(岐阜県飛騨市) / 飛騨山王宮 日枝神社(岐阜県飛騨市) / 飛騨市図書館(岐阜県飛騨市) / 都立新宿高校(東京都新宿区) / 信濃町歩道橋(東京都新宿区) / KITTE丸の内屋上庭園(東京都千代田区)

**鬼滅の刃 (inspiration):** 宝満宮竈門神社(福岡県太宰府市) / 溝口竈門神社(福岡県筑後市) / 八幡竈門神社(大分県別府市)

**千と千尋の神隠し (inspiration):** 江戸東京たてもの園 子宝の湯(東京都小金井市) / 伊予鉄道 郡中港駅付近の海に続く線路(愛媛県伊予市)

**ゆるキャン△ (scene):** 笛吹川フルーツ公園(山梨県山梨市) / 四尾連湖 水明荘(山梨県西八代郡市川三郷町) / 内船駅(山梨県南巨摩郡南部町) / 高ボッチ高原(長野県塩尻市)

**進撃の巨人 (monument):** 日田駅南口広場 リヴァイ像(大分県日田市) / 大山ダム 少年期の像(大分県日田市) / 進撃の巨人 in HITAミュージアム(大分県日田市)

**けいおん! (scene):** 豊郷小学校旧校舎群(滋賀県犬上郡豊郷町) / 寺町京極商店街(京都府京都市)

**涼宮ハルヒの憂鬱 (scene):** 西宮北高等学校(兵庫県西宮市) / 甲陽園駅(兵庫県西宮市) / 西宮北口周辺(兵庫県西宮市)

**サマーウォーズ (scene):** 上田電鉄別所線 丸窓電車(長野県上田市) / 砥石・米山城跡(長野県上田市) / 海野町商店街(長野県上田市)

**ONE PIECE (monument):** チョッパー像 熊本市動植物園(熊本県熊本市) / ウソップ像(熊本県阿蘇市) / フランキー像(熊本県高森町) / サンジ像(熊本県益城町) / ブルック像(熊本県御船町) / ゾロ像(熊本県大津町) / ナミ像(熊本県西原村) / ロビン像(熊本県南阿蘇村) / ジンベエ像(熊本県宇土市)

**名探偵コナン (monument):** 青山剛昌ふるさと館(鳥取県北栄町) / コナン通り(鳥取県北栄町) / 由良駅 コナン駅(鳥取県北栄町)

**関連施設・銅像系 (monument):** 両さん銅像群 亀有駅周辺(東京都葛飾区) / 水木しげるロード(鳥取県境港市) / アトムの壁画・ゆかりの地一帯(東京都新宿区高田馬場) / 手塚プロダクション新座スタジオ関連(埼玉県新座市) / 藤子・F・不二雄ミュージアム(神奈川県川崎市)

**関連施設・マンホール系 (monument, 全国展開の代表例として1件):** ポケふた つくば市の例(茨城県つくば市)

**着想元 (inspiration):** 夏目友人帳のモデル地(熊本県人吉市) / すずめの戸締まり フェリーのモデル、代表点として松山観光港(愛媛県松山市) / 僕のヒーローアカデミア「尼花市」のモデル(愛知県尾張旭市)

**頭文字D (scene):** 榛名山の峠道 県道33号(群馬県渋川市) / 榛名湖(群馬県渋川市) / イニDマンホール(群馬県渋川市) / D'Z GARAGEレーシングカフェ(群馬県渋川市伊香保)

**ガールズ&パンツァー (scene):** 大洗磯前神社(茨城県大洗町) / 大洗マリンタワー(茨城県大洗町) / 大洗海岸(茨城県大洗町) / 大洗の商店街一帯(茨城県大洗町)

**あの花 (scene):** 羊山公園(埼玉県秩父市) / 秩父神社 妙見の森公園(埼玉県秩父市) / 秩父鉄道の踏切(埼玉県秩父市) / 西武秩父駅(埼玉県秩父市)

**氷菓 (scene):** 鍛冶橋(岐阜県高山市) / 弥生橋(岐阜県高山市) / 本町通り 招き猫像前(岐阜県高山市)

**弱虫ペダル (scene):** 千葉県立松戸高等学校(千葉県松戸市) / 京成佐倉駅(千葉県佐倉市) / 自転車の国サイクルスポーツセンター(静岡県伊豆市大野1826)

**WORKING!! (scene):** JR札幌駅周辺(北海道札幌市) / 熊の沢公園(北海道札幌市厚別区) / JR野幌駅周辺(北海道江別市)

**ばらかもん (scene):** 福江空港(長崎県五島市) / 鬼岳展望所(長崎県五島市) / 主人公の家 古民家のモデル地(長崎県五島市) / 奈留島(長崎県五島市)

合計: 上記5件（Step 1）+ 73件（Step 2）= 78件

- [ ] **Step 3: `map-prototype.html` に追記する**

Task 1で生成された `<script>` タグ内の `const PREFECTURES = [...];` の行の直後に、以下を追記する:

```javascript
const SPOTS = [ /* Step1の5件 + Step2の73件、合計78件のオブジェクトをカンマ区切りで並べる */ ];
```

- [ ] **Step 4: 検証する**

```bash
node -e "
const fs=require('fs');
const html=fs.readFileSync('c:/Users/aoppp/OneDrive/ドキュメント/work/anime-pilgrimage-app/prototype/map-prototype.html','utf8');
const spotsMatch=html.match(/const SPOTS = (\[[\s\S]*?\]);/);
const spots=JSON.parse(spotsMatch[1]);
console.assert(spots.length===78, 'expected 78 spots, got '+spots.length);
const validTypes=['scene','monument','inspiration'];
for (const s of spots){
  console.assert(typeof s.id==='string' && s.id.length>0, 'missing id: '+JSON.stringify(s));
  console.assert(typeof s.name==='string' && s.name.length>0, 'missing name: '+s.id);
  console.assert(typeof s.anime==='string' && s.anime.length>0, 'missing anime: '+s.id);
  console.assert(typeof s.prefecture==='string' && ['都','道','府','県'].some(suf=>s.prefecture.endsWith(suf)), 'bad prefecture: '+s.id+' '+s.prefecture);
  console.assert(s.lat>24 && s.lat<46, 'lat out of range: '+s.id+' '+s.lat);
  console.assert(s.lng>122 && s.lng<154, 'lng out of range: '+s.id+' '+s.lng);
  console.assert(validTypes.includes(s.type), 'bad type: '+s.id+' '+s.type);
  console.assert(typeof s.description==='string' && s.description.length>0, 'missing description: '+s.id);
  console.assert(typeof s.mapsQuery==='string' && s.mapsQuery.length>0, 'missing mapsQuery: '+s.id);
}
const ids=new Set(spots.map(s=>s.id));
console.assert(ids.size===spots.length, 'duplicate ids found');
console.log('OK', spots.length, 'spots validated');
"
```

Expected: `OK 78 spots validated`（アサーションエラーが出ないこと）

- [ ] **Step 5: チェックポイント**

Step 4の検証がすべてパスしたら次のタスクへ進む。

---

### Task 3: 地図描画エンジン（都道府県パス・ピン描画・投影）

**Files:**
- Modify: `anime-pilgrimage-app/prototype/map-prototype.html`

**Interfaces:**
- Consumes: `PROJECTION`, `PREFECTURES`, `SPOTS`（Task 1, 2で定義済み）
- Produces:
  - `function project(lat, lng): { x: number, y: number }`
  - `function renderMap(): void` — SVGに都道府県パスとピンを描画する
  - DOM要素: `#map-svg` 内に `<path class="prefecture" data-pref-id="...">`（47個）、`<circle class="pin" data-spot-id="..." data-type="...">`（78個）
  - 後続タスク（Task 4〜6）はこれらのクラス名・data属性をそのまま利用する。

- [ ] **Step 1: 投影関数と描画ロジックを追記する**

`map-prototype.html` の末尾の `<script>` ブロックに追記:

```javascript
function project(lat, lng) {
  return {
    x: (lng - PROJECTION.minLng) * PROJECTION.cosAvg * PROJECTION.scale,
    y: (PROJECTION.maxLat - lat) * PROJECTION.scale
  };
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function renderMap() {
  const svg = document.getElementById('map-svg');
  svg.innerHTML = '';

  const prefLayer = document.createElementNS(SVG_NS, 'g');
  prefLayer.setAttribute('id', 'prefecture-layer');
  for (const pref of PREFECTURES) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('class', 'prefecture');
    path.setAttribute('data-pref-id', pref.id);
    path.setAttribute('data-pref-name', pref.name);
    path.setAttribute('d', pref.path);
    prefLayer.appendChild(path);
  }
  svg.appendChild(prefLayer);

  const pinLayer = document.createElementNS(SVG_NS, 'g');
  pinLayer.setAttribute('id', 'pin-layer');
  for (const spot of SPOTS) {
    const { x, y } = project(spot.lat, spot.lng);
    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('class', 'pin');
    circle.setAttribute('data-spot-id', spot.id);
    circle.setAttribute('data-type', spot.type);
    circle.setAttribute('data-anime', spot.anime);
    circle.setAttribute('data-pref-name', spot.prefecture);
    circle.setAttribute('cx', x.toFixed(1));
    circle.setAttribute('cy', y.toFixed(1));
    circle.setAttribute('r', '4');
    pinLayer.appendChild(circle);
  }
  svg.appendChild(pinLayer);
}

renderMap();
```

- [ ] **Step 2: 構文チェック**

埋め込みスクリプトを抽出して構文検証する:

```bash
node -e "
const fs=require('fs');
const html=fs.readFileSync('c:/Users/aoppp/OneDrive/ドキュメント/work/anime-pilgrimage-app/prototype/map-prototype.html','utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
fs.writeFileSync('_extracted.js', scripts.join('\n'));
"
node --check _extracted.js && echo "SYNTAX OK"
rm _extracted.js
```

Expected: `SYNTAX OK`

- [ ] **Step 3: 座標整合性を確認する**

ピンの投影座標が対応する都道府県のbboxとおおむね重なっているか（大きくズレていないか）を機械的に確認する:

```bash
node -e "
const fs=require('fs');
const html=fs.readFileSync('c:/Users/aoppp/OneDrive/ドキュメント/work/anime-pilgrimage-app/prototype/map-prototype.html','utf8');
const proj=JSON.parse(html.match(/const PROJECTION = (\{[\s\S]*?\});/)[1]);
const spots=JSON.parse(html.match(/const SPOTS = (\[[\s\S]*?\]);/)[1]);
function project(lat,lng){return {x:(lng-proj.minLng)*proj.cosAvg*proj.scale, y:(proj.maxLat-lat)*proj.scale};}
let outOfBounds=0;
for (const s of spots){
  const {x,y}=project(s.lat,s.lng);
  if (x<0||x>proj.width||y<0||y>proj.height) { outOfBounds++; console.log('OUT OF BOUNDS:', s.id, x.toFixed(1), y.toFixed(1)); }
}
console.log('checked', spots.length, 'spots,', outOfBounds, 'out of view bounds');
"
```

Expected: `checked 78 spots, 0 out of view bounds`（0件でなければ該当スポットの緯度経度を見直す）

- [ ] **Step 4: チェックポイント**

Step 2・3が両方パスしたら次のタスクへ進む。

---

### Task 4: 作品名・スポット種別フィルター機能

**Files:**
- Modify: `anime-pilgrimage-app/prototype/map-prototype.html`

**Interfaces:**
- Consumes: `SPOTS`（Task 2）、`.pin[data-spot-id]`（Task 3で描画済みのDOM）
- Produces:
  - DOM: `#filter-panel`（作品名チェックリスト、種別トグルチップ）
  - `function applyFilters(): void` — 選択状態に応じて `.pin` に `hidden` クラスを付け外しする
  - 状態変数 `const filterState = { animes: Set<string>, types: Set<string> }`（後続タスクは参照しない想定だが、命名はここで固定する）

- [ ] **Step 1: フィルターパネルのHTMLとスタイルを追記する**

`<div id="map-root">` の直前に追記:

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
#filter-panel{position:absolute;top:0;left:0;z-index:10;padding:12px;max-width:280px;background:rgba(255,255,255,0.92);border-radius:8px;margin:12px;max-height:80vh;overflow-y:auto;}
#anime-filter label{display:block;font-size:13px;margin:2px 0;}
.type-chip{display:inline-block;margin:4px 4px 0 0;padding:4px 10px;border-radius:999px;border:1px solid #ccc;background:#fff;cursor:pointer;font-size:12px;}
.type-chip.active{background:#333;color:#fff;}
.pin.hidden{display:none;}
```

- [ ] **Step 2: フィルターロジックを追記する**

`renderMap();` の呼び出しの直後に追記:

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
  document.querySelectorAll('.pin').forEach(pin => {
    const anime = pin.dataset.anime;
    const type = pin.dataset.type;
    const visible = filterState.animes.has(anime) && filterState.types.has(type);
    pin.classList.toggle('hidden', !visible);
  });
}

buildAnimeFilter();
buildTypeFilter();
```

- [ ] **Step 3: 構文チェック**

Task 3のStep 2と同じ抽出コマンドを再実行し、`SYNTAX OK` になることを確認する。

- [ ] **Step 4: ロジックの単体確認**

フィルターの集合演算部分だけを切り出してNode上で検証する:

```bash
node -e "
const SPOTS=[{id:'a',anime:'X',type:'scene'},{id:'b',anime:'Y',type:'monument'}];
const filterState={animes:new Set(['X']), types:new Set(['scene','monument','inspiration'])};
const visible=SPOTS.filter(s=>filterState.animes.has(s.anime)&&filterState.types.has(s.type));
console.assert(visible.length===1 && visible[0].id==='a', 'filter logic broken');
console.log('OK filter logic');
"
```

Expected: `OK filter logic`

- [ ] **Step 5: チェックポイント**

Step 3・4がパスしたら次のタスクへ進む。

---

### Task 5: ピンクリック詳細カード＋Googleマップリンク

**Files:**
- Modify: `anime-pilgrimage-app/prototype/map-prototype.html`

**Interfaces:**
- Consumes: `SPOTS`, `.pin[data-spot-id]`
- Produces: `#detail-card`（DOM）、`function showDetailCard(spotId: string): void`、`function hideDetailCard(): void`

- [ ] **Step 1: 詳細カードのHTMLとスタイルを追記する**

`</div>`（`#map-root` の閉じタグ）の直後に追記:

```html
<div id="detail-card" class="hidden">
  <button id="detail-close">×</button>
  <div id="detail-type-badge"></div>
  <h2 id="detail-name"></h2>
  <p id="detail-anime"></p>
  <p id="detail-prefecture"></p>
  <p id="detail-description"></p>
  <a id="detail-maps-link" href="#" target="_blank" rel="noopener">Googleマップで開く</a>
</div>
```

`<style>` に追記:

```css
#detail-card{position:absolute;right:12px;top:12px;z-index:20;width:280px;padding:16px;background:#fff;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.2);}
#detail-card.hidden{display:none;}
#detail-close{position:absolute;top:8px;right:8px;border:none;background:none;font-size:16px;cursor:pointer;}
#detail-type-badge{display:inline-block;font-size:11px;padding:2px 8px;border-radius:999px;background:#eee;margin-bottom:6px;}
#detail-maps-link{display:inline-block;margin-top:8px;font-size:13px;}
```

- [ ] **Step 2: 表示ロジックを追記する**

`applyFilters();`（Task 4末尾の呼び出しの前後どちらでも可）の後に追記:

```javascript
const TYPE_LABELS = { scene: '実際の舞台', monument: '像・モニュメント', inspiration: '着想元' };

function showDetailCard(spotId) {
  const spot = SPOTS.find(s => s.id === spotId);
  if (!spot) return;
  document.getElementById('detail-type-badge').textContent = TYPE_LABELS[spot.type];
  document.getElementById('detail-name').textContent = spot.name;
  document.getElementById('detail-anime').textContent = spot.anime;
  document.getElementById('detail-prefecture').textContent = spot.prefecture;
  document.getElementById('detail-description').textContent = spot.description;
  document.getElementById('detail-maps-link').href =
    'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(spot.mapsQuery);
  document.getElementById('detail-card').classList.remove('hidden');
}

function hideDetailCard() {
  document.getElementById('detail-card').classList.add('hidden');
}

document.getElementById('map-svg').addEventListener('click', (e) => {
  if (e.target.matches('.pin')) showDetailCard(e.target.dataset.spotId);
});
document.getElementById('detail-close').addEventListener('click', hideDetailCard);
```

- [ ] **Step 3: 構文チェック**

Task 3のStep 2と同じ抽出コマンドを再実行し、`SYNTAX OK` になることを確認する。

- [ ] **Step 4: リンク生成ロジックの単体確認**

```bash
node -e "
const spot={mapsQuery:'鎌倉高校前駅 踏切'};
const url='https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(spot.mapsQuery);
console.assert(url==='https://www.google.com/maps/search/?api=1&query=%E9%8E%8C%E5%80%89%E9%AB%98%E6%A0%A1%E5%89%8D%E9%A7%85%20%E8%B8%8F%E5%88%87', 'unexpected encoded url: '+url);
console.log('OK', url);
"
```

Expected: `OK https://www.google.com/maps/search/?api=1&query=...`（アサーションが通ること）

- [ ] **Step 5: チェックポイント**

Step 3・4がパスしたら次のタスクへ進む。

---

### Task 6: 都道府県ズーム＋サイドパネル

**Files:**
- Modify: `anime-pilgrimage-app/prototype/map-prototype.html`

**Interfaces:**
- Consumes: `PREFECTURES`（`.bbox`）, `SPOTS`, `#map-svg`, `PROJECTION.width/height`
- Produces: `#side-panel`（DOM）、`#reset-zoom`（DOM）、`function animateViewBox(svg: SVGElement, toBox: {x,y,w,h}, duration?: number): void`、`function zoomToPrefecture(prefName: string): void`、`function resetZoom(): void`

- [ ] **Step 1: サイドパネルとリセットボタンのHTML・スタイルを追記する**

`#detail-card` の直後に追記:

```html
<div id="side-panel" class="hidden">
  <button id="reset-zoom">← 全国表示に戻る</button>
  <h3 id="side-panel-title"></h3>
  <div id="side-panel-list"></div>
</div>
```

`<style>` に追記:

```css
#side-panel{position:absolute;left:12px;bottom:12px;top:auto;z-index:15;width:280px;max-height:60vh;overflow-y:auto;padding:12px;background:#fff;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.15);}
#side-panel.hidden{display:none;}
#reset-zoom{display:block;margin-bottom:8px;border:none;background:#eee;border-radius:6px;padding:6px 10px;cursor:pointer;font-size:12px;}
.side-panel-item{padding:6px 4px;border-bottom:1px solid #eee;cursor:pointer;font-size:13px;}
.side-panel-item:hover{background:#f5f5f5;}
.pin.emphasized{r:6;}
.pin.dimmed{opacity:0.25;}
```

- [ ] **Step 2: ズームロジックを追記する**

末尾の `<script>` に追記:

```javascript
// SVGのviewBox属性はCSS transitionでは確実にアニメーションしないため、
// requestAnimationFrameで数値を補間してアニメーション遷移させる。
function animateViewBox(svg, toBox, duration = 400) {
  const current = svg.getAttribute('viewBox').split(' ').map(Number);
  const from = { x: current[0], y: current[1], w: current[2], h: current[3] };
  const start = performance.now();

  function step(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
    const x = from.x + (toBox.x - from.x) * eased;
    const y = from.y + (toBox.y - from.y) * eased;
    const w = from.w + (toBox.w - from.w) * eased;
    const h = from.h + (toBox.h - from.h) * eased;
    svg.setAttribute('viewBox', `${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`);
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function zoomToPrefecture(prefName) {
  const pref = PREFECTURES.find(p => p.name === prefName);
  if (!pref) return;
  const svg = document.getElementById('map-svg');
  const padding = (pref.bbox.maxX - pref.bbox.minX) * 0.15 + 10;
  animateViewBox(svg, {
    x: pref.bbox.minX - padding,
    y: pref.bbox.minY - padding,
    w: (pref.bbox.maxX - pref.bbox.minX) + padding * 2,
    h: (pref.bbox.maxY - pref.bbox.minY) + padding * 2
  });

  document.querySelectorAll('.pin').forEach(pin => {
    const inPref = pin.dataset.prefName === prefName;
    pin.classList.toggle('emphasized', inPref);
    pin.classList.toggle('dimmed', !inPref);
  });

  const sidePanel = document.getElementById('side-panel');
  document.getElementById('side-panel-title').textContent = prefName + 'のスポット';
  const list = SPOTS.filter(s => s.prefecture === prefName);
  document.getElementById('side-panel-list').innerHTML = list.map(s => `
    <div class="side-panel-item" data-spot-id="${s.id}">${s.name}（${s.anime}）</div>
  `).join('');
  sidePanel.classList.remove('hidden');
}

function resetZoom() {
  const svg = document.getElementById('map-svg');
  animateViewBox(svg, { x: 0, y: 0, w: PROJECTION.width, h: PROJECTION.height });
  document.querySelectorAll('.pin').forEach(pin => {
    pin.classList.remove('emphasized', 'dimmed');
  });
  document.getElementById('side-panel').classList.add('hidden');
}

document.getElementById('map-svg').addEventListener('click', (e) => {
  if (e.target.matches('.prefecture')) zoomToPrefecture(e.target.dataset.prefName);
});
document.getElementById('reset-zoom').addEventListener('click', resetZoom);
document.getElementById('side-panel-list').addEventListener('click', (e) => {
  if (e.target.matches('.side-panel-item')) showDetailCard(e.target.dataset.spotId);
});
```

- [ ] **Step 3: 構文チェック**

Task 3のStep 2と同じ抽出コマンドを再実行し、`SYNTAX OK` になることを確認する。

- [ ] **Step 4: bbox計算ロジックの単体確認**

```bash
node -e "
const bbox={minX:100,minY:200,maxX:150,maxY:260};
const padding=(bbox.maxX-bbox.minX)*0.15+10;
const vbW=(bbox.maxX-bbox.minX)+padding*2;
const vbH=(bbox.maxY-bbox.minY)+padding*2;
console.assert(vbW>(bbox.maxX-bbox.minX), 'padding not applied to width');
console.assert(vbH>(bbox.maxY-bbox.minY), 'padding not applied to height');
console.log('OK', vbW.toFixed(1), vbH.toFixed(1));
"
```

Expected: `OK <width> <height>`（アサーションが通ること）

- [ ] **Step 5: チェックポイント**

Step 3・4がパスしたら次のタスクへ進む。

---

### Task 7: ビジュアル仕上げ（配色・テーマ・レスポンシブ）

**Files:**
- Modify: `anime-pilgrimage-app/prototype/map-prototype.html`

**Interfaces:**
- Consumes: 既存の全DOM・CSS
- Produces: なし（既存クラスへのスタイル追加のみ。新しい関数・DOM IDは増やさない）

- [ ] **Step 1: dataviz スキルを確認する**

実装前に `dataviz` スキルを読み込み、スポット種別3種（scene / monument / inspiration）に使うカテゴリカルカラーの決定方法（`references/palette.md` のパレット）を確認する。

- [ ] **Step 2: 配色・テーマ・レスポンシブCSSを追記する**

`<style>` ブロックの先頭に、ライト/ダーク両テーマのトークンを定義し、既存要素（`.pin`, `.prefecture`, `#filter-panel`, `#detail-card`, `#side-panel`）にそのトークンを適用するCSSを追記する。Step 1で確認したdatavizスキルのカラー選定手順に従い、`.pin[data-type="scene"]`, `.pin[data-type="monument"]`, `.pin[data-type="inspiration"]` それぞれに異なる `fill` 色を設定する。`body` に明示的な背景色トークンを設定する（Artifactの規約に準拠：透明背景にしない）。

`@media (max-width: 640px)` で `#filter-panel` と `#side-panel` を画面幅に収まるレイアウト（例: 幅を `calc(100vw - 24px)` にする、`#detail-card` を下部固定にする等）に調整する。

- [ ] **Step 3: 構文チェック**

Task 3のStep 2と同じ抽出コマンドを再実行し、`SYNTAX OK` になることを確認する。

- [ ] **Step 4: チェックポイント**

Step 3がパスしたら次のタスクへ進む。

---

### Task 8: Artifactとして公開・QA

**Files:**
- なし（Artifactツールを使用）

**Interfaces:**
- Consumes: `anime-pilgrimage-app/prototype/map-prototype.html`（完成版）

- [ ] **Step 1: 最終ファイルの構造チェック**

ピン・都道府県パスはブラウザ実行時にJavaScriptがループで生成するため、静的ファイル中に `class="pin"` という文字列が78回並ぶわけではない（生成コードが1箇所あるのみ）。そのため、ここでは (a) Artifact規約に反するタグが無いこと、(b) データ件数（78件・47件）、(c) 各タスクで追加した関数がすべて定義されていること、を確認する。

```bash
node -e "
const fs=require('fs');
const html=fs.readFileSync('c:/Users/aoppp/OneDrive/ドキュメント/work/anime-pilgrimage-app/prototype/map-prototype.html','utf8');
console.assert(!/<!DOCTYPE/i.test(html), 'DOCTYPE should not be present');
console.assert(!/<html/i.test(html), '<html> should not be present');
console.assert(!/<head/i.test(html), '<head> should not be present');
console.assert(!/<body/i.test(html), '<body> should not be present');
const prefectures=JSON.parse(html.match(/const PREFECTURES = (\[[\s\S]*?\]);/)[1]);
const spots=JSON.parse(html.match(/const SPOTS = (\[[\s\S]*?\]);/)[1]);
console.assert(prefectures.length===47, 'expected 47 prefectures, got '+prefectures.length);
console.assert(spots.length===78, 'expected 78 spots, got '+spots.length);
const requiredFns=['function project(','function renderMap(','function applyFilters(','function showDetailCard(','function hideDetailCard(','function animateViewBox(','function zoomToPrefecture(','function resetZoom('];
for (const fn of requiredFns){
  console.assert(html.includes(fn), 'missing function definition: '+fn);
}
const requiredIds=['id=\"map-svg\"','id=\"filter-panel\"','id=\"detail-card\"','id=\"side-panel\"'];
for (const id of requiredIds){
  console.assert(html.includes(id), 'missing element: '+id);
}
console.log('OK structure check:', prefectures.length, 'prefectures,', spots.length, 'spots, all functions and elements present');
"
```

Expected: `OK structure check: 47 prefectures, 78 spots, all functions and elements present`

- [ ] **Step 2: artifact-design スキルを確認する**

Artifact公開前に `artifact-design` スキルを読み込み、既存の見た目がArtifactのデザイン規約（ライト/ダーク対応、レスポンシブ等）に沿っているか照らし合わせる。Task 7で対応済みのはずだが、抜けがあれば `map-prototype.html` を修正する。

- [ ] **Step 3: Artifactとして公開する**

Artifactツールを以下のパラメータで呼び出す:
- `file_path`: `anime-pilgrimage-app/prototype/map-prototype.html`
- `title`: "アニメ聖地巡礼マップ（プロトタイプ）"
- `description`: "海外観光客向けアニメ聖地巡礼スポットマップアプリのUI/UX検証用プロトタイプ"
- `favicon`: 🗾

- [ ] **Step 4: ユーザーによる目視QA**

ユーザーに公開したArtifactのURLを共有し、以下を確認してもらう:
- 日本地図の形が正しく見えるか
- 都道府県をクリックするとその地域にズームするか、「全国表示に戻る」で戻れるか
- 作品名フィルター・種別フィルターでピンの表示/非表示が切り替わるか
- ピンをクリックすると詳細カードが表示され、「Googleマップで開く」が正しい場所にリンクしているか
- ライト/ダークテーマ両方で見た目が崩れていないか
- スマホ幅（ブラウザの開発者ツールでの幅変更）でも操作できるか

フィードバックがあれば該当タスクに戻って修正する。
