import React, { useState, useEffect } from 'react';
import { ShieldCheck, PlusCircle, ScanLine, LayoutDashboard, Menu, X, Ticket, Download, Loader2, AlertTriangle, Lock, RefreshCw } from 'lucide-react';
import { Generator } from './components/Generator';
import { Scanner } from './components/Scanner';
import { Stats } from './components/Stats';
import { TicketList } from './components/TicketList';
import { AppView } from './types';
import { db, initializationError } from './services/firebase';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.DASHBOARD);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isDbReady, setIsDbReady] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);
  const [timeoutError, setTimeoutError] = useState(false);

  useEffect(() => {
    // Check for critical startup errors from Firebase
    if (initializationError) {
        setAppError(initializationError);
        return;
    }

    // Check if DB is ready (it should be immediate if firebase.ts initialized)
    if (db) {
        setIsDbReady(true);
    } else {
        // Poll for DB readiness in case of async import lag
        const interval = setInterval(() => {
            if (db) {
                setIsDbReady(true);
                clearInterval(interval);
            }
        }, 300);
        return () => clearInterval(interval);
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Global promise rejection handler to catch Permission errors
    const handleRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.code === 'permission-denied' || event.reason?.message?.includes('permission')) {
        setAppError("PERMISSION_DENIED");
      }
    };
    window.addEventListener('unhandledrejection', handleRejection);

    // Safety timeout
    const timeoutTimer = setTimeout(() => {
        if (!isDbReady && !appError) {
            setTimeoutError(true);
        }
    }, 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('unhandledrejection', handleRejection);
      clearTimeout(timeoutTimer);
    };
  }, [isDbReady, appError]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  // Error Screen
  if (appError) {
      if (appError === "PERMISSION_DENIED") {
        return (
          <div className="min-h-screen bg-slate-900 text-white p-6 flex flex-col items-center justify-center space-y-6">
             <div className="bg-amber-500/20 p-4 rounded-full">
               <Lock className="w-12 h-12 text-amber-500" />
             </div>
             <h1 className="text-2xl font-bold text-amber-400">Database Locked</h1>
             <p className="text-center text-slate-300 max-w-md">
               Your database permissions are blocking the app.
               <br />
               Please update your Firebase Rules.
             </p>
             
             <div className="w-full max-w-lg bg-black rounded-lg p-4 border border-slate-700 overflow-x-auto">
               <p className="text-xs text-slate-500 mb-2 font-mono">// Go to Firebase Console &gt; Firestore &gt; Rules</p>
               <pre className="text-green-400 font-mono text-xs whitespace-pre-wrap">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`}
               </pre>
             </div>
             
             <button 
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-bold"
             >
                I Updated Rules, Retry
             </button>
          </div>
        );
      }

      return (
        <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center space-y-4">
            <div className="bg-red-500/10 p-4 rounded-full">
                <AlertTriangle className="w-12 h-12 text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-red-400">Connection Failed</h1>
            <p className="text-slate-300 max-w-md bg-slate-800 p-4 rounded border border-slate-700 font-mono text-xs text-left overflow-auto">
                {appError}
            </p>
            <p className="text-sm text-slate-500">Please check your internet connection and refresh.</p>
            <button 
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium"
            >
                Retry
            </button>
        </div>
      );
  }

  // Loading Screen if DB is not ready
  if (!isDbReady) {
    if (timeoutError) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center space-y-6 animate-in fade-in duration-500">
                <AlertTriangle className="w-12 h-12 text-amber-400" />
                <div>
                    <h1 className="text-xl font-bold text-white">Loading Slow?</h1>
                    <p className="text-slate-400 mt-2 max-w-xs mx-auto">Firebase is taking longer than usual to connect. The database might be offline or blocked.</p>
                </div>
                <button 
                    onClick={() => {
                        // Force proceed even if DB isn't strictly "ready" yet, 
                        // sometimes async imports lag but it works anyway.
                        setIsDbReady(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-bold transition-colors"
                >
                    <RefreshCw className="w-4 h-4" /> Enter Anyway
                </button>
                <div className="text-xs text-slate-600 mt-8">
                    Status: DB={db ? 'Connected' : 'Waiting...'}
                </div>
            </div>
        );
    }

    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-4 text-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
        <p className="text-lg font-medium">Initializing Secure System...</p>
        <p className="text-sm text-slate-500">Connecting to Firebase Cloud</p>
      </div>
    );
  }

  const NavItem = ({ target, icon: Icon, label }: { target: AppView; icon: any; label: string }) => (
    <button
      onClick={() => {
        setView(target);
        setIsMobileMenuOpen(false);
      }}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 w-full md:w-auto ${
        view === target 
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
          : 'text-slate-400 hover:text-white hover:bg-slate-800'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Navigation Bar */}
      <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 safe-top">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center gap-2 cursor-pointer" onClick={() => setView(AppView.DASHBOARD)}>
              <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <ShieldCheck className="text-white w-5 h-5" />
              </div>
              <span className="text-white text-lg font-bold tracking-tight">SecureEntry</span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-2">
              <NavItem target={AppView.DASHBOARD} icon={LayoutDashboard} label="Dashboard" />
              <NavItem target={AppView.REGISTER} icon={PlusCircle} label="Register" />
              <NavItem target={AppView.TICKETS} icon={Ticket} label="Tickets" />
              <NavItem target={AppView.SCANNER} icon={ScanLine} label="Scanner" />
              {deferredPrompt && (
                <button 
                  onClick={handleInstallClick}
                  className="ml-4 flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded-lg transition-colors border border-indigo-500/30"
                >
                  <Download className="w-4 h-4" /> Install App
                </button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center gap-2">
              {deferredPrompt && (
                <button 
                  onClick={handleInstallClick}
                  className="p-2 text-indigo-400 hover:text-indigo-300"
                  title="Install App"
                >
                  <Download className="w-6 h-6" />
                </button>
              )}
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-slate-400 hover:text-white p-2"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-slate-900 border-t border-slate-800 p-4 space-y-2 absolute w-full shadow-2xl z-50">
            <NavItem target={AppView.DASHBOARD} icon={LayoutDashboard} label="Dashboard" />
            <NavItem target={AppView.REGISTER} icon={PlusCircle} label="Register" />
            <NavItem target={AppView.TICKETS} icon={Ticket} label="Tickets" />
            <NavItem target={AppView.SCANNER} icon={ScanLine} label="Scanner" />
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col py-6 md:py-8 safe-bottom">
        <div className="container mx-auto px-4 flex-1">
          {view === AppView.DASHBOARD && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <header className="mb-6 md:mb-8 text-center md:text-left max-w-5xl mx-auto px-1 md:px-4">
                <h1 className="text-2xl md:text-3xl font-bold text-white">Event Overview</h1>
                <p className="text-slate-400 mt-2 text-sm md:text-base">Real-time attendance tracking and statistics.</p>
              </header>
              <Stats />
            </div>
          )}
          
          {view === AppView.REGISTER && (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               <header className="mb-6 md:mb-8 text-center md:text-left max-w-5xl mx-auto px-1 md:px-4">
                  <h1 className="text-2xl md:text-3xl font-bold text-white">Guest Registration</h1>
                  <p className="text-slate-400 mt-2 text-sm md:text-base">Create secure passes for students and guests.</p>
               </header>
               <Generator />
             </div>
          )}
          
          {view === AppView.TICKETS && (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               <header className="mb-6 md:mb-8 text-center md:text-left max-w-5xl mx-auto px-1 md:px-4">
                  <h1 className="text-2xl md:text-3xl font-bold text-white">Manage Tickets</h1>
                  <p className="text-slate-400 mt-2 text-sm md:text-base">View, search, and export generated passes.</p>
               </header>
               <TicketList />
             </div>
          )}
          
          {view === AppView.SCANNER && (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col justify-center">
               <Scanner />
             </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 bg-slate-900/50 mt-auto">
        <div className="container mx-auto px-4 text-center">
          <p className="text-slate-500 text-sm mb-2">
            © {new Date().getFullYear()} SecureEntry System. AI Powered Security.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;