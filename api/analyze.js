export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Read Key from Vercel Environment Variables
    const apiKey = process.env.GEMINI_API_KEY || process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API Key is not set in environment variables' });
    }

    const { image, imageData, imageBase64, chart, marketType, timeframe } = req.body || {};
    const rawImage = image || imageData || imageBase64 || chart;

    if (!rawImage) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Ensure proper Data URL format for OpenRouter
    let imageUrl = rawImage;
    if (!rawImage.startsWith('data:image/')) {
      imageUrl = `data:image/jpeg;base64,${rawImage}`;
    }

    const promptText = `Analyze this ${marketType || 'Trading'} chart screenshot on a ${timeframe || '15M'} timeframe. Provide trade bias (BUY/SELL), entry, stop loss, take profit targets, and concise technical analysis.`;

    // Verified Active Free Vision Models on OpenRouter
    const freeModels = [
      'google/gemini-2.0-flash-exp:free',
      'google/gemini-2.0-flash-thinking-exp:free',
      'qwen/qwen-2-vl-72b-instruct:free',
      'google/gemini-flash-1.5-exp:free'
    ];

    let lastError = null;

    for (const modelName of freeModels) {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'HTTP-Referer': 'https://vercel.com',
          'X-Title': 'AI Chart Signal Decoder',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: promptText },
                {
                  type: 'image_url',
                  image_url: { url: imageUrl }
                }
              ]
            }
          ]
        })
      });

      const data = await response.json();

      if (response.ok && data.choices?.[0]?.message?.content) {
        return res.status(200).json({ result: data.choices[0].message.content });
      }

      if (data.error?.message) {
        lastError = `${modelName}: ${data.error.message}`;
      }
    }

    throw new Error(lastError || 'All OpenRouter free vision endpoints failed.');

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to analyze chart' });
  }
}
