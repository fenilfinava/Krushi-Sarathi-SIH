"use client";

import { useState, useEffect } from 'react';
import { Sun, Cloud, CloudRain, Wind, MapPin, Loader2, Scan, Droplets, Sprout, Plus } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

function getWeatherDesc(code: number, lang: string) {
  if (code === 0) return lang === 'gu' ? 'ખુલ્લું આકાશ' : lang === 'hi' ? 'साफ आसमान' : 'Clear Sky';
  if (code >= 1 && code <= 3) return lang === 'gu' ? 'વાદળછાયું' : lang === 'hi' ? 'बादल छाये रहेंगे' : 'Partly Cloudy';
  if (code >= 51 && code <= 67) return lang === 'gu' ? 'વરસાદ' : lang === 'hi' ? 'बारिश' : 'Rain';
  if (code >= 71 && code <= 77) return lang === 'gu' ? 'બરફવર્ષા' : lang === 'hi' ? 'बर्फबारी' : 'Snowfall';
  if (code >= 95) return lang === 'gu' ? 'વાવાઝોડું' : lang === 'hi' ? 'तूफ़ान' : 'Thunderstorm';
  return lang === 'gu' ? 'સામાન્ય' : lang === 'hi' ? 'सामान्य' : 'Normal';
}

function getWeatherIcon(code: number) {
  if (code === 0) return <Sun size={24} />;
  if (code >= 1 && code <= 3) return <Cloud size={24} />;
  if (code >= 51 && code <= 67) return <CloudRain size={24} />;
  return <Sun size={24} />;
}

