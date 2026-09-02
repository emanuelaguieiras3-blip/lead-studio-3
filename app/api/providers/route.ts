import { NextResponse } from 'next/server.js';

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    providers: {
      gemini: { configured: Boolean(process.env.GEMINI_API_KEY), model: 'gemini-3.6-flash' },
      openai: { configured: Boolean(process.env.OPENAI_API_KEY), model: 'gpt-5.4', reasoningEffort: 'medium' },
    },
    models: ['gemini-3.6-flash', 'gemini-3.7-flash', 'gpt-5.4'],
  }, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
}
