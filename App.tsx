
import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Download, 
  Loader2,
  AlertTriangle,
  Zap,
  Target,
  Box,
  Layers,
  FileSearch,
  Sparkles,
  Twitter,
  Linkedin,
  Github,
  Globe,
  Sun,
  Moon,
  LogOut,
  CheckCircle2,
  ArrowRight,
  Lock,
  ChevronRight,
  Cpu
} from 'lucide-react';
import FileUploadZone from './components/FileUploadZone';
import { UploadType, ProcessedData } from './types';
import { runQCValidation, exportToExcel } from './services/qcEngine';
import { supabase } from './supabaseClient';

// Use React.FC to properly handle React internal props like 'key'
interface SocialIconProps {
  href: string;
  icon: any;
  label: string;
  theme: 'light' | 'dark';
}

const SocialIcon: React.FC<SocialIconProps> = ({ href, icon: Icon, label, theme }) => (
  <a 
    href={href} 
    target="_blank" 
    rel="noopener noreferrer"
    className={`p-2.5 rounded-xl transition-all duration-300 group relative border ${
      theme === 'dark' 
        ? 'bg-slate-900/50 border-slate-800 hover:bg-blue-500/10 text-slate-400 hover:text-blue-400 hover:border-blue-500/30' 
        : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-500 hover:text-blue-600 hover:border-blue-200'
    }`}
    aria-label={label}
  >
    <Icon className="w-4 h-4" />
    <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-[9px] font-black uppercase tracking-widest text-white opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap shadow-2xl">
      {label}
    </div>
  </a>
);

