import React from 'react';
import { Loader2, Cpu } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export const LoadingOverlay: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-4 text-center">
      <div className="relative mb-6">
        <div className="absolute inset-0 animate-ping rounded-full bg-blue-500/20"></div>
        <Cpu className="h-16 w-16 text-blue-400 animate-pulse" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">{t('loading.title')}</h2>
      <p className="text-gray-300 max-w-xs animate-pulse text-sm">{t('loading.desc')}</p>
      <Loader2 className="mt-8 h-8 w-8 animate-spin text-blue-500" />
    </div>
  );
};
