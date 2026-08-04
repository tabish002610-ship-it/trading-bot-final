import { GoogleGenAI } from '@google/genai';

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

    // Initialize New Google GenAI SDK
    const ai = new GoogleGenAI({ apiKey: apiKey });

    // Base64 Cleaning
    const base64Data = rawImage.replace(/^data:image\/\w+;base64,/, '');

    // Using gemini-2.5-flash (Standard current vision model)
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Data,
          },
        },
        `Analyze this ${marketType || 'Trading'} chart screenshot on a ${timeframe || '15M'} timeframe. Provide trade bias (BUY/SELL), entry, stop loss, take profit targets, and concise technical analysis.`,
      ],
    });

    return res.status(200).json({ result: response.text });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to analyze chart' });
  }
}
