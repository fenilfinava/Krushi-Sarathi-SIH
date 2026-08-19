"use client";

import { useState, useRef } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Upload, Camera } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

import { saveActivityHistory } from '@/lib/history';

export default function CameraPage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null); // Clear old results
      setErrorMsg(null);
    }
  };

  const handleAnalyze = async () => {
    if (!imageFile) return;

    setIsAnalyzing(true);
    setErrorMsg(null);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('lang', language);

      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setResult(data);

        // Save generic history
        if (user) {
          const diseaseMatch = data.advice.match(/\*\*1\.\s([^*]+)\*\*/);
          const diseaseName = diseaseMatch ? diseaseMatch[1].trim() : "પાકનો રોગ તપાસ્યો";
          await saveActivityHistory(user.id, "Camera", diseaseName, data.advice);
        }
        
        // Auto-play the advice using our TTS endpoint
        try {
          // Remove Markdown characters for cleaner speech
          const cleanText = data.advice.replace(/[*#]/g, '');
          const ttsRes = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: cleanText, lang: language })
          });
          if (ttsRes.ok) {
            const audioBlob = await ttsRes.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audio.play();
          }
        } catch (e) {
          console.error("Auto TTS failed:", e);
        }

      } else {
        setErrorMsg(data.error || 'Failed to analyze');
      }
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || 'Error connecting to server');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="p-4 flex flex-col min-h-[calc(100vh-140px)]">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">{t('camera_title')}</h1>
      
      <div className="flex-1 bg-white rounded-3xl flex flex-col items-center justify-center relative overflow-hidden shadow-sm border border-gray-200">
        
        {previewUrl ? (
          <div className="w-full h-full flex flex-col">
            <div className="h-64 w-full relative bg-gray-100">
              <img src={previewUrl} alt="Crop preview" className="w-full h-full object-contain" />
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4 text-primary">
                  <Loader2 className="animate-spin w-12 h-12" />
                  <p className="font-medium text-lg">{t('analyzing')}</p>
                </div>
              ) : errorMsg ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl max-w-sm text-center font-medium">
                    {errorMsg}
                  </div>
                  <button 
                    onClick={handleAnalyze}
                    className="bg-primary text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-green-700"
                  >
                    ફરી પ્રયાસ કરો (Retry)
                  </button>
                </div>
              ) : result ? (
                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-lg text-red-800">{result.disease}</h3>
                      <p className="text-sm opacity-80 mt-1 text-red-800">Confidence: {(result.confidence * 100).toFixed(1)}%</p>
                    </div>
                    <button 
                      onClick={async () => {
                        const cleanText = result.advice.replace(/[*#]/g, '');
                        const ttsRes = await fetch('/api/tts', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ text: cleanText, lang: language })
                        });
                        if (ttsRes.ok) {
                          const audioBlob = await ttsRes.blob();
                          const audio = new Audio(URL.createObjectURL(audioBlob));
                          audio.play();
                        }
                      }}
                      className="bg-white text-red-700 p-3 rounded-full shadow hover:bg-red-100 transition-colors"
                      title="Listen"
                    >
                      🔊
                    </button>
                  </div>
                  
                  <div className="prose prose-sm max-w-none text-gray-700 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <ReactMarkdown>{result.advice}</ReactMarkdown>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center items-center h-full">
                  <button 
                    onClick={handleAnalyze}
                    className="bg-primary text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-green-700 hover:scale-105 transition-all"
                  >
                    ચેક કરો (Analyze Now)
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center p-8 w-full">
            <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto mb-6 flex items-center justify-center text-gray-400">
              <Camera size={48} />
            </div>
            <p className="text-gray-500 text-lg max-w-md mx-auto">{t('camera_desc')}</p>
          </div>
        )}

      </div>
      
      {/* Hidden File Input */}
      <input 
        type="file" 
        accept="image/*" 
        className="hidden" 
        ref={fileInputRef}
        onChange={handleImageChange}
      />

      <div className="mt-6 flex gap-4 max-w-md mx-auto w-full">
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-800 py-4 rounded-xl font-medium text-lg hover:bg-gray-200 transition-colors border border-gray-200"
        >
          <Upload size={20} />
          {t('gallery')}
        </button>
        {/* On mobile, capture="environment" opens the camera directly */}
        <button 
          onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.capture = 'environment';
              fileInputRef.current.click();
            }
          }}
          className="flex-1 flex items-center justify-center gap-2 bg-primary text-white py-4 rounded-xl font-medium text-lg shadow-md hover:bg-green-700 transition-colors"
        >
          <Camera size={20} />
          {t('take_photo')}
        </button>
      </div>
    </div>
  );
}
