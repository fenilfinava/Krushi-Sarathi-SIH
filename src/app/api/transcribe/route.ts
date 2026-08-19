import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { File } from 'buffer';

const apiKey = process.env.GROQ_API_KEY || '';
const groq = new Groq({ apiKey });

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as globalThis.File;

    if (!file) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
    }

    const transcription = await groq.audio.transcriptions.create({
      file: file,
      model: 'whisper-large-v3',
    });

    return NextResponse.json({ text: transcription.text });
  } catch (error: any) {
    console.error('Transcription Error:', error);
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
  }
}
