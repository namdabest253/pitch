import { getResume, getProjects, getBehavioral } from "@/lib/data";
import { getFeedbackPrompt } from "@/lib/claude";
import { spawnClaude } from "@/lib/spawn-claude";
import type { FeedbackRequest } from "@/types";

export async function POST(request: Request) {
  const { userMessage, agentQuestion, mode }: FeedbackRequest =
    await request.json();

  const resume = getResume();
  const projects = getProjects();
  const behavioral = getBehavioral();
  const systemPrompt = getFeedbackPrompt(mode, resume, projects, behavioral);

  const prompt = `The interviewer asked: "${agentQuestion}"

The candidate responded: "${userMessage}"

Analyze this response. If the candidate referenced a specific project, fetch code from their GitHub repo to verify their claims. If this is a behavioral answer, compare it to their prepared STAR stories. Give concise, actionable feedback.`;

  const proc = spawnClaude({
    message: prompt,
    systemPrompt,
    allowedTools: ["WebFetch"],
    dangerouslySkipPermissions: true,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    start(controller) {
      let buffer = "";

      proc.stdout!.on("data", (data: Buffer) => {
        buffer += data.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);

            if (event.type === "assistant" && event.message?.content) {
              for (const block of event.message.content) {
                if (block.type === "text" && block.text) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ text: block.text })}\n\n`
                    )
                  );
                }
              }
            }

            if (event.type === "result" && event.result) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ result: event.result })}\n\n`
                )
              );
            }
          } catch {
            // ignore parse errors
          }
        }
      });

      proc.stderr!.on("data", (data: Buffer) => {
        console.error("feedback stderr:", data.toString());
      });

      proc.on("close", (code) => {
        console.log("claude feedback exited with code:", code);
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      });

      proc.on("error", (err) => {
        console.error("Failed to spawn claude for feedback:", err);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: "Feedback agent failed to start" })}\n\n`
          )
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      });
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
