"use client";

import type { Mode } from "@/types";

interface Props {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  disabled: boolean;
}

export default function ModeSelector({ mode, onModeChange, disabled }: Props) {
  return (
    <div className="flex gap-3">
      <button
        onClick={() => onModeChange("interviewer")}
        disabled={disabled}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          mode === "interviewer"
            ? "bg-red-600 text-white"
            : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
        } disabled:opacity-50`}
      >
        Tough Interviewer
      </button>
      <button
        onClick={() => onModeChange("layman")}
        disabled={disabled}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          mode === "layman"
            ? "bg-blue-600 text-white"
            : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
        } disabled:opacity-50`}
      >
        Curious Layman
      </button>
    </div>
  );
}
