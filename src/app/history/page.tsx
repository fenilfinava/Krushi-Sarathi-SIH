"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { supabase } from "@/lib/supabase";
import { Loader2, History, Leaf, Camera, Droplets, Sprout } from "lucide-react";
import Link from "next/link";

export default function HistoryPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      if (!user) return;
      try {
        const scans = await supabase.from("activity_history").eq("user_id", user.id);
        
        if (scans && Array.isArray(scans)) {
          const localeCode = language === 'gu' ? 'gu-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';
          const formattedHistory = scans.reverse().map((scan: any) => ({
            id: scan.id,
            date: new Date(scan.created_at).toLocaleDateString(localeCode, { day: 'numeric', month: 'short', year: 'numeric' }),
            title: scan.title,
            description: scan.description,
            type: scan.activity_type
          }));
          setHistory(formattedHistory);
        } else {
          setHistory([]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    
    fetchHistory();
  }, [user, language]);

  if (!user) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  const getIcon = (type: string) => {
    if (type === "Camera") return <Camera size={24} className="text-red-500" />;
    if (type === "Soil") return <Droplets size={24} className="text-blue-500" />;
    if (type === "Advisor") return <Sprout size={24} className="text-purple-500" />;
    return <History size={24} className="text-gray-500" />;
  };

  const getBgColor = (type: string) => {
    if (type === "Camera") return "bg-red-50";
    if (type === "Soil") return "bg-blue-50";
    if (type === "Advisor") return "bg-purple-50";
    return "bg-gray-50";
  };

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto pb-24">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
          <History size={24} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">{t('history_title')}</h1>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="animate-spin text-green-500 w-8 h-8" />
        </div>
      ) : history.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-dashed border-gray-300 text-center shadow-sm">
          <Leaf size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-700">{t('history_empty')}</h3>
          <p className="text-gray-500 mt-2 mb-6">{t('history_empty_desc')}</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/camera" className="bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-50 transition">{t('history_scan')}</Link>
            <Link href="/soil-test" className="bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-50 transition">{t('history_soil')}</Link>
            <Link href="/crop-advisor" className="bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-50 transition">{t('history_advisor')}</Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((item, index) => (
            <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4 hover:border-green-300 transition">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 ${getBgColor(item.type)} rounded-xl flex items-center justify-center shrink-0`}>
                  {getIcon(item.type)}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">{item.title}</h3>
                  <p className="text-sm font-bold text-gray-400 mt-1">{item.date}</p>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl text-sm text-gray-700">
                {item.description}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
