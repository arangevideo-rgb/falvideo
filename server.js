import 'dotenv/config';
import express from 'express';
import { fal } from '@fal-ai/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (!process.env.FAL_KEY) {
  console.error('FAL_KEY is not set. Add it to your .env file.');
  process.exit(1);
}

fal.config({ credentials: process.env.FAL_KEY });

const MODEL = process.env.FAL_MODEL || 'fal-ai/ltx-video';

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/generate', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'prompt is required' });
  }

  try {
    const result = await fal.subscribe(MODEL, {
      input: { prompt },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === 'IN_PROGRESS') {
          update.logs?.forEach((log) => console.log(log.message));
        }
      },
    });

    res.json({ video: result.data.video, requestId: result.requestId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'fal.ai request failed' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`falvideo server running at http://localhost:${port} (model: ${MODEL})`);
});
