import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Webcam from 'react-webcam';
import {
  RefreshCcw,
  X,
  Eye,
  EyeOff,
  Timer,
  Volume2,
  VolumeX,
  Move,
  MousePointerClick,
  Link as LinkIcon,
  Ruler,
  Trash2,
  Save,
  ArrowLeft,
  HelpCircle,
  Pencil,
} from 'lucide-react';
import { analyzePose, loadModel } from './services/poseService';
import {
  saveImageToGallery,
  getLatestImage,
  updateImageInGallery,
} from './services/galleryService';
import { getOrthopedicTests } from './services/orthopedicService';
import { AppState, AIAnalysisResult, GalleryImage, EditorTool } from './types';
import { LoadingOverlay } from './components/molecules/LoadingOverlay';
import { EditorCanvas, ResultOverlayHandle } from './components/organisms/EditorCanvas';
import { GalleryPage } from './components/pages/GalleryPage';
import { TestSelectionPage } from './components/pages/TestSelectionPage';
import { HealthReport } from './components/organisms/HealthReport';
import { IconButton } from './components/atoms/IconButton';
import { useLanguage } from './contexts/LanguageContext';
import { useSpeech } from './hooks/useSpeech';

const videoConstraints = {
  width: { ideal: 1920 },
  height: { ideal: 1080 },
  facingMode: 'user',
};

