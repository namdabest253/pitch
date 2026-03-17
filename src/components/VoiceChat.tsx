"use client";

import { useState, useCallback, useRef } from "react";
import type { Mode, Message, Feedback } from "@/types";
import {
  startListening,
  stopListening,
  speak,
  stopSpeaking,
} from "@/lib/speech";
import ModeSelector from "./ModeSelector";
import Transcript from "./Transcript";
import FeedbackPanel from "./FeedbackPanel";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export default function VoiceChat() {
  const [mode, setMode] = useState<Mode>("interviewer");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [textInput, setTextInput] = useState("");
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [streamingFeedback, setStreamingFeedback] = useState<string | null>(
    null
  );
  const [activeFeedbackIndex, setActiveFeedbackIndex] = useState<
    number | null
  >(null);
  const sessionIdRef = useRef<string | undefined>(undefined);
  const logIdRef = useRef<string>(generateId());
  const startedAtRef = useRef<string>(new Date().toISOString());
  const userMessageCountRef = useRef(0);
  const messagesRef = useRef<Message[]>([]);
  const feedbacksRef = useRef<Feedback[]>([]);

  const saveSession = useCallback(
    async (msgs: Message[], fbs: Feedback[]) => {
      if (msgs.length === 0) return;
      try {
        await fetch("/api/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: logIdRef.current,
            mode,
            startedAt: startedAtRef.current,
            messages: msgs,
            feedbacks: fbs,
          }),
        });
      } catch (err) {
        console.error("Failed to save session:", err);
      }
    },
    [mode]
  );

  const fetchFeedback = useCallback(
    async (userMsg: string, agentQuestion: string, msgIndex: number) => {
      setActiveFeedbackIndex(msgIndex);
      setStreamingFeedback("");

      try {
        const res = await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userMessage: userMsg,
            agentQuestion,
            mode,
          }),
        });

        const reader = res.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.text) {
                  fullText = data.text;
                  setStreamingFeedback(fullText);
                }
                if (data.result) {
                  fullText = data.result;
                }
              } catch {
                // ignore
              }
            }
          }
        }

        if (fullText) {
          setFeedbacks((prev) => {
            const updated = [
              ...prev,
              { userMessageIndex: msgIndex, content: fullText },
            ];
            feedbacksRef.current = updated;
            saveSession(messagesRef.current, updated);
            return updated;
          });
        }
      } catch (err) {
        console.error("Feedback error:", err);
      } finally {
        setStreamingFeedback(null);
        setActiveFeedbackIndex(null);
      }
    },
    [mode, saveSession]
  );

  const sendMessage = useCallback(
    async (userText: string) => {
      const userMessage: Message = { role: "user", content: userText };
      setMessages((prev) => {
        const updated = [...prev, userMessage];
        messagesRef.current = updated;
        return updated;
      });
      setIsLoading(true);
      setStreamingText("");

      const currentUserIndex = userMessageCountRef.current;
      userMessageCountRef.current += 1;

      // Get the last assistant message as the question context
      const lastAssistantMsg = [...messages]
        .reverse()
        .find((m) => m.role === "assistant");
      const agentQuestion = lastAssistantMsg?.content || "(opening question)";

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userText,
            mode,
            sessionId: sessionIdRef.current,
          }),
        });

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No reader");

        // Fire feedback in parallel (don't await — runs alongside interviewer response)
        fetchFeedback(userText, agentQuestion, currentUserIndex);

        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.sessionId && !sessionIdRef.current) {
                  sessionIdRef.current = data.sessionId;
                }
                if (data.text) {
                  fullText = data.text;
                  setStreamingText(fullText);
                }
                if (data.result) {
                  fullText = data.result;
                  if (data.sessionId) {
                    sessionIdRef.current = data.sessionId;
                  }
                }
                if (data.error) {
                  fullText = `Error: ${data.error}`;
                }
              } catch {
                // ignore
              }
            }
          }
        }

        if (fullText) {
          const assistantMessage: Message = {
            role: "assistant",
            content: fullText,
          };
          setMessages((prev) => {
            const updated = [...prev, assistantMessage];
            messagesRef.current = updated;
            saveSession(updated, feedbacksRef.current);
            return updated;
          });
          setStreamingText("");

          if (autoSpeak) {
            setIsSpeaking(true);
            speak(fullText, () => setIsSpeaking(false));
          }
        }
      } catch (err) {
        console.error("Chat error:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [mode, autoSpeak, messages, fetchFeedback, saveSession]
  );

  const toggleMic = useCallback(() => {
    if (isListening) {
      stopListening();
      setIsListening(false);
    } else {
      stopSpeaking();
      setIsSpeaking(false);
      setIsListening(true);
      startListening(
        (transcript) => sendMessage(transcript),
        () => setIsListening(false)
      );
    }
  }, [isListening, sendMessage]);

  const handleSubmitText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || isLoading) return;
    sendMessage(textInput.trim());
    setTextInput("");
  };

  const handleNewSession = () => {
    setMessages([]);
    setStreamingText("");
    setFeedbacks([]);
    setStreamingFeedback(null);
    setActiveFeedbackIndex(null);
    sessionIdRef.current = undefined;
    logIdRef.current = generateId();
    startedAtRef.current = new Date().toISOString();
    userMessageCountRef.current = 0;
    messagesRef.current = [];
    feedbacksRef.current = [];
    stopSpeaking();
    setIsSpeaking(false);
  };

  const handleStopSpeaking = () => {
    stopSpeaking();
    setIsSpeaking(false);
  };

  return (
    <div className="flex h-screen bg-zinc-900 text-white">
      {/* Main chat area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="border-b border-zinc-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">Speaker</h1>
            <ModeSelector
              mode={mode}
              onModeChange={(m) => {
                setMode(m);
                handleNewSession();
              }}
              disabled={isLoading}
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSpeak}
                onChange={(e) => setAutoSpeak(e.target.checked)}
                className="rounded"
              />
              Auto-speak
            </label>
            <button
              onClick={handleNewSession}
              className="text-sm px-3 py-1.5 bg-zinc-800 rounded-lg hover:bg-zinc-700 text-zinc-400"
            >
              New Session
            </button>
          </div>
        </div>

        {/* Transcript */}
        <Transcript messages={messages} streamingText={streamingText} />

        {/* Input area */}
        <div className="border-t border-zinc-800 p-4">
          <div className="flex items-center gap-3 max-w-4xl mx-auto">
            <button
              onClick={toggleMic}
              disabled={isLoading}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shrink-0 ${
                isListening
                  ? "bg-red-500 animate-pulse scale-110"
                  : "bg-zinc-700 hover:bg-zinc-600"
              } disabled:opacity-50`}
              title={isListening ? "Stop recording" : "Start recording"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-6 h-6"
              >
                <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3z" />
                <path d="M17 11a1 1 0 0 1 2 0 7 7 0 0 1-6 6.92V20h3a1 1 0 0 1 0 2H8a1 1 0 0 1 0-2h3v-2.08A7 7 0 0 1 5 11a1 1 0 0 1 2 0 5 5 0 0 0 10 0z" />
              </svg>
            </button>

            {isSpeaking && (
              <button
                onClick={handleStopSpeaking}
                className="w-14 h-14 rounded-full bg-orange-600 flex items-center justify-center shrink-0 hover:bg-orange-500"
                title="Stop speaking"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-6 h-6"
                >
                  <path d="M6 6h12v12H6z" />
                </svg>
              </button>
            )}

            <form onSubmit={handleSubmitText} className="flex-1 flex gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={
                  isListening
                    ? "Listening..."
                    : "Type a message or click the mic..."
                }
                disabled={isLoading || isListening}
                className="flex-1 bg-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!textInput.trim() || isLoading}
                className="px-4 py-3 bg-zinc-700 rounded-xl hover:bg-zinc-600 disabled:opacity-50 disabled:hover:bg-zinc-700"
              >
                Send
              </button>
            </form>
          </div>

          <div className="text-center mt-2 text-xs text-zinc-500">
            {isListening && "Listening — click mic again to stop and send"}
            {isLoading && "Thinking..."}
            {isSpeaking && "Speaking — click stop to interrupt"}
          </div>
        </div>
      </div>

      {/* Feedback sidebar */}
      <FeedbackPanel
        feedbacks={feedbacks}
        streamingFeedback={streamingFeedback}
        activeFeedbackIndex={activeFeedbackIndex}
      />
    </div>
  );
}
