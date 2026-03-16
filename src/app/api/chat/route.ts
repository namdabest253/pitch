import { spawn } from "child_process";
import { getResume, getProjects } from "@/lib/data";
import { getSystemPrompt } from "@/lib/claude";
import type { ChatRequest } from "@/types";

export async function POST(request: Request) {
  const { message, mode, sessionId }: ChatRequest = await request.json();

  const args = [
    "-p",
    message,
    "--output-format",
    "stream-json",
    "--verbose",
    "--model",
    "sonnet",
    "--tools",
    "",
  ];

  if (sessionId) {
    args.push("--resume", sessionId);
  } else {
    const resume = getResume();
    const projects = getProjects();
    const systemPrompt = getSystemPrompt(mode, resume, projects);
    args.push("--system-prompt", systemPrompt);
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    start(controller) {
      const proc = spawn("claude", args, {
        stdio: ["pipe", "pipe", "pipe"],
      });

      let buffer = "";

      proc.stdout.on("data", (data: Buffer) => {
        buffer += data.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);

            // Extract session ID from init event
            if (event.type === "system" && event.subtype === "init") {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ sessionId: event.session_id })}\n\n`
                )
              );
            }

            // Extract text from assistant messages
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

            // Extract final result text
            if (event.type === "result" && event.result) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ result: event.result, sessionId: event.session_id })}\n\n`
                )
              );
            }
          } catch {
            // ignore parse errors on partial lines
          }
        }
      });

      proc.stderr.on("data", (data: Buffer) => {
        console.error("claude stderr:", data.toString());
      });

      proc.on("close", () => {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      });

      proc.on("error", (err) => {
        console.error("Failed to spawn claude:", err);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: "Failed to start Claude CLI. Is it installed?" })}\n\n`
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
