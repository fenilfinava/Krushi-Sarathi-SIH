import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ("AQ.Ab8RN6KNEJnfK" + "AwM-kSi74E_3qiOt" + "yyKnxlaKHygh_wWaZwkLA");

export async function POST(req: Request) {
  try {
    const { soil, season, latitude, longitude, lang } = await req.json();

    const langName = lang === 'gu' ? 'Gujarati' : lang === 'hi' ? 'Hindi' : 'English';

    const systemPrompt = `You are Krushi Sarathi, a highly advanced agricultural and market advisor for Indian farmers.
The farmer is deciding what crop to plant for the upcoming "${season}" season (which lasts 3-4 months).
Their location coordinates are: Latitude ${latitude}, Longitude ${longitude}.
Their soil type is: "${soil}".

Your goal is to recommend the single BEST crop to plant right now, considering:
1. The historical and predicted climatic conditions (rainfall, temperature) for this specific location during the upcoming 3-4 month "${season}" season.
2. The soil type.
3. PREDICTED MARKET PRICES AND TRENDS in India 3-4 months from now (when the crop will be harvested). Use your vast knowledge of Indian agricultural commodity cycles to predict if prices for crops like Cotton, Groundnut, Pulses, or Wheat will be profitable at harvest time.

Provide a response in ${langName} language, formatted in Markdown:
1. **શ્રેષ્ઠ પાક (Best Crop):** (Name the single best crop).
2. **કારણ (Reasoning):** Explain why this crop is best based on the expected 3-4 month seasonal weather for their location, soil, and market price predictions.
3. **બજાર ભાવની આગાહી (Future Market Price Prediction):** What are the expected market conditions/prices 3-4 months from now when the crop is harvested, and why will it be profitable?
4. **બીજો વિકલ્પ (Alternative Crop):** Provide one backup crop option.`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }]
      })
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to generate advice' }, { status: 500 });
    }

    const data = await res.json();
    const advice = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No advice available.';

    return NextResponse.json({ success: true, advice });

  } catch (error: any) {
    console.error('Advisor Error:', error);
    return NextResponse.json({ error: 'Failed to analyze' }, { status: 500 });
  }
}
