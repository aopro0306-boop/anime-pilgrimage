# マップ「ルート作成」機能 設計

日付: 2026-08-10
ステータス: 承認済み（実装フェーズへ）

## 1. 背景・目的

[お気に入り機能](2026-08-10-map-favorites-design.md)により、スポットを保存して後から見返せるようになった。次のステップとして、保存したお気に入りに訪問順を付け、その順序で地図上にルートを表示・Googleマップの経路検索に渡せるようにする。

- 位置づけ: `map-leaflet.html`のお気に入りタブの拡張（新規ファイルなし）。
- 役割: お気に入りスポットを巡る順番を決め、地図上で視覚的に確認し、実際の道順はGoogleマップに委ねる。

## 2. スコープ

### 含むもの
- お気に入り一覧の各行に「↑」「↓」の並べ替えボタンを追加（先頭行は↑を、末尾行は↓を非活性にする）。
- 並び順を`favoritesOrder`（スポットID配列）として`localStorage`（キー: `pilgrimage-favorites-order`）に永続化。
- お気に入りが2件以上のとき、一覧下に以下2つのボタンを表示:
  - 「ルートを地図で見る」: 現在の順序でLeaflet地図上に点線のポリラインを描画し、その範囲にズーム
  - 「Googleマップでルートを開く」: 順序通りに経由地を組んだGoogleマップ経路検索URLを新規タブで開く
- 6言語のUI文言対応（ボタンラベル・↑↓のaria-label）。

### 含まないもの
- 自前の距離・所要時間計算（Googleマップ側に委ねる）。
- ドラッグ&ドロップでの並べ替え（実装・テストの単純さを優先し↑↓ボタンのみ）。
- 巡回順序の自動最適化（最短ルート計算等）。
- お気に入りが1件以下のときのルートボタン表示（意味がないため非表示）。

## 3. データ設計

- 既存の`favorites`（`Set<string>`、メンバーシップ判定用）はそのまま維持し、変更しない。
- 新規`let favoritesOrder`（`Array<string>`）を追加し、`localStorage`の`pilgrimage-favorites-order`キーにJSON配列として永続化。
- `function syncFavoritesOrder()`: `favoritesOrder`を現在の`favorites`と整合させる（`favorites`にあって`favoritesOrder`にないIDは末尾に追加、`favoritesOrder`にあって`favorites`にないIDは除去）。既存ユーザー（順序機能追加前からのお気に入り）にも自然に順序が発生し、特別な移行処理は不要。
- `buildFavoritesTab()`の描画直前に`syncFavoritesOrder()`を呼び、`favoritesOrder`の順でスポットを並べて表示する。
- `function moveFavorite(id, direction)`（`direction`は`-1`か`1`）: `favoritesOrder`内での隣接要素と入れ替え、保存→`buildFavoritesTab()`再描画。

## 4. UI・操作フロー

- 各お気に入り行に「↑」「↓」ボタンを追加（既存の×削除ボタンの並びに追加）。先頭行の↑・末尾行の↓は`disabled`。
- ルート表示ボタン群は`favoritesOrder.length >= 2`のときのみ表示する専用コンテナとして、一覧の下に配置。
- 「ルートを地図で見る」: `favoritesOrder`の順にlat/lngを取り出し`L.polyline(...).addTo(map)`で描画（既存の描画があれば`removeLayer`してから描画し直す）。`map.fitBounds(...)`で全体が見えるようにズーム。
- 「Googleマップでルートを開く」: `https://www.google.com/maps/dir/?api=1&origin=<最初の地点>&destination=<最後の地点>&waypoints=<中間地点をエンコードして|区切り>`形式のURLを`window.open(url, '_blank')`で開く。移動手段（travelmode）は指定せず、Googleマップ側のデフォルト・ユーザー選択に委ねる。

## 5. 技術構成

- 既存の`map-leaflet.html`への追記のみ。外部ライブラリなし（Leaflet標準の`L.polyline`を使用）。
- 配色は既存のアクセント`#FF4D6D`をルートラインにも使用（破線: `dashArray: '6, 8'`）。
- 多言語文言は既存の`I18N`オブジェクトに追記（`moveUp`, `moveDown`, `viewRouteOnMap`, `openRouteInGoogleMaps`）。

## 6. 検証方法

- 実装後、インラインスクリプトを抽出して`node --check`で構文チェック。
- `syncFavoritesOrder()`/`moveFavorite()`のロジックを、[お気に入り機能](2026-08-10-map-favorites-design.md)と同じ`localStorage`スタブ環境でNode.jsから単体テストする（並べ替え・新規追加・削除の整合性を確認）。
- ヘッドレスChromeでコンソールエラーが出ていないことを確認する。
- お気に入り0件・1件・2件以上の各状態で、ルートボタン群の表示/非表示が正しく切り替わることを確認する。

## 7. 未決事項・リスク

- お気に入りが多数（理論上最大75件）の場合、Googleマップの経路検索URLには経由地点数の上限（無料版で通常9地点程度）がある。上限超過時の挙動（エラーになるか、一部無視されるか）は実装時にGoogle側の挙動を確認し、必要なら制限を明記する。
