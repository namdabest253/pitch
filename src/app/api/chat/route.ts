import OpenAI from "openai";
import { getResume, getProjects, getBehavioral } from "@/lib/data";
import { getSystemPrompt } from "@/lib/claude";
import type { ChatRequest, Message } from "@/types";

const openai = new OpenAI();

// Store conversation history per session (in-memory)
const sessions = new Map<string, { systemPrompt: string; messages: { role: "user" | "assistant"; content: string }[] }>();

function generateSessionId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export async function POST(request: Request) {
  const { message, mode, sessionId }: ChatRequest = await request.json();

  let sid = sessionId;
  let session = sid ? sessions.get(sid) : undefined;

  if (!session) {
    sid = generateSessionId();
    const resume = getResume();
    const projects = getProjects();
    const behavioral = getBehavioral();
    const systemPrompt = getSystemPrompt(mode, resume, projects, behavioral);
    session = { systemPrompt, messages: [] };
    sessions.set(sid, session);
  }

  session.messages.push({ role: "user", content: message });

  const stream = await openai.chat.completions.create({
    model: "gpt-4o",
    stream: true,
    messages: [
      { role: "system", content: session.systemPrompt },
      ...session.messages,
    ],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      // Send session ID immediately
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ sessionId: sid })}\n\n`)
      );

      let fullText = "";

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          fullText += delta;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ text: fullText })}\n\n`)
          );
        }
      }

      // Save assistant response to session
      if (fullText) {
        session!.messages.push({ role: "assistant", content: fullText });
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ result: fullText, sessionId: sid })}\n\n`
          )
        );
      }

      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
