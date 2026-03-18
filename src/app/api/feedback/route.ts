import OpenAI from "openai";
import { getResume, getProjects, getBehavioral } from "@/lib/data";
import { getFeedbackPrompt } from "@/lib/claude";
import type { FeedbackRequest } from "@/types";

const openai = new OpenAI();

export async function POST(request: Request) {
  const { userMessage, agentQuestion, mode }: FeedbackRequest =
    await request.json();

  const resume = getResume();
  const projects = getProjects();
  const behavioral = getBehavioral();
  const systemPrompt = getFeedbackPrompt(mode, resume, projects, behavioral);

  const prompt = `The interviewer asked: "${agentQuestion}"

The candidate responded: "${userMessage}"

Analyze this response. If the candidate referenced a specific project, check their GitHub repo to verify their claims. If this is a behavioral answer, compare it to their prepared STAR stories. Give concise, actionable feedback.`;

  const stream = await openai.chat.completions.create({
    model: "gpt-4o",
    stream: true,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
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

      if (fullText) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ result: fullText })}\n\n`)
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
