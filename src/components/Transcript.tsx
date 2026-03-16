"use client";

import { useEffect, useRef } from "react";
import type { Message } from "@/types";

interface Props {
  messages: Message[];
  streamingText: string;
}

export default function Transcript({ messages, streamingText }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  return (
    <div className="flex-1 overflow-y-auto space-y-4 p-4">
      {messages.length === 0 && !streamingText && (
        <div className="text-zinc-500 text-center mt-20">
          <p className="text-lg">Select a mode and click the mic to start</p>
          <p className="text-sm mt-2">
            Or type a message below
          </p>
        </div>
      )}
      {messages.map((msg, i) => (
        <div
          key={i}
          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              msg.role === "user"
                ? "bg-zinc-700 text-white"
                : "bg-zinc-800 text-zinc-200"
            }`}
          >
            <p className="text-xs font-medium mb-1 text-zinc-400">
              {msg.role === "user" ? "You" : "Agent"}
            </p>
            <p className="whitespace-pre-wrap">{msg.content}</p>
          </div>
        </div>
      ))}
      {streamingText && (
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-zinc-800 text-zinc-200">
            <p className="text-xs font-medium mb-1 text-zinc-400">Agent</p>
            <p className="whitespace-pre-wrap">{streamingText}</p>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
