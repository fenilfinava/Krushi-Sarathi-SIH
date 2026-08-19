import Groq from 'groq-sdk';
import { NextResponse } from 'next/server';

const apiKey = process.env.GROQ_API_KEY || '';
const groq = new Groq({ apiKey });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const prompt = body.prompt || '';

    if (!apiKey) {
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

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      model: 'qwen/qwen3.6-27b',
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const text = chatCompletion.choices[0]?.message?.content || '{}';
    // Clean up in case of weird Qwen tags
    const cleanJsonText = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    
    let parsed;
    try {
      parsed = JSON.parse(cleanJsonText);
    } catch(e) {
      parsed = { action: "answer", message: cleanJsonText };
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
