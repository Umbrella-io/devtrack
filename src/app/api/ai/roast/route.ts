import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
  try {
    const { commits, prsMerged, issuesClosed } = await request.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API key not configured.' }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `
      You are an expert developer assistant. Write a concise, professional weekly standup update based on:
      Commits: ${commits}, PRs: ${prsMerged}, Issues: ${issuesClosed}
      Rules: Under 4 sentences, professional tone, Slack-ready format, use emojis. DO NOT hallucinate details.
    `;

    const result = await model.generateContent(prompt);
    return NextResponse.json({ standup: result.response.text() }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate update.' }, { status: 500 });
  }
}
