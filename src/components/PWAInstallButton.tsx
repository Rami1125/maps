import React, { useState } from 'react';
import { Download, Share2, X, Smartphone, CheckCircle, Bell } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  const handleInstallClick = async () => {
    setIsInstalling(true);
    await install();
    setIsInstalling(false);
  };

  const handleRequestPushNotification = async () => {
    try {
      const OneSignal = (window as unknown as { OneSignal?: { showSlidedownPrompt?: () => Promise<void>; Notifications?: { requestPermission?: () => Promise<void> } } }).OneSignal;
      if (OneSignal?.Notifications?.requestPermission) {
        await OneSignal.Notifications.requestPermission();
      } else if (OneSignal?.showSlidedownPrompt) {
        await OneSignal.showSlidedownPrompt();
      } else if ('Notification' in window) {
        await Notification.requestPermission();
      }
    } catch (e) {
      console.warn('Push permission request:', e);
    }
  };

  if (isInstalled) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 text-xs font-bold backdrop-blur-md shadow-sm">
        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
        <span>אפליקציה מותקנת</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-1.5 pointer-events-auto">
        {/* Android / Chrome / Edge / Desktop PWA Install Button */}
        {isInstallable && (
          <button
            onClick={handleInstallClick}
            disabled={isInstalling}
            title="התקנת אפליקציית נועה AI במסך הבית / שולחן העבודה"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white text-xs md:text-sm font-black shadow-md hover:shadow-lg transition-all transform active:scale-95 cursor-pointer border border-sky-400/30"
          >
            <Download className="w-4 h-4 animate-bounce" />
            <span>התקן אפליקציה</span>
          </button>
        )}

        {/* iOS Safari Guide Button */}
        {isIOS && !isInstallable && (
          <button
            onClick={() => setShowIOSModal(true)}
            title="הוראות התקנה לאייפון ולאייפד"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 hover:bg-neutral-50 text-neutral-800 text-xs font-extrabold shadow-sm border border-neutral-200 transition-all cursor-pointer"
          >
            <Smartphone className="w-4 h-4 text-sky-600" />
            <span>התקנה ב-iOS</span>
          </button>
        )}

        {/* Push Notification quick trigger */}
        <button
          onClick={handleRequestPushNotification}
          title="הפעלת התראות OneSignal בזמן אמת"
          className="p-1.5 rounded-xl bg-white/95 hover:bg-sky-50 text-neutral-700 hover:text-sky-700 shadow-sm border border-neutral-200 transition-all cursor-pointer"
        >
          <Bell className="w-4 h-4 text-sky-600" />
        </button>
      </div>

      {/* iOS Safari Install Instructions Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 pointer-events-auto">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200 text-right animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <button
                onClick={() => setShowIOSModal(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-neutral-900">התקנה באייפון / אייפד</h3>
                <img
                  src="https://i.postimg.cc/c1CfDrBg/Gemini-Generated-Image-wtsaphwtsaphwtsa.jpg"
                  alt="Saban Logo"
                  className="w-7 h-7 rounded-lg object-cover shadow-xs"
                />
              </div>
            </div>

            <div className="mt-4 space-y-3.5 text-sm text-neutral-700">
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-sky-50 border border-sky-100">
                <div className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-bold text-neutral-900">לחץ על כפתור השיתוף</p>
                  <p className="text-xs text-neutral-600 flex items-center gap-1 mt-0.5">
                    בתחתית המסך בספארי לחץ על סמל השיתוף <Share2 className="w-3.5 h-3.5 text-sky-600 inline" />
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-neutral-50 border border-neutral-100">
                <div className="w-6 h-6 rounded-full bg-neutral-700 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-bold text-neutral-900">בחר "הוסף למסך הבית"</p>
                  <p className="text-xs text-neutral-600 mt-0.5">
                    גלול בתפריט הפעולות ובחר באפשרות <strong>"הוסף למסך הבית" (Add to Home Screen)</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-neutral-50 border border-neutral-100">
                <div className="w-6 h-6 rounded-full bg-neutral-700 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <p className="font-bold text-neutral-900">אישור וסיום</p>
                  <p className="text-xs text-neutral-600 mt-0.5">
                    לחץ על <strong>"הוסף"</strong> בפינה העליונה. האפליקציה תופיע במסך הבית שלך כיישום עצמאי מלא.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-bold hover:bg-neutral-800 transition"
            >
              הבנתי, תודה
            </button>
          </div>
        </div>
      )}
    </>
  );
};
