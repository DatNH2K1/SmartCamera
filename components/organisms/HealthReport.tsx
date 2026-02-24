import React from 'react';
import { Check, Activity, ChevronUp, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { HealthReport as HealthReportData } from '../../types';

interface HealthReportProps {
  report: HealthReportData | null;
  isDrawerOpen: boolean;
  onToggleDrawer: () => void;
  isEditBarOpen: boolean;
}

export const HealthReport: React.FC<HealthReportProps> = ({
  report,
  isDrawerOpen,
  onToggleDrawer,
  isEditBarOpen,
}) => {
  const { t } = useLanguage();

  if (isEditBarOpen) return null;

  const renderContent = () => {
    if (!report) {
      return <div className="text-gray-400 text-center py-4">{t('app.insufficient_data')}</div>;
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">{report.title}</h2>
          <div
            className={`px-4 py-2 rounded-full font-bold text-white ${
              report.score >= 80
                ? 'bg-green-600'
                : report.score >= 50
                  ? 'bg-yellow-600'
                  : 'bg-red-600'
            }`}
          >
            {report.score}/100
          </div>
        </div>

        <p className="text-gray-300">{report.description}</p>

        <div className="bg-white/5 p-4 rounded-xl border border-white/10">
          <h4 className="text-xs text-gray-400 uppercase font-bold mb-2">
            {t('app.technical_details')}
          </h4>
          <ul className="list-disc list-inside text-sm text-gray-200 space-y-1">
            {report.details.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </div>

        {report.warnings.length > 0 && (
          <div className="space-y-3 mt-4">
            {report.warnings.map((w, i) => (
              <div
                key={i}
                className={`p-4 rounded-xl border-l-4 ${
                  w.level === 'high'
                    ? 'bg-red-900/20 border-red-500'
                    : 'bg-yellow-900/20 border-yellow-500'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle
                    className={`w-5 h-5 ${w.level === 'high' ? 'text-red-500' : 'text-yellow-500'}`}
                  />
                  <span
                    className={`font-bold ${w.level === 'high' ? 'text-red-400' : 'text-yellow-400'}`}
                  >
                    {w.level === 'high' ? t('app.warning.high') : t('app.warning.medium')}
                  </span>
                </div>
                <p className="text-white text-sm mb-2">{w.message}</p>
                <div className="text-xs text-gray-400">
                  <span className="uppercase font-bold text-[10px] tracking-wider">
                    {t('app.future_risk')}:
                  </span>{' '}
                  {w.futureRisk}
                </div>
              </div>
            ))}
          </div>
        )}

        {report.warnings.length === 0 && (
          <div className="p-4 bg-green-900/20 border-l-4 border-green-500 rounded-xl flex items-center gap-3">
            <Check className="text-green-500 w-6 h-6" />
            <span className="text-green-400 font-bold">{t('app.safe_result')}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none transition-opacity duration-300">
      <div className="pointer-events-auto bg-black/90 backdrop-blur-xl border-t border-white/10 rounded-t-3xl shadow-2xl overflow-hidden flex flex-col mx-auto max-w-3xl w-full">
        <div
          onClick={onToggleDrawer}
          className="p-4 px-6 flex items-center justify-between border-b border-white/10 cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="bg-blue-500/20 p-2 rounded-full">
              <Activity className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold text-white leading-tight">{t('app.diagnosis_result')}</h3>
            </div>
          </div>
          <ChevronUp
            className={`w-5 h-5 text-gray-400 transition-transform ${
              isDrawerOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden ${
            isDrawerOpen ? 'max-h-[60vh] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="p-6 pt-4 pb-12 overflow-y-auto custom-scrollbar">{renderContent()}</div>
        </div>
      </div>
    </div>
  );
};
