"use client";

import { useState, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function VoiceAssistant() {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const router = useRouter();

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      // 1. Transcribe audio using Whisper (Auto-detects language)
      const formData = new FormData();
      formData.append('file', new File([audioBlob], 'audio.webm', { type: 'audio/webm' }));
      
      const transcribeRes = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      });
      const transcribeData = await transcribeRes.json();
      const text = transcribeData.text;
      console.log("Heard (Whisper):", text);

      if (!text || text.trim() === '') {
        setIsProcessing(false);
        return;
      }

      // 2. Send text to LLM to get intent
      const chatRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text })
      });
      const data = await chatRes.json();
      console.log("AI Intent:", data);

      // 3. Execute Navigation based on intent
      if (data.action === 'navigate_camera') router.push('/camera');
      else if (data.action === 'navigate_dashboard') router.push('/');
      else if (data.action === 'navigate_farms') router.push('/');
      else if (data.action === 'navigate_history') router.push('/history');

      // 4. Play TTS response (Detect language roughly for TTS)
      const isEnglish = /^[a-zA-Z\s.,!?]+$/.test(data.message.substring(0, 10));
      const ttsLang = isEnglish ? 'en-US' : 'gu-IN';
      
      const audioUrl = `/api/tts?text=${encodeURIComponent(data.message)}&lang=${ttsLang}`;
      
      if (audioRef.current) audioRef.current.pause();
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      await audio.play();

    } catch (error) {
      console.error("Error processing voice intent", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const startRecording = async () => {
    try {
      if (audioRef.current) audioRef.current.pause();
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsListening(true);
    } catch (error) {
      console.error("Error accessing microphone", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  };

  const toggleVoice = () => {
    if (isProcessing) return;
    
    if (isListening) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col items-center gap-4">
      {/* Mic Button */}
      <button
        onClick={toggleVoice}
        disabled={isProcessing}
        className={`flex items-center justify-center w-16 h-16 rounded-full shadow-2xl transition-all duration-300 ${
          isListening 
            ? 'bg-red-500 animate-pulse scale-110' 
            : isProcessing
              ? 'bg-accent opacity-80 cursor-wait'
              : 'bg-primary hover:bg-green-700 hover:scale-105'
        } text-white`}
      >
        {isProcessing ? (
          <Loader2 className="animate-spin" size={28} />
        ) : isListening ? (
          <MicOff size={28} />
        ) : (
          <Mic size={28} />
        )}
      </button>
    </div>
  );
}
