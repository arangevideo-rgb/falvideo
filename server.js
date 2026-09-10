import 'dotenv/config';
import express from 'express';
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

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/generate', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'prompt is required' });
  }

  try {
    let model, input, reasoning;

    if (useAutoModelSelection) {
      const selection = await selectFalModel(prompt);
      model = selection.model;
      input = selection.input;
      reasoning = selection.reasoning;
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
