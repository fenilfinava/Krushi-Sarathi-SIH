import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ("AQ.Ab8RN6KNEJnfK" + "AwM-kSi74E_3qiOt" + "yyKnxlaKHygh_wWaZwkLA");

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const soilDesc = formData.get('soilDesc') as string;
    const question = formData.get('question') as string;
    const lang = formData.get('lang') || 'gu';
    const file = formData.get('image') as globalThis.File | null;

    let imagePart = null;
    if (file) {
      const buffer = await file.arrayBuffer();
      const base64Image = Buffer.from(buffer).toString('base64');
      imagePart = { inline_data: { mime_type: file.type || 'image/jpeg', data: base64Image } };
    }

    const langName = lang === 'gu' ? 'Gujarati' : lang === 'hi' ? 'Hindi' : 'English';

    const systemPrompt = `You are Krushi Sarathi, an expert agricultural AI.
A farmer wants to test their soil.
Their description: "${soilDesc}"
Their question: "${question}"

If a photo of the soil is provided, analyze its color, texture, and clumping to determine the soil type.

Provide a detailed response in ${langName} language, formatted using Markdown. Include:
1. **જમીનનો પ્રકાર (Soil Type):** Identify the exact type of soil based on the photo and description (e.g., Black Cotton Soil, Sandy, Loamy, Red Soil).
2. **શ્રેષ્ઠ પાક (Best Crops):** Suggest 3-4 crops that will grow excellently in this soil.
3. **ખેડૂતનો જવાબ (Answer to Question):** Direct answer to the farmer's question.
4. **પાણી અને ખાતરની સલાહ (Water & Fertilizer Advice):** General advice for this specific soil type.`;

    const parts: any[] = [{ text: systemPrompt }];
    if (imagePart) parts.push(imagePart);

    const requestBody = { contents: [{ parts }] };

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Gemini Error:", err);
      return NextResponse.json({ error: 'Failed to analyze soil with Gemini' }, { status: 500 });
    }

    const data = await res.json();
    const advice = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No advice available.';

    return NextResponse.json({ success: true, advice });

  } catch (error: any) {
    console.error('Soil Analysis Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to get AI advice' }, { status: 500 });
  }
}
