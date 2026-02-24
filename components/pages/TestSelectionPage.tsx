import React from 'react';
import { Stethoscope, Globe, FileText, Eye } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { OrthopedicTest } from '../../types';

interface TestSelectionPageProps {
  availableTests: OrthopedicTest[];
  onStartTest: (id: string) => void;
  onOpenGallery: () => void;
  onToggleLanguage: () => void;
}

export const TestSelectionPage: React.FC<TestSelectionPageProps> = ({
  availableTests,
  onStartTest,
  onOpenGallery,
  onToggleLanguage,
}) => {
  const { t, language } = useLanguage();

  return (
    <div className="h-screen w-full bg-black text-white p-6 overflow-y-auto flex flex-col">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Stethoscope className="text-blue-500" /> {t('app.title')}
        </h1>
        <button
          onClick={onToggleLanguage}
          className="p-2 bg-gray-800 rounded-full text-gray-300 flex items-center gap-1 font-bold text-xs uppercase"
        >
          <Globe className="w-4 h-4" /> {language}
        </button>
      </div>
      <p className="text-gray-400 mb-8">{t('app.select_test_title')}:</p>

      <div className="grid gap-4 max-w-md mx-auto w-full">
        {availableTests.map((test) => (
          <button
            key={test.id}
            onClick={() => onStartTest(test.id)}
            className="bg-gray-900 border border-gray-700 hover:bg-gray-800 p-6 rounded-2xl text-left transition active:scale-95 group"
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xl font-bold group-hover:text-blue-400 transition-colors">
                {test.name}
              </h3>
              <span className="text-xs bg-blue-900 text-blue-300 px-2 py-1 rounded uppercase tracking-wider">
                {test.category}
              </span>
            </div>
            <p className="text-sm text-gray-400 mb-4">{test.description}</p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Eye className="w-3 h-3" /> {t('app.angle_view')}:{' '}
              {test.requiredView === 'Front' ? t('app.view.front') : t('app.view.side')}
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={onOpenGallery}
        className="mt-8 mx-auto flex items-center gap-2 text-gray-400 hover:text-white"
      >
        <FileText className="w-4 h-4" /> {t('app.view_history')}
      </button>
    </div>
  );
};
