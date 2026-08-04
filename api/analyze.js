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
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not set in environment variables' });
    }

    const { image, imageData, imageBase64, chart, marketType, timeframe } = req.body || {};
    const rawImage = image || imageData || imageBase64 || chart;

    if (!rawImage) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Clean Base64 Data
    const base64Data = rawImage.replace(/^data:image\/\w+;base64,/, '');

    const promptText = `Analyze this ${marketType || 'Trading'} chart screenshot on a ${timeframe || '15M'} timeframe. Provide trade bias (BUY/SELL), entry, stop loss, take profit targets, and concise technical analysis.`;

    // Try multiple models in case free quota on primary is 0
    const candidateModels = [
      'gemini-1.5-flash',
      'gemini-2.0-flash-lite',
      'gemini-1.5-pro'
    ];

    let lastError = null;

    for (const modelName of candidateModels) {
      const googleApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      const response = await fetch(googleApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: promptText },
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: base64Data,
                  },
                },
              ],
            },
          ],
        }),
      });

      const data = await response.json();

      if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return res.status(200).json({ result: data.candidates[0].content.parts[0].text });
      }

      lastError = data.error?.message || `Failed with ${modelName}`;
    }

    throw new Error(lastError);

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to analyze chart' });
  }
}
