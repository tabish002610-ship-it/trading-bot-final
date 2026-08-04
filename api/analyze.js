import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageBase64, market, timeframe } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    // Initialize Gemini API Client using Environment Variable
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Clean Base64 Data
    const base64Clean = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const promptText = `
      You are an elite institutional Forex, Crypto, and Gold technical trader.
      Analyze this price chart screenshot for ${market} on ${timeframe} timeframe.
      
      Look closely at the visible candlesticks, market structure, support/resistance, trendlines, and key liquidity zones.
      
      Provide a highly realistic, precise Trading Signal strictly in this exact HTML structure:
      
      <div style="font-size: 1rem; line-height: 1.8;">
        <strong>🚨 SIGNAL TYPE:</strong> <span style="color: #2ea043; font-weight: bold; font-size: 1.2rem;">[BUY / LONG or SELL / SHORT]</span><br>
        <strong>📈 PATTERN / STRUCTURE:</strong> [Exact pattern or structure visible in image, e.g. Fair Value Gap Fill, Double Bottom, Liquidity Sweep]<br>
        <hr style="border-color: #30363d; margin: 10px 0;">
        <strong>🎯 ENTRY ZONE:</strong> [Exact price level visible on chart scale]<br>
        <strong>🛑 STOP LOSS (SL):</strong> <span style="color: #f85149;">[Logical price level below/above structure]</span><br>
        <strong>✅ TAKE PROFIT 1 (TP1):</strong> <span style="color: #3fb950;">[Conservative target]</span><br>
        <strong>🚀 TAKE PROFIT 2 (TP2):</strong> <span style="color: #3fb950;">[Extended target]</span><br>
        <hr style="border-color: #30363d; margin: 10px 0;">
        <strong>⚖️ RISK / REWARD:</strong> [Calculated RR Ratio]<br>
        <strong>💡 REASON:</strong> [1-2 concise lines explaining technical justification based strictly on the image]
      </div>
    `;

    // Call Real Gemini 2.5 Flash Vision Model
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: promptText },
            {
              inlineData: {
                mimeType: 'image/png',
                data: base64Clean
              }
            }
          ]
        }
      ]
    });

    const outputText = response.text;
    return res.status(200).json({ result: outputText });

  } catch (error) {
    console.error("Backend AI Error:", error);
    return res.status(500).json({ error: error.message || 'AI Analysis failed' });
  }
}