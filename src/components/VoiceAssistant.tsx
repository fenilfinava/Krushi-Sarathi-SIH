"use client";

import { useState, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';

export default function VoiceAssistant() {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const router = useRouter();

  const { language } = useLanguage();

  const audioChunksRef = useRef<Blob[]>([]);

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      // Convert Blob to Base64
      const buffer = await audioBlob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Audio = btoa(binary);

      // 1. Send base64 audio to LLM to get intent
      const chatRes = await fetch('/api/chat_audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64Audio })
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
      const fallbackMsg = language === 'en' ? "Please try again." : "ફરી પ્રયત્ન કરો.";
      const ttsLang = language === 'en' ? 'en-US' : 'gu-IN';
      const audio = new Audio(`/api/tts?text=${encodeURIComponent(fallbackMsg)}&lang=${ttsLang}`);
      audio.play();
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
      
      // Stop automatically after 5 seconds
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          setIsListening(false);
        }
      }, 5000);

    } catch (error) {
      console.error("Error accessing microphone", error);
      alert('માઈક ચાલુ કરવામાં ભૂલ આવી. (Microphone Error)');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
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
