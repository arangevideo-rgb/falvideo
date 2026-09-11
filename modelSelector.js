import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-5';

export const FAL_MODEL_CATALOG = [
  {
    id: 'fal-ai/ltx-video',
    label: '速い・安い(標準)',
    when_to_use: '短いテスト、下書き、スピードとコストを優先したい場合',
    input_schema: { prompt: 'string' },
  },
  {
    id: 'fal-ai/kling-video/v1.6/standard/text-to-video',
    label: '高品質(Kling v1.6)',
    when_to_use: '映像の自然さ・クオリティを重視する場合。時間とコストは増える',
    input_schema: {
      prompt: 'string',
      duration: '"5" または "10"(秒)',
      aspect_ratio: '"16:9" | "9:16" | "1:1"',
    },
  },
  {
    id: 'fal-ai/minimax/video-01',
    label: 'バランス型',
    when_to_use: '品質とコストのバランスを取りたい、標準的な用途全般',
    input_schema: { prompt: 'string' },
  },
  {
    id: 'fal-ai/kling-video/v1.6/standard/image-to-video',
    label: '画像から動画化(Kling v1.6)',
    when_to_use: 'ユーザーが画像を添付している場合は必ずこれを選ぶ(テキストのみの依頼では選ばない)',
    input_schema: {
      prompt: 'string(画像をどう動かしたいかの説明)',
      image_url: 'string(サーバー側で実際のURLに自動置換されるのでダミー文字列でよい)',
      duration: '"5" または "10"(秒)',
    },
  },
];

const catalogText = FAL_MODEL_CATALOG.map(
  (m) => `- id: ${m.id}\n  用途: ${m.when_to_use}\n  入力パラメータ: ${JSON.stringify(m.input_schema)}`
).join('\n');

export async function selectFalModel(userPrompt, { hasImage = false } = {}) {
  const contextNote = hasImage
    ? '\n\n【重要】このリクエストには画像が添付されています。必ず image-to-video 系のモデル(fal-ai/kling-video/v1.6/standard/image-to-video)を選んでください。'
    : '\n\nこのリクエストに画像・動画の添付はありません。text-to-video系のモデルから選んでください。';

  const message = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system:
      'あなたは動画生成サービスのルーティング担当です。ユーザーの依頼内容を読み、' +
      '以下のfal.aiモデル一覧から最適なものを1つ選び、そのモデルが要求する入力パラメータを埋めてください。' +
      '必ずselect_modelツールを呼び出してください。\n\n利用可能なモデル:\n' +
      catalogText +
      contextNote,
    tools: [
      {
        name: 'select_model',
        description: 'ユーザーの依頼に最も適したfal.aiモデルと入力パラメータを返す',
        input_schema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              enum: FAL_MODEL_CATALOG.map((m) => m.id),
              description: '選択したfal.aiモデルのid',
            },
            input: {
              type: 'object',
              description: '選択したモデルに渡す入力パラメータ(promptを必ず含める)',
            },
            reasoning: {
              type: 'string',
              description: 'なぜこのモデルを選んだかの短い理由',
            },
          },
          required: ['model', 'input', 'reasoning'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'select_model' },
    messages: [{ role: 'user', content: userPrompt }],
  });

  const toolUse = message.content.find((block) => block.type === 'tool_use');
  if (!toolUse) {
    throw new Error('モデル選択に失敗しました(Claudeからの応答が不正です)');
  }

  return toolUse.input;
}
