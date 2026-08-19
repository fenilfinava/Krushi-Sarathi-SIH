"use client";

import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Loader2, Sprout, TrendingUp, CloudRain, MapPin, Mic } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { saveActivityHistory } from '@/lib/history';
import { useAuth } from '@/context/AuthContext';

export default function CropAdvisorPage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [soil, setSoil] = useState('');
  const [season, setSeason] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [location, setLocation] = useState<{lat: number, lon: number, name: string} | null>(null);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    setSeason(t('ca_season_kharif'));
  }, [language]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const geoData = await geoRes.json();
          const city = geoData.address?.city || geoData.address?.town || geoData.address?.village || "Unknown";
          setLocation({ lat: latitude, lon: longitude, name: city });
        } catch (e) {
          console.error("Geo error:", e);
        }
      }, () => {
        // Permission denied or error — silently continue
        console.log("Geolocation permission denied");
      });
    }
  }, []);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert('Voice typing not supported.');
    setIsListening(true);
    const recognition = new SpeechRecognition();
    recognition.lang = language === 'gu' ? 'gu-IN' : language === 'hi' ? 'hi-IN' : 'en-US';
    recognition.onresult = (e: any) => setSoil(prev => prev + " " + e.results[0][0].transcript);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const handleAnalyze = async () => {
    if (!soil) return alert("તમારી જમીન વિશે માહિતી આપો.");
    if (!location) return alert("લોકેશન મળી રહ્યું નથી, કૃપા કરીને લોકેશન ચાલુ કરો.");
    
    setIsAnalyzing(true);
    setResult(null);
    try {
      const res = await fetch('/api/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          soil,
          season,
          latitude: location.lat,
          longitude: location.lon,
          lang: language
        })
      });

      const data = await res.json();
      if (res.ok) {
        setResult(data.advice);
        
        if (user) {
          const title = soil.substring(0, 50) + "...";
          await saveActivityHistory(user.id, "Advisor", title, data.advice);
        }

        // Auto-Play Voice
        try {
          const cleanText = data.advice.replace(/[*#]/g, '');
          const ttsRes = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: cleanText, lang: language })
          });
          if (ttsRes.ok) {
            const audioBlob = await ttsRes.blob();
            new Audio(URL.createObjectURL(audioBlob)).play();
          }
        } catch(e) {}
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
    <div className="p-4 flex flex-col min-h-[calc(100vh-140px)] max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2 text-gray-900">{t('ca_title')}</h1>
      <p className="text-gray-600 mb-6 flex flex-wrap gap-2 items-center">
        {t('ca_subtitle')}
        {location && <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-md text-xs flex items-center gap-1"><MapPin size={12}/> {location.name}</span>}
      </p>
      
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 flex-1">
        <div className="space-y-6">
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('ca_season_label')}</label>
            <div className="flex gap-4">
              {[t('ca_season_kharif'), t('ca_season_rabi'), t('ca_season_zaid')].map(s => (
                <button 
                  key={s}
                  onClick={() => setSeason(s)}
                  className={`flex-1 py-3 rounded-xl border ${season === s ? 'bg-purple-50 border-purple-500 text-purple-700 font-bold' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-end mb-2">
              <label className="block text-sm font-medium text-gray-700">{t('ca_soil_label')}</label>
              <button onClick={startListening} className={`p-2 rounded-full ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-600'}`}>
                <Mic size={18} />
              </button>
            </div>
            <textarea 
              className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-purple-500"
              rows={3}
              value={soil}
              onChange={e => setSoil(e.target.value)}
              placeholder={t('ca_soil_placeholder')}
            />
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 text-sm text-blue-800">
            <TrendingUp size={24} className="shrink-0" />
            <p dangerouslySetInnerHTML={{ __html: t('ca_info') }}></p>
          </div>

          <button 
            onClick={handleAnalyze}
            disabled={isAnalyzing || !soil}
            className="w-full bg-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-purple-700 transition flex justify-center items-center gap-2 disabled:opacity-50 shadow-md"
          >
            {isAnalyzing ? <Loader2 className="animate-spin" /> : <Sprout />}
            {isAnalyzing ? t('ca_analyzing') : t('ca_analyze_btn')}
          </button>
        </div>
      </div>

      {result && (
        <div className="mt-8 bg-purple-50 border border-purple-200 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-purple-900 text-xl flex items-center gap-2">
              <Sprout /> {t('ca_report')}
            </h3>
            <button 
              onClick={async () => {
                const cleanText = result.replace(/[*#]/g, '');
                const ttsRes = await fetch('/api/tts', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ text: cleanText, lang: language })
                });
                if (ttsRes.ok) {
                  const audioBlob = await ttsRes.blob();
                  new Audio(URL.createObjectURL(audioBlob)).play();
                }
              }}
              className="bg-white text-purple-700 p-2.5 rounded-full shadow hover:bg-purple-100"
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
