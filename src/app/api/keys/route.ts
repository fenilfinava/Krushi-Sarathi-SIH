import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hfToken: process.env.HUGGINGFACE_API_KEY || ''
  });
}