const FeatureTile = ({ icon: Icon, title, desc, colorClass, theme }: { icon: any, title: string, desc: string, colorClass: string, theme: string }) => (
  <div className={`p-6 rounded-[2rem] border transition-all duration-500 flex flex-col gap-4 group cursor-default relative overflow-hidden
    ${theme === 'dark' 
      ? 'bg-slate-900/40 border-slate-800 hover:bg-slate-800/60 hover:border-slate-700 hover:-translate-y-1' 
      : 'bg-white border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1'
    }`}>
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colorClass} shadow-lg transition-all duration-500 group-hover:rotate-6`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div>
      <h4 className={`text-base font-black tracking-tight mb-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{title}</h4>
      <p className={`text-[9px] font-bold uppercase tracking-[0.15em] leading-tight ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{desc}</p>
    </div>
  </div>
);

type ViewState = 'LANDING' | 'AUTH' | 'DASHBOARD';

const App: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [view, setView] = useState<ViewState>('LANDING');
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const initialFileState = {
    [UploadType.MASTER_BRANDS]: null,
    [UploadType.MASTER_COLORS]: null,
    [UploadType.MASTER_SIZES]: null,
    [UploadType.MASTER_CATEGORIES]: null,
    [UploadType.MASTER_TEMPLATE_EXPORT]: null,
    [UploadType.USER_SHEET]: null,
  };

  const [files, setFiles] = useState<Record<UploadType, File | null>>(initialFileState);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessedData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      setView('DASHBOARD');
    }
    setIsAuthLoading(false);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email, password, options: { data: { display_name: fullName } }
        });
        if (signUpError) throw signUpError;
        setUser(data.user);
      } else {
        const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError) throw loginError;
        setUser(data.user);
      }
      setView('DASHBOARD');
    } catch (err: any) { setAuthError(err.message); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setView('LANDING');
    setFiles(initialFileState);
    setResult(null);
  };

  const handleFileSelect = (type: UploadType, file: File) => {
    setFiles(prev => ({ ...prev, [type]: file }));
    setResult(null);
  };

  const startValidation = async () => {
    const missing = Object.entries(files).filter(([_, f]) => !f);
    if (missing.length > 0) {
      setError("System Warning: Please connect all 6 required data nodes.");
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      const workbooks: any = {};
      for (const key of Object.keys(files)) {
        const reader = new FileReader();
        const filePromise = new Promise((resolve) => {
          reader.onload = (e) => resolve(import('xlsx').then(XLSX => XLSX.read(new Uint8Array(e.target?.result as ArrayBuffer), { type: 'array' })));
          reader.readAsArrayBuffer(files[key as UploadType]!);
        });
        workbooks[key] = await filePromise;
      }
      const output = await runQCValidation(workbooks);
      setResult(output);
    } catch (err) { setError("Validation Conflict: Data format error detected."); }
    finally { setIsProcessing(false); }
  };

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const socials = [
    { href: "https://x.com/RealNitinX", icon: Twitter, label: "X" },
    { href: "https://www.linkedin.com/in/nitinpal1/", icon: Linkedin, label: "LinkedIn" },
    { href: "https://github.com/nitinpal90", icon: Github, label: "GitHub" },
    { href: "https://bento.me/lynxnitin", icon: Globe, label: "Portfolio" }
  ];

  // Specific recognition for Nitin Pal
  const isNitin = user?.email === 'np897923@gmail.com';
  const operatorName = isNitin ? "NITIN PAL" : (user?.user_metadata?.display_name || user?.email?.split('@')[0] || "GUEST");

  if (isAuthLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#05070A]">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
          <ShieldCheck className="w-6 h-6 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-500/50">Neural Core Initializing</p>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen transition-colors duration-700 font-['Inter'] ${theme === 'dark' ? 'bg-[#05070A] text-slate-100' : 'bg-[#F8FAFC] text-slate-900'}`}>
      
      {/* Universal Navigation */}
      <nav className={`h-20 sticky top-0 z-[100] border-b backdrop-blur-3xl transition-all ${theme === 'dark' ? 'bg-[#05070A]/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
        <div className="max-w-[1400px] mx-auto px-8 h-full flex items-center justify-between">
          <div className="flex items-center gap-5 cursor-pointer" onClick={() => !user && setView('LANDING')}>
            <div className={`p-3 rounded-xl shadow-lg transition-transform hover:scale-110 ${theme === 'dark' ? 'bg-blue-600' : 'bg-slate-900'}`}>
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight uppercase italic flex items-center gap-2">
                PRO QC <span className="text-blue-500 not-italic">Neural Engine</span>
              </h1>
              {user && (
                <p className={`text-[9px] font-black uppercase tracking-[0.3em] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  OPERATOR: <span className="text-blue-500">{operatorName.toUpperCase()}</span>
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden lg:flex items-center gap-2 pr-6 border-r border-slate-800/30">
              {/* Fix: Pass individual props correctly to satisfy SocialIconProps instead of spread to avoid key error */}
              {socials.map((s) => ( <SocialIcon key={s.label} href={s.href} icon={s.icon} label={s.label} theme={theme} /> ))}
            </div>
            <button onClick={toggleTheme} className={`p-3 rounded-xl border transition-all ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-yellow-400 hover:bg-slate-800 hover:border-yellow-400/30' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {user ? (
              <button onClick={handleLogout} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all border ${theme === 'dark' ? 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200'}`}>
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            ) : view !== 'AUTH' && (
              <button onClick={() => setView('AUTH')} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 transition-all flex items-center gap-2">
                Log In <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Flow Controller */}
      <main className="max-w-[1400px] mx-auto px-8 py-12">
        
        {/* VIEW: LANDING */}
        {view === 'LANDING' && (
          <div className="flex flex-col items-center py-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="text-center max-w-5xl mx-auto mb-20">
              <div className="inline-flex items-center gap-3 bg-blue-500/10 text-blue-500 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.4em] mb-10 border border-blue-500/20 shadow-2xl shadow-blue-500/5">
                <Sparkles className="w-4 h-4" /> Babyshop Authority Auditor v4.5
              </div>
              <h2 className={`text-8xl font-black mb-10 tracking-tighter leading-[0.95] italic ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Master <span className="text-blue-500 not-italic">Quality Control.</span><br/>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-indigo-400 to-blue-600">Automated Precision.</span>
              </h2>
              <p className="text-slate-500 text-lg font-medium leading-relaxed max-w-2xl mx-auto mb-16 opacity-90">
                The professional neural engine for Babyshop marketplace validation. Cross-reference 10k+ attributes instantly with universal master authority.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <button 
                  onClick={() => setView('AUTH')}
                  className="px-10 py-6 bg-blue-600 hover:bg-blue-500 text-white rounded-3xl text-xs font-black uppercase tracking-[0.4em] shadow-2xl shadow-blue-600/30 transition-all hover:scale-105 active:scale-95 flex items-center gap-3 group"
                >
                  <Cpu className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" /> Initialize Neural Session
                </button>
                <div className="flex items-center gap-4 px-6 py-4 rounded-3xl border border-slate-800/50 bg-slate-900/20 backdrop-blur-sm">
                   <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Core Online: 12ms Latency</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 w-full max-w-6xl">
              <FeatureTile icon={Zap} title="Sub-Millisecond" desc="10k Records Instant Processing" colorClass="bg-blue-600" theme={theme} />
              <FeatureTile icon={Target} title="Deep Audit" desc="Header & Value Integrity Logic" colorClass="bg-indigo-600" theme={theme} />
              <FeatureTile icon={Box} title="Unified Scale" desc="Multi-Brand Reference Mapping" colorClass="bg-emerald-600" theme={theme} />
              <FeatureTile icon={Layers} title="Automated" desc="One-Click Neural Report Export" colorClass="bg-amber-600" theme={theme} />
            </div>
          </div>
        )}

        {/* VIEW: AUTH */}
        {view === 'AUTH' && (
          <div className="flex flex-col items-center justify-center py-24 animate-in fade-in zoom-in duration-700">
            <div className={`w-full max-w-md p-12 rounded-[3.5rem] border transition-all relative overflow-hidden ${theme === 'dark' ? 'bg-slate-900/80 border-slate-800 shadow-3xl' : 'bg-white border-slate-200 shadow-3xl'}`}>
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
              <div className="flex justify-center mb-10">
                <div className="p-6 rounded-3xl bg-blue-600 shadow-2xl shadow-blue-500/30">
                  <Lock className="w-8 h-8 text-white" />
                </div>
              </div>
              <h3 className={`text-3xl font-black text-center mb-2 tracking-tight uppercase ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Node Access</h3>
              <p className="text-center text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mb-12">Establish Security Link</p>
              
              <form onSubmit={handleAuth} className="space-y-6">
                {isSignUp && (
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-2">Operator Name</label>
                    <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                      className={`w-full px-6 py-5 rounded-2xl border text-sm font-bold transition-all outline-none ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 focus:border-blue-400'}`}
                      placeholder="e.g. NITIN PAL" />
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-2">Neural Identity (Email)</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    className={`w-full px-6 py-5 rounded-2xl border text-sm font-bold transition-all outline-none ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 focus:border-blue-400'}`}
                    placeholder="name@babyshop.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-2">Security Key</label>
                  <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                    className={`w-full px-6 py-5 rounded-2xl border text-sm font-bold transition-all outline-none ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 focus:border-blue-400'}`}
                    placeholder="••••••••" />
                </div>
                
                {authError && <p className="text-red-500 text-[10px] font-black uppercase text-center bg-red-500/10 py-4 rounded-2xl border border-red-500/20">{authError}</p>}
                
                <button className="w-full py-6 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.4em] shadow-2xl shadow-blue-600/30 transition-all active:scale-95 mt-4">
                  {isSignUp ? 'Sync New Node' : 'Establish Connection'}
                </button>
                <div className="flex flex-col gap-3 pt-4">
                  <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-500 transition-colors">
                    {isSignUp ? 'Already Authorized? Login' : 'Request New Security Node?'}
                  </button>
                  <button type="button" onClick={() => setView('LANDING')} className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">
                    Cancel & Return to Terminal
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* VIEW: DASHBOARD (The Engine) */}
        {view === 'DASHBOARD' && user && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="xl:col-span-8 space-y-12">
              
              {/* Header Info */}
              <div className="flex items-center justify-between">
                <div>
                   <h3 className={`text-4xl font-black tracking-tighter italic ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Neural <span className="text-blue-500 not-italic">Dashboard</span></h3>
                   <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Universal QC Validator v4.5.0 Deployment</p>
                </div>
                <div className={`px-5 py-2.5 rounded-2xl border backdrop-blur-md flex items-center gap-3 ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                   <span className="text-[10px] font-black uppercase tracking-widest">Connection Stable</span>
                </div>
              </div>

              {/* Phase 01: Masters */}
              <div className={`p-10 rounded-[3.5rem] border transition-all relative overflow-hidden ${theme === 'dark' ? 'bg-slate-900/30 border-slate-800 shadow-3xl' : 'bg-white border-slate-200 shadow-xl'}`}>
                <div className="flex items-center justify-between mb-10">
                  <div>
                    <h3 className={`text-3xl font-black tracking-tight mb-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Phase 01</h3>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500">Establishing Authority Reference Nodes</p>
                  </div>
                  <div className="flex gap-2">
                    {[1,2,3].map(i => <div key={i} className="w-2.5 h-2.5 rounded-full bg-blue-500/20 border border-blue-500/40"></div>)}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <FileUploadZone theme={theme} label="Brands Master" selectedFile={files[UploadType.MASTER_BRANDS]} onFileSelect={(f) => handleFileSelect(UploadType.MASTER_BRANDS, f)} description="Global Brands Link" />
                  <FileUploadZone theme={theme} label="Colors Master" selectedFile={files[UploadType.MASTER_COLORS]} onFileSelect={(f) => handleFileSelect(UploadType.MASTER_COLORS, f)} description="Validated Palette" />
                  <FileUploadZone theme={theme} label="Sizes Master" selectedFile={files[UploadType.MASTER_SIZES]} onFileSelect={(f) => handleFileSelect(UploadType.MASTER_SIZES, f)} description="Standard Matrix" />
                  <FileUploadZone theme={theme} label="Category Logic" selectedFile={files[UploadType.MASTER_CATEGORIES]} onFileSelect={(f) => handleFileSelect(UploadType.MASTER_CATEGORIES, f)} description="Mapping Protocols" />
                  <div className="lg:col-span-2">
                    <FileUploadZone theme={theme} label="Marketplace Blueprint" selectedFile={files[UploadType.MASTER_TEMPLATE_EXPORT]} onFileSelect={(f) => handleFileSelect(UploadType.MASTER_TEMPLATE_EXPORT, f)} description="Template Validation Rules" />
                  </div>
                </div>
              </div>

              {/* Phase 02: User Data */}
              <div className={`p-10 rounded-[3.5rem] border transition-all relative overflow-hidden ${theme === 'dark' ? 'bg-slate-900/30 border-slate-800 shadow-3xl' : 'bg-white border-slate-200 shadow-xl'}`}>
                <div className="flex items-center justify-between mb-10">
                  <div>
                    <h3 className={`text-3xl font-black tracking-tight mb-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Phase 02</h3>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500">Injection of User Content Payload</p>
                  </div>
                  <FileSearch className="w-10 h-10 text-emerald-500/20" />
                </div>
                <FileUploadZone theme={theme} label="Target Attribute Batch" selectedFile={files[UploadType.USER_SHEET]} onFileSelect={(f) => handleFileSelect(UploadType.USER_SHEET, f)} description="XLSX Batch to validate" />
              </div>
            </div>

            {/* Sidebar Controls */}
            <div className="xl:col-span-4">
              <div className="sticky top-28 space-y-10">
                <div className={`p-10 rounded-[3.5rem] border transition-all ${theme === 'dark' ? 'bg-slate-900 border-slate-800 shadow-3xl shadow-blue-500/5' : 'bg-slate-900 border-slate-800 text-white shadow-3xl shadow-blue-500/10'}`}>
                  <h4 className="text-xl font-black mb-10 tracking-tight uppercase italic flex items-center gap-4">
                    <Zap className="w-6 h-6 text-blue-500" /> Control Hub
                  </h4>
                  
                  <button
                    disabled={isProcessing}
                    onClick={startValidation}
                    className={`w-full py-7 rounded-2xl font-black text-xs uppercase tracking-[0.4em] flex items-center justify-center gap-4 transition-all duration-500 relative group overflow-hidden ${
                      isProcessing 
                        ? 'bg-slate-800 cursor-not-allowed opacity-50' 
                        : 'bg-blue-600 hover:bg-blue-500 shadow-2xl shadow-blue-600/30 active:scale-95 text-white'
                    }`}
                  >
                    {isProcessing ? <><Loader2 className="w-6 h-6 animate-spin" /> Analyzing...</> : <><Target className="w-5 h-5 group-hover:scale-125 transition-transform" /> Execute Audit</>}
                  </button>

                  {error && (
                    <div className="mt-8 p-6 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-4 animate-in fade-in slide-in-from-top-2">
                      <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
                      <p className="text-[10px] font-black text-red-500 leading-relaxed uppercase tracking-widest">{error}</p>
                    </div>
                  )}

                  {result && (
                    <div className="mt-12 space-y-10 animate-in zoom-in duration-500">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 hover:border-emerald-500/40 transition-all text-center">
                          <p className="text-[9px] text-slate-400 font-black mb-3 uppercase tracking-widest">Neural Clear</p>
                          <p className="text-5xl font-black text-emerald-400">{result.stats.passed}</p>
                        </div>
                        <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 hover:border-red-500/40 transition-all text-center">
                          <p className="text-[9px] text-slate-400 font-black mb-3 uppercase tracking-widest">Critical Fail</p>
                          <p className="text-5xl font-black text-red-500">{result.stats.failed}</p>
                        </div>
                      </div>

                      <div className="p-8 bg-blue-500/5 rounded-[2.5rem] border border-blue-500/10 backdrop-blur-sm">
                         <div className="flex items-center justify-between mb-5">
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 italic">Efficiency Metrics</p>
                            <span className="text-blue-500 font-black text-lg">{((result.stats.passed / result.stats.total) * 100).toFixed(1)}%</span>
                         </div>
                         <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.6)] transition-all duration-1000" 
                              style={{ width: `${(result.stats.passed / result.stats.total) * 100}%` }}
                            />
                         </div>
                      </div>

                      <button
                        onClick={() => exportToExcel(result)}
                        className="w-full py-7 rounded-2xl font-black text-xs uppercase tracking-[0.4em] flex items-center justify-center gap-4 bg-white text-slate-900 hover:bg-slate-100 shadow-2xl active:scale-95 transition-all group"
                      >
                        <Download className="w-6 h-6 group-hover:-translate-y-1 transition-transform" /> Download Report
                      </button>
                    </div>
                  )}
                </div>

                <div className={`p-8 rounded-[2.5rem] border transition-all ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-100 border-slate-200 shadow-sm'}`}>
                  <h5 className="text-[10px] font-black uppercase tracking-[0.4em] mb-8 flex items-center gap-4 italic text-slate-400">
                    <CheckCircle2 className="w-4 h-4 text-blue-500" /> Active Protocols
                  </h5>
                  <ul className="space-y-5">
                    {[
                      "Header Verification Mode",
                      "Unified Multi-Brand Check",
                      "Error Context Isolation",
                      "Case-Agnostic Processing"
                    ].map((text, i) => (
                      <li key={i} className="flex items-center gap-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 group">
                        <ArrowRight className="w-3.5 h-3.5 text-blue-500/50 group-hover:translate-x-1 transition-transform" /> {text}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="py-24 border-t border-slate-800/10 mt-24 opacity-60">
        <div className="max-w-[1400px] mx-auto px-8 flex flex-col items-center gap-12">
          <div className="flex items-center gap-6">
            {/* Fix: Pass individual props correctly to satisfy SocialIconProps instead of spread to avoid key error */}
            {socials.map((s) => ( <SocialIcon key={s.label + 'foot'} href={s.href} icon={s.icon} label={s.label} theme={theme} /> ))}
          </div>
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-[11px] font-black uppercase tracking-[0.6em] text-slate-500">
              © 2025 <span className="text-blue-500 italic">NITIN PAL</span> | PRO QC NEURAL SUITE
            </p>
            <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest">Authorized Access Only • Neural Core v4.5.0 Deployment</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
