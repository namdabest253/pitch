"use client";

type SpeechCallback = (transcript: string) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let recognition: any = null;

export function startListening(
  onResult: SpeechCallback,
  onEnd: () => void
): void {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Speech recognition is not supported in this browser. Use Chrome.");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = "en-US";

  let finalTranscript = "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recognition.onresult = (event: any) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript + " ";
      }
    }
  };

  recognition.onend = () => {
    if (finalTranscript.trim()) {
      onResult(finalTranscript.trim());
    }
    onEnd();
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recognition.onerror = (event: any) => {
    console.error("Speech recognition error:", event.error);
    onEnd();
  };

  finalTranscript = "";
  recognition.start();
}

export function stopListening(): void {
  if (recognition) {
    recognition.stop();
    recognition = null;
  }
}

let currentUtterance: SpeechSynthesisUtterance | null = null;

export function speak(text: string, onEnd?: () => void): void {
  stopSpeaking();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  // Try to pick a natural-sounding voice
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(
    (v) => v.lang.startsWith("en") && v.name.includes("Google")
  ) || voices.find((v) => v.lang.startsWith("en"));
  if (preferred) utterance.voice = preferred;

  if (onEnd) utterance.onend = onEnd;
  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  window.speechSynthesis.cancel();
  currentUtterance = null;
}
