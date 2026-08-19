import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const prompt = body.prompt || '';

    if (!GEMINI_API_KEY) {
      throw new Error('API Key is missing');
    }

    const systemPrompt = `You are "Krushi Sarathi", an AI assistant for farmers.
CRITICAL INSTRUCTION: You must respond in the EXACT SAME LANGUAGE as the user's prompt. 
If the user's prompt is in English, reply entirely in English. 
If the user's prompt is in Gujarati, reply entirely in Gujarati.
Your job is to act as a voice controller for the app and answer farming questions.

Determine the user's intent. Output ONLY a valid JSON object with no markdown formatting or backticks.
The JSON must have this exact structure:
{
  "action": "action_name",
  "message": "Your response to the user in the language they spoke"
}

Available actions:
- "navigate_camera": If they want to scan a crop, take a photo, or check for disease.
- "navigate_dashboard": If they want to see weather, go home, or see the dashboard.
- "navigate_farms": If they want to manage their farms.
- "navigate_history": If they want to see past records.
- "answer": For general farming questions that don't require navigation.

Example 1:
User: "મારે મારો પાક ચેક કરવો છે"
Output: {"action": "navigate_camera", "message": "ચોક્કસ, તમારો પાક ચેક કરવા માટે કેમેરો ચાલુ કરી રહ્યો છું."}

Example 2:
User: "What is the weather today?"
Output: {"action": "navigate_dashboard", "message": "Taking you to the dashboard to check the weather."}

Example 3:
User: "મગફળીમાં કયું ખાતર નખાય?"
Output: {"action": "answer", "message": "મગફળીમાં ડીએપી અથવા એનપીકે ખાતર નાખવું ફાયદાકારક છે."}`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          response_mime_type: "application/json"
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API Error: ${await response.text()}`);
    }

    const data = await response.json();
    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch(e) {
      parsed = { action: "answer", message: text };
    }

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ 
      action: 'answer', 
      message: 'માફ કરજો, સિસ્ટમમાં ખામી આવી છે.' 
    }, { status: 500 });
  }
}
