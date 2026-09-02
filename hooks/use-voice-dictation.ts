"use client";

import { useEffect, useRef, useState } from "react";

// Android Chrome's SpeechRecognition `continuous: true` mode is unreliable —
// it tends to re-process and duplicate the same phrase. Working around it by
// running short (`continuous: false`) sessions that auto-restart on `onend`,
// only ever committing a session's *final* transcript once. This gives the
// user a "keep talking" experience without the duplication bug.
export function useVoiceDictation(onText: (finalizedText: string) => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const shouldListenRef = useRef(false);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSupported(!!SpeechRecognition);
    return () => {
      shouldListenRef.current = false;
      recognitionRef.current?.stop();
    };
  }, []);

  function startSession() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition = new SpeechRecognition();
    recognition.lang = "tr-TR";
    recognition.continuous = false;
    recognition.interimResults = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let finalText = "";
      for (let i = 0; i < event.results.length; i++) finalText += event.results[i][0].transcript;
      finalText = finalText.trim();
      if (finalText) onTextRef.current(finalText);
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      if (event.error !== "no-speech" && event.error !== "aborted") shouldListenRef.current = false;
    };
    recognition.onend = () => {
      if (shouldListenRef.current) startSession();
      else setListening(false);
    };
    recognitionRef.current = recognition;
    recognition.start();
  }

  function toggle() {
    if (listening) {
      shouldListenRef.current = false;
      recognitionRef.current?.stop();
      return;
    }
    shouldListenRef.current = true;
    setListening(true);
    startSession();
  }

  return { listening, supported, toggle };
}