export default function App() {
  const { t, language, setLanguage } = useLanguage();
  const webcamRef = useRef<Webcam>(null);
  const resultOverlayRef = useRef<ResultOverlayHandle>(null);

  const [appState, setAppState] = useState<AppState>(AppState.LOADING_MODEL);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [latestThumb, setLatestThumb] = useState<GalleryImage | null>(null);
  const [currentImageId, setCurrentImageId] = useState<number | null>(null);

  const [selectedTestId, setSelectedTestId] = useState<string>('shoulder_level');
  const availableTests = useMemo(() => getOrthopedicTests(t), [language, t]);
  const selectedTest = availableTests.find((test) => test.id === selectedTestId) || availableTests[0];

  const [hideFace, setHideFace] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [timerDelay, setTimerDelay] = useState<0 | 3 | 10>(0);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  const { speak, playShutterSound } = useSpeech(isAudioEnabled);

  const [activeTool, setActiveTool] = useState<EditorTool>(EditorTool.MOVE);
  const [showHelp, setShowHelp] = useState(false);
  const [isEditBarOpen, setIsEditBarOpen] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [windowSize, setWindowSize] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    const init = async () => {
      try {
        await loadModel();
        await updateThumbnail();
        setAppState(AppState.SELECT_TEST);
      } catch (e) {
        console.error(e);
        setErrorMsg(t('app.error_title'));
        setAppState(AppState.ERROR);
      }
    };
    init();

    const handleResize = () => setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [t]);

  const updateThumbnail = async () => {
    const img = await getLatestImage();
    setLatestThumb(img);
  };

  const performCapture = useCallback(async () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      playShutterSound();
      setCapturedImage(imageSrc);
      setAppState(AppState.PROCESSING);
      setTimeout(() => handleAnalysis(imageSrc), 100);
    }
  }, [webcamRef, playShutterSound]);

  const startCaptureSequence = () => {
    if (timerDelay === 0) {
      performCapture();
      return;
    }
    setCountdown(timerDelay);
    speak(timerDelay.toString());

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          performCapture();
          return null;
        }
        const next = prev - 1;
        speak(next.toString());
        return next;
      });
    }, 1000);
  };

  const handleAnalysis = async (imageSrc: string) => {
    try {
      const result = await analyzePose(imageSrc);
      setAnalysisResult(result);
      setAppState(AppState.RESULT);
      setIsDrawerOpen(true);

      setTimeout(async () => {
        if (resultOverlayRef.current) {
          const compositeBase64 = resultOverlayRef.current.saveCanvas();
          if (compositeBase64) {
            const newId = await saveImageToGallery(compositeBase64);
            setCurrentImageId(newId);
            updateThumbnail();
          }
        }
      }, 500);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || t('app.error_title'));
      setAppState(AppState.ERROR);
    }
  };

  const handleSaveEdits = async () => {
    if (resultOverlayRef.current) {
      const compositeBase64 = resultOverlayRef.current.saveCanvas();
      if (compositeBase64) {
        try {
          if (currentImageId !== null) {
            await updateImageInGallery(currentImageId, compositeBase64);
          } else {
            const newId = await saveImageToGallery(compositeBase64);
            setCurrentImageId(newId);
          }
          await updateThumbnail();
          setToastMessage(t('app.toast.save_success'));
          setTimeout(() => {
            setToastMessage(null);
            reset();
          }, 1500);
        } catch (e) {
          console.error('Save failed', e);
          setToastMessage(t('app.toast.save_error'));
          setTimeout(() => setToastMessage(null), 2000);
        }
      }
    }
  };

  const reset = () => {
    setCapturedImage(null);
    setAnalysisResult(null);
    setAppState(AppState.SELECT_TEST);
    setErrorMsg(null);
    setCountdown(null);
    setActiveTool(EditorTool.MOVE);
    setCurrentImageId(null);
    setIsEditBarOpen(false);
    setIsDrawerOpen(true);
  };

  const startTest = (testId: string) => {
    setSelectedTestId(testId);
    const testObj = availableTests.find((t) => t.id === testId);
    setAppState(AppState.CAMERA);
    if (testObj) speak(testObj.instruction);
  };

  if (appState === AppState.GALLERY) {
    return <GalleryPage onClose={() => setAppState(AppState.SELECT_TEST)} />;
  }

  if (appState === AppState.SELECT_TEST) {
    return (
      <TestSelectionPage
        availableTests={availableTests}
        onStartTest={startTest}
        onOpenGallery={() => setAppState(AppState.GALLERY)}
        onToggleLanguage={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
      />
    );
  }

  return (
    <div className="relative h-screen w-full bg-black overflow-hidden flex flex-col font-sans select-none touch-none">
      {toastMessage && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[60] animate-fade-in px-6 py-3 bg-white/90 backdrop-blur-md rounded-full shadow-2xl flex items-center gap-3">
          <div className="bg-green-500 rounded-full p-1 text-white">✓</div>
          <span className="text-black font-bold text-sm">{toastMessage}</span>
        </div>
      )}

      {showHelp && (
        <div
          className="absolute inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="bg-gray-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowHelp(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <HelpCircle className="w-6 h-6 text-blue-400" /> {t('app.guide')}
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-blue-600/20 rounded-lg text-blue-400">
                  <Move className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-white text-sm">{t('help.move')}</p>
                  <p className="text-gray-400 text-xs">{t('help.move_desc')}</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowHelp(false)}
              className="w-full mt-8 bg-blue-600 py-3 rounded-xl font-bold text-white hover:bg-blue-500 transition"
            >
              {t('help.understood')}
            </button>
          </div>
        </div>
      )}

      {appState === AppState.ERROR && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 text-white p-6 text-center animate-fade-in">
          <div className="bg-red-500/20 p-6 rounded-full mb-6">
            <X className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2">{t('app.error_title')}</h2>
          <p className="text-gray-400 mb-8 max-w-xs">{errorMsg}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-white text-black rounded-full font-bold"
          >
            {t('app.reload')}
          </button>
        </div>
      )}

      {appState === AppState.PROCESSING && <LoadingOverlay />}

      <div className="flex-1 relative bg-black flex items-center justify-center">
        {appState === AppState.CAMERA && (
          <>
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={{ ...videoConstraints, facingMode }}
              className="absolute inset-0 w-full h-full object-cover"
              forceScreenshotSourceSize={true}
            />
            <div className="absolute top-24 left-0 right-0 p-4 flex justify-center pointer-events-none">
              <div className="bg-black/60 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 max-w-sm text-center pointer-events-auto">
                <h3 className="text-blue-400 font-bold uppercase text-xs tracking-widest mb-1">
                  {selectedTest.name}
                </h3>
                <p className="text-white text-sm font-medium mb-3">{selectedTest.instruction}</p>
                <button
                  onClick={() => speak(selectedTest.instruction)}
                  className="flex items-center gap-2 mx-auto bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full text-xs transition"
                >
                  <Volume2 className="w-3 h-3" /> {t('app.btn.read_instruction')}
                </button>
              </div>
            </div>
            <div className="absolute inset-0 pointer-events-none">
              {!countdown && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-white/20 rounded-lg flex items-center justify-center">
                  <div className="w-full h-[1px] bg-red-500/50 absolute top-1/2 left-0 animate-pulse"></div>
                  <div className="h-full w-[1px] bg-red-500/50 absolute top-0 left-1/2 animate-pulse"></div>
                </div>
              )}
              {countdown !== null && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-50">
                  <div className="text-[12rem] font-bold text-white animate-bounce">{countdown}</div>
                </div>
              )}
            </div>
          </>
        )}

        {appState === AppState.RESULT && capturedImage && analysisResult && (
          <div className="absolute inset-0 w-full h-full bg-black flex items-center justify-center">
            <EditorCanvas
              ref={resultOverlayRef}
              imageSrc={capturedImage}
              data={analysisResult}
              width={windowSize.w}
              height={windowSize.h}
              hideFace={hideFace}
              showSkeleton={showSkeleton}
              activeTool={activeTool}
            />

            <div className="absolute top-1/2 -translate-y-1/2 right-4 z-40 flex flex-col items-end gap-2">
              <button
                onClick={() => {
                  setIsEditBarOpen(!isEditBarOpen);
                  if (!isEditBarOpen) setIsDrawerOpen(false);
                }}
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-xl border border-white/20 transition-all duration-300 ${isEditBarOpen ? 'bg-white text-black rotate-45' : 'bg-black/60 text-white backdrop-blur-md'}`}
              >
                <Pencil className="w-5 h-5" />
              </button>

              <div
                className={`flex flex-col gap-2 transition-all duration-300 origin-right ${isEditBarOpen ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 translate-x-10 scale-50 pointer-events-none absolute top-14 right-0'}`}
              >
                <div className="bg-black/80 backdrop-blur-md rounded-2xl p-2 border border-white/10 shadow-2xl flex flex-col gap-2">
                  <IconButton
                    icon={HelpCircle}
                    onClick={() => setShowHelp(true)}
                    className="text-yellow-400 border-b border-white/10 animate-bounce"
                  />
                  <IconButton
                    icon={Move}
                    onClick={() => setActiveTool(EditorTool.MOVE)}
                    active={activeTool === EditorTool.MOVE}
                  />
                  <IconButton
                    icon={MousePointerClick}
                    onClick={() => setActiveTool(EditorTool.ADD_POINT)}
                    active={activeTool === EditorTool.ADD_POINT}
                  />
                  <IconButton
                    icon={LinkIcon}
                    onClick={() => setActiveTool(EditorTool.CONNECT)}
                    active={activeTool === EditorTool.CONNECT}
                  />
                  <IconButton
                    icon={Ruler}
                    onClick={() => setActiveTool(EditorTool.ANGLE)}
                    active={activeTool === EditorTool.ANGLE}
                  />
                  <IconButton
                    icon={Trash2}
                    onClick={() => setActiveTool(EditorTool.DELETE)}
                    active={activeTool === EditorTool.DELETE}
                  />
                </div>
              </div>
            </div>

            <HealthReport
              analysisResult={analysisResult}
              selectedTest={selectedTest}
              isDrawerOpen={isDrawerOpen}
              onToggleDrawer={() => {
                setIsDrawerOpen(!isDrawerOpen);
                if (!isDrawerOpen) setIsEditBarOpen(false);
              }}
              isEditBarOpen={isEditBarOpen}
            />
          </div>
        )}
      </div>

      <div className="absolute top-0 left-0 right-0 p-4 pt-6 flex justify-between items-start z-30 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
        <div className="pointer-events-auto">
          {appState === AppState.RESULT ? (
            <button
              onClick={reset}
              className="p-3 bg-white/10 rounded-full backdrop-blur-md text-white border border-white/10 hover:bg-white/20"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
          ) : (
            appState === AppState.CAMERA && (
              <button
                onClick={() => setAppState(AppState.SELECT_TEST)}
                className="p-3 bg-white/10 rounded-full backdrop-blur-md text-white border border-white/10 hover:bg-white/20"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
            )
          )}
        </div>

        <div className="flex gap-2 pointer-events-auto">
          {appState === AppState.RESULT ? (
            <button
              onClick={handleSaveEdits}
              className="flex items-center gap-2 px-4 py-3 rounded-full text-xs font-bold backdrop-blur-md bg-green-600 border border-green-500 text-white shadow-lg active:scale-95 transition"
            >
              <Save className="w-4 h-4" /> {t('app.btn.save')}
            </button>
          ) : (
            appState === AppState.CAMERA && (
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setTimerDelay((prev) => (prev === 0 ? 3 : prev === 3 ? 10 : 0))
                  }
                  className={`p-3 rounded-full backdrop-blur-md border flex items-center gap-1 ${timerDelay > 0 ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400' : 'bg-black/30 border-white/5 text-white/80'}`}
                >
                  <Timer className="w-5 h-5" />
                  {timerDelay > 0 && <span className="text-xs font-bold">{timerDelay}s</span>}
                </button>
                <button
                  onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                  className={`p-3 rounded-full backdrop-blur-md border ${isAudioEnabled ? 'bg-black/30 border-white/5 text-white' : 'bg-red-500/20 border-red-500/50 text-red-400'}`}
                >
                  {isAudioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </button>
              </div>
            )
          )}

          <button
            onClick={() => setHideFace(!hideFace)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold backdrop-blur-md border ${hideFace ? 'bg-blue-600/80 border-blue-400 text-white' : 'bg-black/40 border-white/10 text-gray-400'}`}
          >
            {hideFace ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}{' '}
            {hideFace ? t('app.btn.mosaic') : t('app.btn.face')}
          </button>
        </div>
      </div>

      {appState === AppState.CAMERA && (
        <div className="absolute bottom-0 left-0 right-0 pb-12 pt-20 flex justify-around items-center bg-gradient-to-t from-black via-black/80 to-transparent z-20">
          <button
            onClick={() => setAppState(AppState.GALLERY)}
            className="w-14 h-14 rounded-2xl bg-gray-900 border border-gray-700 flex items-center justify-center overflow-hidden active:scale-95 transition relative"
          >
            {latestThumb ? (
              <img src={latestThumb.src} alt="Gallery" className="w-full h-full object-cover" />
            ) : (
              <div className="w-6 h-6 rounded bg-white/10"></div>
            )}
          </button>
          <button
            onClick={startCaptureSequence}
            disabled={countdown !== null}
            className={`relative w-24 h-24 rounded-full border-4 border-white/20 flex items-center justify-center transition-transform active:scale-95 group shadow-[0_0_30px_rgba(255,255,255,0.1)] ${countdown ? 'opacity-50' : ''}`}
          >
            <div className="absolute inset-0 rounded-full border border-white/50 scale-110 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
            <div className="w-20 h-20 bg-white rounded-full shadow-inner flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border-2 border-gray-200/50"></div>
            </div>
          </button>
          <button
            onClick={() => setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))}
            className="w-14 h-14 rounded-full bg-gray-900/80 border border-gray-700 flex items-center justify-center backdrop-blur-md active:rotate-180 transition-all duration-500 hover:bg-gray-800"
          >
            <RefreshCcw className="w-6 h-6 text-white" />
          </button>
        </div>
      )}
    </div>
  );
}
