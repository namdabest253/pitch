"use client";

import type { Feedback } from "@/types";

interface Props {
  feedbacks: Feedback[];
  streamingFeedback: string | null;
  activeFeedbackIndex: number | null;
}

export default function FeedbackPanel({
  feedbacks,
  streamingFeedback,
  activeFeedbackIndex,
}: Props) {
  const hasContent = feedbacks.length > 0 || streamingFeedback;

  return (
    <div className="w-80 border-l border-zinc-800 flex flex-col bg-zinc-950">
      <div className="p-3 border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-300">Coach Feedback</h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Checks your GitHub repos to verify claims
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {!hasContent && (
          <p className="text-xs text-zinc-600 mt-8 text-center">
            Feedback will appear here after you respond to a question
          </p>
        )}
        {feedbacks.map((fb) => (
          <div
            key={fb.userMessageIndex}
            className="bg-zinc-900 rounded-lg p-3 border border-zinc-800"
          >
            <div className="text-xs text-zinc-500 mb-1.5">
              Response #{fb.userMessageIndex + 1}
            </div>
            <div className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
              {fb.content}
            </div>
          </div>
        ))}
        {streamingFeedback && activeFeedbackIndex !== null && (
          <div className="bg-zinc-900 rounded-lg p-3 border border-amber-900/50">
            <div className="text-xs text-amber-500 mb-1.5 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
              Analyzing response #{activeFeedbackIndex + 1}...
            </div>
            <div className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
              {streamingFeedback}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
