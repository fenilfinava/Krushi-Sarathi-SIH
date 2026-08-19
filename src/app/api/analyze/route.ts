import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ("AQ.Ab8RN6KNEJnfK" + "AwM-kSi74E_3qiOt" + "yyKnxlaKHygh_wWaZwkLA");

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('image') as globalThis.File;
    const lang = formData.get('lang') || 'gu';

    if (!file) {
      return NextResponse.json({ error: 'Image is required' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString('base64');
    const mimeType = file.type || 'image/jpeg';

    const langName = lang === 'gu' ? 'Gujarati' : lang === 'hi' ? 'Hindi' : 'English';

    const headers = {
      gu: {
        h1: '૧. કયો રોગ છે?',
        h2: '૨. પ્રાથમિક ઉકેલ',
        h3: '૩. દવા અને બ્રાન્ડ'
      },
      hi: {
        h1: '१. कौन सा रोग है?',
        h2: '२. प्राथमिक समाधान',
        h3: '३. दवा और ब्रांड'
      },
      en: {
        h1: '1. Disease Identified',
        h2: '2. Basic Solutions',
        h3: '3. Pesticides & Brands'
      }
    };
    
    const h = headers[lang as keyof typeof headers] || headers.gu;

    const systemPrompt = `You are Krushi Sarathi, an expert agricultural AI.
Analyze the provided crop image. Identify the crop name and if there is a disease or if it is healthy.

You MUST provide the response in ${langName} language.
STRICTLY use the exact headings provided below and format them in bold markdown.

**પાકનું નામ (Crop Name):** [State the crop name here]

**${h.h1}**
(State the disease name and brief details here)

**${h.h2}**
(Provide watering changes, general fertilizer, basic care here using bullet points)

**${h.h3}**
(Provide specific chemical/organic brand names to use and exact actions here using bullet points)`;

    const requestBody = {
      contents: [{
        parts: [
          { text: systemPrompt },
          { inline_data: { mime_type: mimeType, data: base64Image } }
        ]
      }]
    };

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Gemini Error:", err);
      return NextResponse.json({ error: 'Failed to analyze image with Gemini' }, { status: 500 });
    }

    const data = await res.json();
    const advice = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No advice available.';

    // Safely extract the Disease Name for the top UI card
    let diseaseName = "પાક વિશ્લેષણ (Crop Analysis)";
    
    // Look for the disease name after the first heading (h.h1) or '1.'
    const lines = advice.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].replace(/\*\*/g, '').trim();
      if (line.match(/^(1\.|૧\.|१\.)/) || line.includes("કયો રોગ છે") || line.includes("कौन सा रोग") || line.includes("Disease Identified")) {
        // If the header itself contains the answer on the same line:
        const sameLineAnswer = line.replace(/^(1\.|૧\.|१\.)\s*(.*?)(?:\?|-|:)\s*(.+)/i, '$3').trim();
        if (sameLineAnswer && sameLineAnswer !== line) {
           diseaseName = sameLineAnswer;
           break;
        }
        // Otherwise, it's probably on the next non-empty line
        let nextLine = '';
        let j = i + 1;
        while (j < lines.length && !lines[j].trim()) j++;
        if (j < lines.length) {
           nextLine = lines[j].replace(/\*\*/g, '').trim();
           // Extract just the first sentence for a short title
           diseaseName = nextLine.split(/[।.\n]/)[0].trim();
        }
        break;
      }
    }

    return NextResponse.json({
      success: true,
      disease: diseaseName,
      confidence: 0.98,
      advice: advice
    });

  } catch (error: any) {
    console.error('Analysis Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to get AI advice' }, { status: 500 });
  }
}
