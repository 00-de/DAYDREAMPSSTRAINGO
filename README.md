# Train Driver Simulator — Windows インストーラー基盤

Electron + React + TypeScript + Vite + Tailwind で作る、
インストール型 Windows デスクトップアプリの土台です。
**ターミナルを使わず、GitHub Desktop の画面操作だけで Setup.exe を配布できます。**

---

## 1. 最初にやること（3か所だけ書き換える）

| ファイル | 場所 | 書き換える内容 |
|---|---|---|
| `electron-builder.yml` | `publish.owner` | あなたの GitHub ID |
| `electron-builder.yml` | `publish.repo` | リポジトリ名 |
| `build/icon.ico` | — | 256×256 以上のアイコンを置く（必須） |

Firebase を使う場合は、GitHub の
`Settings → Secrets and variables → Actions` に `.env.example` の項目を登録します。

---

## 2. 配布の流れ

1. `package.json` の `"version"` を上げる（例 `1.0.0` → `1.1.0`）
2. GitHub Desktop で Commit → Push
3. GitHub Actions が自動で Windows 版をビルドし、Releases に公開
4. Releases から `Train Driver Simulator-Setup-1.1.0.exe` をダウンロードして配布

インストール済みのユーザーは、**次に起動したときに自動で更新通知が出ます。**

---

## 3. インストーラーの仕様

- インストール先 `C:\Program Files\Train Driver Simulator`
- デスクトップにショートカットを作成
- スタートメニューに登録
- アンインストール対応（セーブデータを残すか選択できる）
- 日本語インストーラー

---

## 4. 自動アップデート

| 項目 | 動作 |
|---|---|
| 確認のタイミング | 起動5秒後 + 以後6時間ごと |
| ダウンロード | 変更されたブロックのみ（差分アップデート） |
| 進行表示 | 速度計型ゲージ + 転送量 + 速度 |
| 適用 | ワンクリック → 自動再起動 |
| 失敗時 | 画面に出さず、ログへ記録してそのまま遊べる |

差分アップデートは `.exe.blockmap` により自動で有効になります。
2回目以降の更新は、変わった部分だけを取得するため通信量が大きく減ります。

---

## 5. ユーザーデータの保護

更新の直前に、以下を自動でバックアップします。

- 設定（`settings.json`）
- セーブデータ（`saves/`）
- ランキング（`ranking.json`）
- スクリーンショット（`screenshots/`）
- リプレイ（`replays/`）

保存先は `%APPDATA%\train-driver-simulator\backups\`、
**直近5世代**を保持し、古いものから自動削除します。復元も画面から行えます。

---

## 6. セキュリティ

- `contextIsolation: true` / `nodeIntegration: false`
- IPC は `preload.ts` で公開した関数のみ
- 設定・ランキングは SHA-256 の署名付きで保存し、**改ざんを検出**したら既定値へ復旧
- 書き込みは一時ファイル → リネームの原子的置換（電源断でも壊れない）
- Content-Security-Policy を `index.html` に設定
- アップデートの署名検証は electron-updater が自動で実施

### コード署名について
署名なしでも動きますが、Windows SmartScreen の警告が出ます。
証明書を用意したら `electron-builder.yml` と `release.yml` のコメントを外してください。

---

## 7. ログの場所

`%APPDATA%\train-driver-simulator\logs\`

| ファイル | 内容 |
|---|---|
| `main.log` | 通常ログ・エラーログ |
| `crash.log` | 未捕捉例外 |
| `update.log` | アップデート履歴 |

---

## 8. ファイル構成

```
electron/
  main.ts       … ウィンドウ・IPC・起動処理
  preload.ts    … 描画側へ公開する唯一の窓口
  updater.ts    … 自動 / 差分アップデート
  firstRun.ts   … 初回点検（GPU判定・画質自動設定）
  backup.ts     … バックアップ・復元・世代管理
  store.ts      … 設定と改ざん検出付き保存
  logger.ts     … ログ
src/
  App.tsx                    … ここに運転画面を実装する
  components/FirstRunSetup   … 出庫前点検の画面
  components/UpdateOverlay   … 更新通知（速度計ゲージ）
  lib/firebase.ts            … Google ログイン / オフライン対応
  lib/cloudSave.ts           … クラウドセーブ
.github/workflows/release.yml … 自動ビルド & 公開
```

---

## 9. 次にやること

- `build/icon.ico` を用意する（**これが無いとビルドが失敗します**）
- `resources/` に `assets` `audio` `routes` フォルダを作る
- `src/App.tsx` の `<main>` に運転画面を実装する
