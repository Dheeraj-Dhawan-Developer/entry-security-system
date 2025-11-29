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

    const handleRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.code === 'permission-denied' || event.reason?.message?.includes('permission')) {
        setAppError("PERMISSION_DENIED");
      }
    };
    window.addEventListener('unhandledrejection', handleRejection);

    const timeoutTimer = setTimeout(() => {
        if (!isDbReady && !appError) {
            setTimeoutError(true);
        }
    }, 2500);

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
             <div className="app-background"></div>
             <div className="bg-amber-500/10 p-6 rounded-full border border-amber-500/20 backdrop-blur-sm shadow-[0_0_30px_rgba(245,158,11,0.2)]">
               <Lock className="w-16 h-16 text-amber-500" />
             </div>
             <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">Database Locked</h1>
             <p className="text-center text-slate-300 max-w-md text-lg leading-relaxed">
               Security protocols are currently blocking access to the database.
             </p>
             
             <div className="w-full max-w-lg bg-black/50 backdrop-blur-md rounded-xl p-6 border border-slate-700/50 overflow-x-auto shadow-2xl relative group">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-500 opacity-50"></div>
               <p className="text-[10px] text-slate-500 mb-3 font-mono uppercase tracking-widest">// Paste this in Firebase Console Rules</p>
               <pre className="text-emerald-400 font-mono text-xs md:text-sm whitespace-pre-wrap">
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
                className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl font-bold text-white shadow-lg shadow-indigo-500/30 transition-all transform hover:scale-105 active:scale-95"
             >
                I Have Updated The Rules
             </button>
          </div>
        );
      }

      return (
        <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center space-y-4">
            <div className="app-background"></div>
            <div className="bg-red-500/10 p-6 rounded-full border border-red-500/20 shadow-lg shadow-red-500/20">
                <AlertTriangle className="w-12 h-12 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-red-400">Connection Failed</h1>
            <p className="text-slate-300 max-w-md bg-slate-800/80 p-4 rounded-xl border border-slate-700 font-mono text-xs text-left overflow-auto backdrop-blur-md">
                {appError}
            </p>
            <button 
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium transition-colors border border-slate-600"
            >
                Retry Connection
            </button>
        </div>
      );
  }

  // Loading Screen
  if (!isDbReady) {
    if (timeoutError) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center space-y-6 animate-in fade-in duration-500">
                <div className="app-background"></div>
                <div className="relative">
                    <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center border border-amber-500/20 animate-pulse">
                        <AlertTriangle className="w-10 h-10 text-amber-400" />
                    </div>
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Connection Delayed</h1>
                    <p className="text-slate-400 mt-2 max-w-xs mx-auto">The secure cloud is taking longer than expected to respond.</p>
                </div>
                <button 
                    onClick={() => setIsDbReady(true)}
                    className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-white transition-all shadow-lg shadow-indigo-500/20 hover:scale-105 border border-indigo-400/20"
                >
                    <RefreshCw className="w-4 h-4" /> Initialize Anyway
                </button>
            </div>
        );
    }

    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-4 text-center space-y-8">
        <div className="app-background"></div>
        <div className="relative">
          <div className="w-24 h-24 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
             <ShieldCheck className="w-10 h-10 text-indigo-400 animate-pulse" />
          </div>
        </div>
        <div>
          <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300 tracking-wide">SECURE SYSTEM</h2>
          <p className="text-xs text-indigo-400/60 mt-3 font-mono tracking-[0.2em] uppercase">Establishing Uplink...</p>
        </div>
      </div>
    );
  }

  const NavItem = ({ target, icon: Icon, label }: { target: AppView; icon: any; label: string }) => (
    <button
      onClick={() => {
        setView(target);
        setIsMobileMenuOpen(false);
      }}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 w-full md:w-auto font-medium ${
        view === target 
          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/10' 
          : 'text-slate-400 hover:text-white hover:bg-white/5'
      }`}
    >
      <Icon className={`w-5 h-5 ${view === target ? 'text-indigo-200' : 'text-slate-500 group-hover:text-slate-300'}`} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      <div className="app-background"></div>
      
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 glass-panel">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center gap-3 cursor-pointer group" onClick={() => setView(AppView.DASHBOARD)}>
              <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300 border border-white/10">
                <ShieldCheck className="text-white w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-white text-lg font-bold tracking-tight block leading-none group-hover:text-indigo-300 transition-colors">SecureEvent</span>
                <span className="text-[10px] text-indigo-400 font-bold tracking-widest uppercase">Pass System</span>
              </div>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-2 bg-slate-900/40 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md shadow-inner">
              <NavItem target={AppView.DASHBOARD} icon={LayoutDashboard} label="Dashboard" />
              <NavItem target={AppView.REGISTER} icon={PlusCircle} label="Register" />
              <NavItem target={AppView.TICKETS} icon={Ticket} label="Tickets" />
              <NavItem target={AppView.SCANNER} icon={ScanLine} label="Scanner" />
            </div>

            {/* Install Button (Desktop) */}
            <div className="hidden md:flex items-center">
              {deferredPrompt && (
                <button 
                  onClick={handleInstallClick}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded-xl transition-all border border-indigo-500/20 hover:border-indigo-500/50 shadow-lg group"
                >
                  <Download className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" /> 
                  <span className="text-sm font-semibold">Install App</span>
                </button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center gap-2">
              {deferredPrompt && (
                <button 
                  onClick={handleInstallClick}
                  className="p-2.5 text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 rounded-xl border border-indigo-500/20"
                >
                  <Download className="w-5 h-5" />
                </button>
              )}
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-slate-300 hover:text-white p-2.5 hover:bg-white/10 rounded-xl transition-colors"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden glass-panel border-t border-white/5 p-4 space-y-2 absolute w-full z-50 shadow-2xl animate-in slide-in-from-top-4 duration-200">
            <NavItem target={AppView.DASHBOARD} icon={LayoutDashboard} label="Dashboard" />
            <NavItem target={AppView.REGISTER} icon={PlusCircle} label="Register" />
            <NavItem target={AppView.TICKETS} icon={Ticket} label="Tickets" />
            <NavItem target={AppView.SCANNER} icon={ScanLine} label="Scanner" />
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col py-8 md:py-10 safe-bottom overflow-x-hidden relative z-10">
        <div className="container mx-auto px-4 flex-1">
          {view === AppView.DASHBOARD && (
            <div className="animate-in fade-in zoom-in-95 duration-500">
              <header className="mb-8 md:mb-10 text-center md:text-left max-w-6xl mx-auto">
                <h1 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-indigo-400 mb-2 drop-shadow-sm">Command Center</h1>
                <p className="text-slate-400 text-lg md:text-xl font-light">Live monitoring and real-time entry analytics.</p>
              </header>
              <Stats />
            </div>
          )}
          
          {view === AppView.REGISTER && (
             <div className="animate-in fade-in zoom-in-95 duration-500">
               <header className="mb-8 md:mb-10 text-center md:text-left max-w-6xl mx-auto">
                  <h1 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-indigo-400 mb-2 drop-shadow-sm">Guest Registration</h1>
                  <p className="text-slate-400 text-lg md:text-xl font-light">Generate secure, cryptographic entry passes.</p>
               </header>
               <Generator />
             </div>
          )}
          
          {view === AppView.TICKETS && (
             <div className="animate-in fade-in zoom-in-95 duration-500">
               <header className="mb-8 md:mb-10 text-center md:text-left max-w-7xl mx-auto">
                  <h1 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-indigo-400 mb-2 drop-shadow-sm">Ticket Database</h1>
                  <p className="text-slate-400 text-lg md:text-xl font-light">Search, manage, and export guest records.</p>
               </header>
               <TicketList />
             </div>
          )}
          
          {view === AppView.SCANNER && (
             <div className="animate-in fade-in zoom-in-95 duration-500 h-full flex flex-col justify-center items-center">
               <Scanner />
             </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 py-8 bg-slate-900/30 mt-auto backdrop-blur-sm relative z-10">
        <div className="container mx-auto px-4 text-center">
          <p className="text-slate-500 text-sm flex items-center justify-center gap-2">
            <span className="font-medium">© {new Date().getFullYear()} SecureEvent</span>
            <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
            <span className="text-indigo-400/80 font-mono text-xs border border-indigo-500/20 px-2 py-0.5 rounded-full bg-indigo-500/5">AI PROTECTED</span>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;