export default function Dashboard() {
  const { t, language } = useLanguage();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [weather, setWeather] = useState({
    temp: 0,
    wind: 0,
    rainProb: 0,
    code: 0,
    location: "Loading...",
    loading: true
  });

  const [farms, setFarms] = useState<any[]>([]);
  const [loadingFarms, setLoadingFarms] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function loadFarms() {
      if (user) {
        try {
          const data = await supabase.from('farms').eq('user_id', user.id);
          if (data) setFarms(data);
        } catch (e) {
          console.error("Error fetching farms", e);
        } finally {
          setLoadingFarms(false);
        }
      }
    }
    loadFarms();
  }, [user]);

  // Translate user-entered farm details dynamically if language changes
  useEffect(() => {
    async function translateFarms() {
      if (!farms || farms.length === 0) return;
      
      const textsToTranslate: string[] = [];
      farms.forEach(f => {
        textsToTranslate.push(f.farm_name, f.soil_type, f.crop_name);
      });

      try {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texts: textsToTranslate, targetLang: language })
        });
        const data = await res.json();
        
        if (data.translated && data.translated.length === textsToTranslate.length) {
          let i = 0;
          setFarms(prev => prev.map(f => ({
            ...f,
            translated_farm_name: data.translated[i++],
            translated_soil_type: data.translated[i++],
            translated_crop_name: data.translated[i++]
          })));
        }
      } catch (e) {
        console.error("Translation failed", e);
      }
    }

    if (language !== 'gu') {
      // By default, assuming they typed in Gujarati. We translate to EN/HI.
      translateFarms();
    } else {
      // Revert to original
      setFarms(prev => prev.map(f => ({
        ...f,
        translated_farm_name: f.farm_name,
        translated_soil_type: f.soil_type,
        translated_crop_name: f.crop_name
      })));
    }
  }, [language, farms.length]); // depend on farms.length so it runs after fetch

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const geoData = await geoRes.json();
          const city = geoData.address.city || geoData.address.town || geoData.address.village || "Unknown";

          const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m&daily=precipitation_probability_max&timezone=auto`);
          const wData = await wRes.json();

          setWeather({
            temp: Math.round(wData.current.temperature_2m),
            wind: Math.round(wData.current.wind_speed_10m),
            code: wData.current.weather_code,
            rainProb: wData.daily.precipitation_probability_max[0],
            location: city + ", " + (geoData.address.state || ""),
            loading: false
          });
        } catch (e) {
          console.error(e);
        }
      });
    }
  }, []);

  if (authLoading || !user) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 pb-24">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <section 
          className="col-span-1 md:col-span-2 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden bg-cover bg-center"
          style={{ backgroundImage: "url('/hero-bg.jpg')" }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20"></div>
          
          <div className="relative z-10 flex flex-col h-full justify-between gap-8">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-2 drop-shadow-md">{t('greeting')}, {user.name || 'કૃષક'}!</h2>
              <p className="text-gray-100 font-medium drop-shadow-md">{t('subtitle')}</p>
            </div>

            <div className="bg-black/30 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-2xl">
              <div className="flex justify-between items-start mb-6 border-b border-white/20 pb-4">
                <div>
                  <h3 className="font-bold text-xl flex items-center gap-2 drop-shadow">
                    <MapPin size={20} />
                    {weather.location}
                  </h3>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">{getWeatherIcon(weather.code)} <span className="text-2xl font-bold">{weather.loading ? "--" : weather.temp}°C</span></div>
                  <p className="text-sm text-gray-300">{getWeatherDesc(weather.code, language)}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1"><CloudRain size={24} /> <span className="text-xl font-bold">{weather.loading ? "--" : weather.rainProb}%</span></div>
                  <p className="text-sm text-gray-300">{t('rain')}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1"><Wind size={24} /> <span className="text-xl font-bold">{weather.loading ? "--" : weather.wind}</span></div>
                  <p className="text-sm text-gray-300">{t('wind')}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="col-span-1 grid grid-cols-1 gap-4">
          <Link href="/camera" className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mb-4"><Scan size={24} /></div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">{t('disease_title')}</h3>
              <p className="text-sm text-gray-500 mt-1">{t('disease_desc')}</p>
            </div>
          </Link>

          <Link href="/soil-test" className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4"><Droplets size={24} /></div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">{t('irrigation_title')}</h3>
              <p className="text-sm text-gray-500 mt-1">{t('irrigation_desc')}</p>
            </div>
          </Link>

          <Link href="/crop-advisor" className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition">
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-4"><Sprout size={24} /></div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">{t('advisor_title')}</h3>
              <p className="text-sm text-gray-500 mt-1">{t('advisor_desc')}</p>
            </div>
          </Link>
        </section>
      </div>
      
      <div className="flex justify-between items-center mt-8">
        <h2 className="text-2xl font-bold text-gray-900">{t('farms')}</h2>
        <Link href="/onboarding" className="text-green-600 font-bold bg-green-50 px-4 py-2 rounded-lg hover:bg-green-100 transition">
          {t('add_farm')}
        </Link>
      </div>

      {loadingFarms ? (
        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-green-500" /></div>
      ) : farms.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-dashed border-gray-300 text-center">
          <Sprout size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-bold text-gray-700">{t('farm_no_farms')}</h3>
          <p className="text-gray-500 mt-2 mb-4">{t('farm_no_farms_desc')}</p>
          <Link href="/onboarding" className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-bold">
            <Plus size={20} /> {t('farm_add_btn')}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {farms.map((farm: any) => {
            const sowingDate = new Date(farm.sowing_date);
            const today = new Date();
            const daysSince = Math.floor((today.getTime() - sowingDate.getTime()) / (1000 * 3600 * 24));
            
            let alertMsg = "";
            if (daysSince > 45 && daysSince < 55) alertMsg = t('farm_alert_fertilizer');
            else if (daysSince > 60) alertMsg = t('farm_alert_pesticide');
            else alertMsg = t('farm_alert_growing');

            // Support dynamically translated fields if they exist
            const dFarmName = farm.translated_farm_name || farm.farm_name;
            const dSoilType = farm.translated_soil_type || farm.soil_type;
            const dCropName = farm.translated_crop_name || farm.crop_name;

            return (
              <div key={farm.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:border-green-300 transition">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{dFarmName}</h3>
                    <p className="text-gray-500 text-sm mt-1">{t('farm_area')}: {farm.area_vigha} {t('farm_vigha')} • {t('farm_soil')}: {dSoilType}</p>
                  </div>
                  <div className="bg-green-100 text-green-800 text-sm font-bold px-3 py-1 rounded-full">{dCropName}</div>
                </div>
                <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl">
                  <p className="text-orange-800 text-sm font-medium">🔔 <b>{t('farm_ai_alert')} ({daysSince} {t('farm_days_after_sowing')}):</b> {alertMsg}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
