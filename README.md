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
- モデルは環境変数 `FAL_MODEL` で切り替え可能(デフォルト: `fal-ai/ltx-video`)
