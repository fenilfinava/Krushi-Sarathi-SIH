"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Camera, History, Sprout, LogOut, Droplets } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { LanguageCode } from '@/utils/translations';

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { t, language, setLanguage } = useLanguage();
  const { user, logout } = useAuth();

  const links = [
    { href: '/', label: t('dashboard'), icon: Home },
    { href: '/camera', label: t('disease_title'), icon: Camera },
    { href: '/soil-test', label: t('irrigation_title'), icon: Droplets },
    { href: '/crop-advisor', label: t('advisor_title'), icon: Sprout },
    { href: '/history', label: t('history'), icon: History },
  ];

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (pathname === '/login' || pathname === '/onboarding') return null;

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Krushi Sarathi Logo" className="w-10 h-10 object-contain rounded-full border border-gray-100 shadow-sm" />
            <span className="text-2xl font-bold text-green-700 hidden sm:block">Krushi Sarathi</span>
          </Link>
          <div className="flex space-x-8">
            {links.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive
                      ? 'border-green-600 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="mr-2" size={18} />
                  {link.label}
                </Link>
              );
            })}
          </div>
          <div className="flex items-center space-x-4">
             {/* Language Dropdown */}
             <select 
               value={language}
               onChange={(e) => setLanguage(e.target.value as LanguageCode)}
               className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block p-2 outline-none cursor-pointer"
             >
               <option value="gu">ગુજરાતી</option>
               <option value="hi">हिंदी</option>
               <option value="en">English</option>
             </select>

             {user ? (
               <div className="flex items-center gap-3">
                 <Link href="/profile" className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-800 font-bold shadow-sm hover:bg-green-200 transition">
                   {user.name.charAt(0).toUpperCase()}
                 </Link>
                 <button onClick={handleLogout} className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition">
                   <LogOut size={20} />
                 </button>
               </div>
             ) : (
               <Link href="/login" className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold">
                 Login
               </Link>
             )}
          </div>
        </div>
      </div>
    </nav>
  );
}
