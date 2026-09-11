import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import { fal } from '@fal-ai/client';
import path from 'path';
import { fileURLToPath } from 'url';
import { selectFalModel } from './modelSelector.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (!process.env.FAL_KEY) {
  console.error('FAL_KEY is not set. Add it to your .env file.');
  process.exit(1);
}

fal.config({ credentials: process.env.FAL_KEY });

const FIXED_MODEL = process.env.FAL_MODEL;
const useAutoModelSelection = !!process.env.ANTHROPIC_API_KEY;

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/generate', upload.single('file'), async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'prompt is required' });
  }

  const hasImage = !!req.file;
  if (hasImage && !useAutoModelSelection) {
    return res.status(400).json({
      error: '画像からの動画生成には自動モデル選択モード(ANTHROPIC_API_KEY)が必要です',
    });
  }

  try {
    let model, input, reasoning;

    if (useAutoModelSelection) {
      const selection = await selectFalModel(prompt, { hasImage });
      model = selection.model;
      input = selection.input;
      reasoning = selection.reasoning;

      if (hasImage) {
        const uploadedUrl = await fal.storage.upload(
          new Blob([req.file.buffer], { type: req.file.mimetype })
        );
        input.image_url = uploadedUrl;
      }

      console.log(`[model selection] ${model} — ${reasoning}`);
    } else {
      model = FIXED_MODEL || 'fal-ai/ltx-video';
      input = { prompt };
    }

    const result = await fal.subscribe(model, {
      input,
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === 'IN_PROGRESS') {
          update.logs?.forEach((log) => console.log(log.message));
        }
      },
    });

    res.json({ video: result.data.video, requestId: result.requestId, model, reasoning });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'generation failed' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  const modeLabel = useAutoModelSelection ? 'auto (Claude selects model)' : `fixed (${FIXED_MODEL || 'fal-ai/ltx-video'})`;
  console.log(`falvideo server running at http://localhost:${port} (mode: ${modeLabel})`);
});
