"use client";

import { useState, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';

export default function VoiceAssistant() {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const router = useRouter();

  const { language } = useLanguage();

  const processText = async (text: string) => {
    setIsProcessing(true);
    try {
      console.log("Heard:", text);
      if (!text || text.trim() === '') return;

      // 1. Send text to LLM to get intent
      const chatRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, lang: language })
      });
      const data = await chatRes.json();
      console.log("AI Intent:", data);

      if (!data || !data.message) {
        throw new Error("Invalid AI Response");
      }

      // 2. Execute Navigation based on intent
      if (data.action === 'navigate_camera') router.push('/camera');
      else if (data.action === 'navigate_dashboard') router.push('/');
      else if (data.action === 'navigate_farms') router.push('/profile');
      else if (data.action === 'navigate_history') router.push('/history');
      else if (data.action === 'navigate_advisor') router.push('/crop-advisor');
      else if (data.action === 'navigate_soil_test') router.push('/soil-test');

      // 3. Play TTS response (Detect language roughly for TTS)
      const isEnglish = /^[a-zA-Z\s.,!?]+$/.test(data.message.substring(0, 10));
      const ttsLang = isEnglish ? 'en-US' : (language === 'hi' ? 'hi-IN' : 'gu-IN');
      
      const audioUrl = `/api/tts?text=${encodeURIComponent(data.message)}&lang=${ttsLang}`;
      
      if (audioRef.current) audioRef.current.pause();
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      await audio.play();

    } catch (error) {
      console.error("Error processing voice intent", error);
      // Fallback audio if something fails
      const fallbackMsg = language === 'en' ? "Sorry, system error." : "માફ કરજો, સિસ્ટમમાં ખામી છે.";
      const ttsLang = language === 'en' ? 'en-US' : 'gu-IN';
      const audio = new Audio(`/api/tts?text=${encodeURIComponent(fallbackMsg)}&lang=${ttsLang}`);
      audio.play();
    } finally {
      setIsProcessing(false);
    }
  };

  const startRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('તમારા ફોનમાં વોઇસ ટાઇપિંગ સપોર્ટ નથી. (Voice not supported)');
      return;
    }

    if (audioRef.current) audioRef.current.pause();
    
    const recognition = new SpeechRecognition();
    
    // Use the current app language for speech recognition!
    if (language === 'en') recognition.lang = 'en-US';
    else if (language === 'hi') recognition.lang = 'hi-IN';
    else recognition.lang = 'gu-IN';

    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      processText(transcript);
    };

    recognition.onerror = (e: any) => {
      console.error("Speech recognition error", e.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const stopRecording = () => {
    // With browser speech recognition, it stops automatically or we just let it end.
    setIsListening(false);
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
