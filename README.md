# falvideo

fal.ai を使ったテキスト→動画生成のミニマムなWebアプリ。

## セットアップ

```bash
npm install
cp .env.example .env
# .env の FAL_KEY に fal.ai の API キーを設定
npm start
```

`http://localhost:3000` を開き、プロンプトを入力して生成します。

## 構成

- `server.js` — Express サーバー。`/api/generate` が fal.ai にリクエストを送る(APIキーはサーバー側のみで保持)
- `public/index.html` — プロンプト入力〜動画プレビューのシンプルなUI
- `modelSelector.js` — Claude がプロンプトを解析し、最適な fal.ai モデルと入力パラメータを選ぶロジック

## モデル選択モード

- **自動選択モード**: `.env` に `ANTHROPIC_API_KEY` を設定すると有効になる。リクエストごとに Claude がプロンプト内容を見て `modelSelector.js` の候補一覧から最適なモデルを選び、そのモデル用のパラメータも生成する
- **固定モード**: `ANTHROPIC_API_KEY` が未設定の場合、環境変数 `FAL_MODEL` のモデルを常に使う(デフォルト: `fal-ai/ltx-video`)

候補モデルを増やしたい場合は `modelSelector.js` の `FAL_MODEL_CATALOG` に追加する。
