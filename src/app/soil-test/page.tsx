"use client";

import { useState, useRef } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Droplets, Leaf, Mic, Image as ImageIcon, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { saveActivityHistory } from '@/lib/history';

export default function SoilTestPage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [soilDesc, setSoilDesc] = useState('');
  const [question, setQuestion] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isListening, setIsListening] = useState<'desc' | 'q' | null>(null);
  const [result, setResult] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playAudio = async (text: string) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const cleanText = text.replace(/[*#]/g, '');
      const ttsRes = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText, lang: language })
      });
      if (ttsRes.ok) {
        const audioBlob = await ttsRes.blob();
        const audio = new Audio(URL.createObjectURL(audioBlob));
        audioRef.current = audio;
        audio.play();
      }
    } catch (e) {
      console.error("TTS failed:", e);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const startListening = (field: 'desc' | 'q') => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('તમારા બ્રાઉઝરમાં વોઇસ ટાઇપિંગ સપોર્ટ નથી.');
      return;
    }
    
    setIsListening(field);
    const recognition = new SpeechRecognition();
    recognition.lang = language === 'gu' ? 'gu-IN' : language === 'hi' ? 'hi-IN' : 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      if (field === 'desc') setSoilDesc(prev => prev + (prev ? " " : "") + text);
      else setQuestion(prev => prev + (prev ? " " : "") + text);
    };

    recognition.onerror = () => setIsListening(null);
    recognition.onend = () => setIsListening(null);
    
    recognition.start();
  };

  const handleAnalyze = async () => {
    if (!soilDesc && !imageFile) {
      alert("કૃપા કરીને જમીનનો ફોટો અથવા માહિતી આપો.");
      return;
    }
    setIsAnalyzing(true);
    setResult(null);
    
    try {
      const formData = new FormData();
      formData.append('soilDesc', soilDesc);
      formData.append('question', question);
      formData.append('lang', language);
      if (imageFile) {
        formData.append('image', imageFile);
      }

      const res = await fetch('/api/soil', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setResult(data.advice);
        
        if (user) {
          await saveActivityHistory(user.id, "Soil", "જમીન અને સિંચાઈ ટેસ્ટ", data.advice);
        }

        // Auto-Play Voice
        playAudio(data.advice);
        
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert("Error connecting to AI");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="p-4 flex flex-col min-h-[calc(100vh-140px)] max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2 text-gray-900">{t('soil_title')}</h1>
      <p className="text-gray-600 mb-6">{t('soil_subtitle')}</p>
      
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 flex-1">
        <div className="space-y-6">
          
          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('soil_photo_label')}</label>
            {previewUrl ? (
              <div className="relative inline-block w-full">
                <img src={previewUrl} alt="Soil" className="w-full h-48 object-cover rounded-xl border border-gray-200" />
                <button onClick={() => { setImageFile(null); setPreviewUrl(null); }} className="absolute top-2 right-2 bg-white text-red-500 p-1.5 rounded-full shadow-md">
                  <X size={20} />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 transition"
              >
                <ImageIcon size={32} className="mb-2" />
                <span>{t('soil_photo_btn')}</span>
              </button>
            )}
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageChange} />
          </div>

          {/* Description Input */}
          <div>
            <div className="flex justify-between items-end mb-2">
              <label className="block text-sm font-medium text-gray-700">{t('soil_desc_label')}</label>
              <button onClick={() => startListening('desc')} className={`p-2 rounded-full ${isListening === 'desc' ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-600'}`}>
                <Mic size={18} />
              </button>
            </div>
            <textarea 
              className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary"
              rows={3}
              value={soilDesc}
              onChange={e => setSoilDesc(e.target.value)}
              placeholder={t('soil_desc_placeholder')}
            />
          </div>

          {/* Question Input */}
          <div>
            <div className="flex justify-between items-end mb-2">
              <label className="block text-sm font-medium text-gray-700">{t('soil_q_label')}</label>
              <button onClick={() => startListening('q')} className={`p-2 rounded-full ${isListening === 'q' ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-600'}`}>
                <Mic size={18} />
              </button>
            </div>
            <input 
              type="text"
              className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder={t('soil_q_placeholder')}
            />
          </div>

          <button 
            onClick={handleAnalyze}
            disabled={isAnalyzing || (!soilDesc && !imageFile)}
            className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold text-lg hover:bg-orange-600 transition flex justify-center items-center gap-2 disabled:opacity-50 shadow-md"
          >
            {isAnalyzing ? <Loader2 className="animate-spin" /> : <Leaf />}
            {isAnalyzing ? t('soil_analyzing') : t('soil_analyze_btn')}
          </button>
        </div>
      </div>

      {result && (
        <div className="mt-8 bg-orange-50 border border-orange-200 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-orange-900 text-xl flex items-center gap-2">
              <Droplets /> {t('soil_report')}
            </h3>
            <button 
              onClick={() => playAudio(result)}
              className="bg-white text-orange-700 p-2.5 rounded-full shadow hover:bg-orange-100"
            >
              🔊
            </button>
          </div>
          <div className="prose prose-sm max-w-none text-gray-800">
            <ReactMarkdown>{result}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
