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
  ArrowRight
} from 'lucide-react';
import FileUploadZone from './components/FileUploadZone';
import { UploadType, ProcessedData } from './types';
import { runQCValidation, exportToExcel } from './services/qcEngine';
import { supabase } from './supabaseClient';

const SocialIcon = ({ href, icon: Icon, label, theme }: { href: string; icon: any; label: string, theme: string }) => (
  <a 
    href={href} 
    target="_blank" 
    rel="noopener noreferrer"
    className={`p-3 rounded-2xl transition-all duration-500 group relative border ${
      theme === 'dark' 
        ? 'bg-slate-900/50 border-slate-800 hover:bg-blue-500/10 text-slate-400 hover:text-blue-400 hover:border-blue-500/30' 
        : 'bg-white border-slate-100 hover:bg-slate-100 text-slate-500 hover:text-blue-600'
    }`}
    aria-label={label}
  >
    <Icon className="w-5 h-5" />
    <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-[10px] font-black uppercase tracking-widest text-white opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap shadow-2xl">
      {label}
    </div>
  </a>
);

const FeatureTile = ({ icon: Icon, title, desc, colorClass, theme }: { icon: any, title: string, desc: string, colorClass: string, theme: string }) => (
  <div className={`p-8 rounded-[3rem] border transition-all duration-700 flex flex-col gap-6 group cursor-default relative overflow-hidden
    ${theme === 'dark' 
      ? 'bg-slate-900/40 border-slate-800 hover:bg-slate-800/60 hover:border-slate-700 hover:-translate-y-2' 
      : 'bg-white border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.02)] hover:shadow-2xl'
    }`}>
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${colorClass} shadow-xl transition-all duration-500 group-hover:rotate-[15deg] group-hover:scale-110`}>
      <Icon className="w-7 h-7 text-white" />
    </div>
    <div>
      <h4 className={`text-xl font-black tracking-tight mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{title}</h4>
      <p className={`text-[10px] leading-relaxed font-bold uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{desc}</p>
    </div>
    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000"></div>
  </div>
);

const App: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
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
    if (session?.user) setUser(session.user);
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
    } catch (err: any) { setAuthError(err.message); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
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
      setError("System Offline: All 6 neural nodes must be connected.");
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
    } catch (err) { setError("Neural Conflict: Processing failed. Check file formats."); }
    finally { setIsProcessing(false); }
  };

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const socials = [
    { href: "https://x.com/RealNitinX", icon: Twitter, label: "X" },
    { href: "https://www.linkedin.com/in/nitinpal1/", icon: Linkedin, label: "LinkedIn" },
    { href: "https://github.com/nitinpal90", icon: Github, label: "GitHub" },
    { href: "https://bento.me/lynxnitin", icon: Globe, label: "Portfolio" }
  ];

  if (isAuthLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
           <Loader2 className="w-20 h-20 text-blue-500 animate-spin" />
           <ShieldCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-blue-400" />
        </div>
        <p className="text-[11px] font-black uppercase tracking-[0.6em] text-blue-500/70 animate-pulse">Synchronizing Protocols</p>
      </div>
    </div>
  );

  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 transition-all duration-700 ${theme === 'dark' ? 'bg-[#05070A]' : 'bg-slate-50'}`}>
        <div className={`w-full max-w-md p-12 rounded-[4rem] border transition-all duration-500 relative overflow-hidden ${theme === 'dark' ? 'bg-slate-900/80 border-slate-800 shadow-2xl' : 'bg-white border-slate-100 shadow-2xl'}`}>
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
          <div className="flex justify-center mb-10">
            <div className="p-6 rounded-[2rem] bg-blue-600 shadow-2xl shadow-blue-500/40">
              <ShieldCheck className="w-12 h-12 text-white" />
            </div>
          </div>
          <h2 className={`text-4xl font-black text-center mb-2 tracking-tighter uppercase italic ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Neural Auditor
          </h2>
          <p className="text-center text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mb-12">Universal Babyshop Gatekeeper</p>
          
          <form onSubmit={handleAuth} className="space-y-6">
            {isSignUp && (
              <div className="space-y-2 group">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-focus-within:text-blue-500 transition-colors">Neural Name</label>
                <input 
                  type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                  className={`w-full px-6 py-5 rounded-2xl border transition-all font-bold ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-100 focus:border-blue-400'}`}
                  placeholder="ID Name"
                />
              </div>
            )}
            <div className="space-y-2 group">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-focus-within:text-blue-500 transition-colors">Access Email</label>
              <input 
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-6 py-5 rounded-2xl border transition-all font-bold ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-100 focus:border-blue-400'}`}
                placeholder="name@babyshop.com"
              />
            </div>
            <div className="space-y-2 group">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-focus-within:text-blue-500 transition-colors">Neural Key</label>
              <input 
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-6 py-5 rounded-2xl border transition-all font-bold ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-100 focus:border-blue-400'}`}
                placeholder="••••••••"
              />
            </div>
            {authError && <p className="text-red-500 text-[10px] font-black uppercase text-center bg-red-500/10 py-3 rounded-xl border border-red-500/20">{authError}</p>}
            
            <button className="w-full py-6 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl shadow-blue-600/20 transition-all active:scale-95">
              {isSignUp ? 'Initiate Linking' : 'Establish Link'}
            </button>
            
            <button 
              type="button" onClick={() => setIsSignUp(!isSignUp)}
              className="w-full text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-500 transition-colors py-2"
            >
              {isSignUp ? 'Back to Login Core' : 'Request Security Access'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-all duration-700 ${theme === 'dark' ? 'bg-[#05070A] text-slate-100' : 'bg-[#F8FAFC] text-slate-900'}`}>
      <nav className={`h-28 sticky top-0 z-[100] border-b transition-all duration-500 backdrop-blur-3xl ${theme === 'dark' ? 'bg-[#05070A]/80 border-slate-800/50' : 'bg-white/80 border-slate-200/50'}`}>
        <div className="max-w-[1600px] mx-auto px-12 h-full flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className={`p-5 rounded-3xl shadow-2xl transition-all duration-500 ${theme === 'dark' ? 'bg-blue-600 shadow-blue-900/40 hover:rotate-12' : 'bg-slate-900 shadow-slate-200 hover:-rotate-12'}`}>
              <ShieldCheck className="w-10 h-10 text-white" />
            </div>
            <div className="hidden md:block">
              <h1 className="text-3xl font-black tracking-tighter uppercase italic flex items-center gap-3">
                PRO QC <span className="text-blue-500 not-italic">Neural Engine</span>
              </h1>
              <div className="flex items-center gap-4 mt-1.5">
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                   <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      Core: <span className="text-blue-500">{user.user_metadata?.display_name || user.email?.split('@')[0]}</span>
                   </span>
                </div>
                <div className="w-[1px] h-3 bg-slate-800"></div>
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Latency: 12ms</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-10">
            <div className="hidden lg:flex items-center gap-4 pr-10 border-r border-slate-800/50">
              {socials.map((s) => ( <SocialIcon key={s.label} {...s} theme={theme} /> ))}
            </div>
            <div className="flex items-center gap-6">
              <button 
                onClick={toggleTheme}
                className={`p-4 rounded-2xl transition-all duration-300 border shadow-lg ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-yellow-400 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
              >
                {theme === 'dark' ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
              </button>
              <button 
                onClick={handleLogout}
                className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 transition-all active:scale-95 border shadow-xl ${theme === 'dark' ? 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-red-500 hover:text-red-500'}`}
              >
                <LogOut className="w-4 h-4" /> Shutdown
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto px-12 py-24">
        <section className="mb-32 flex flex-col items-center text-center max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-4 bg-blue-500/10 text-blue-500 px-8 py-3 rounded-full text-[11px] font-black uppercase tracking-[0.4em] mb-12 border border-blue-500/20 shadow-2xl shadow-blue-500/10">
            <Sparkles className="w-5 h-5" /> Next-Gen Neural Validation Protocols
          </div>
          <h2 className={`text-[120px] font-black mb-12 tracking-tighter leading-[0.85] italic ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Master <span className="text-blue-500">Quality.</span> <br/>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-indigo-400 to-blue-600 not-italic">Eliminate Risk.</span>
          </h2>
          <p className="max-w-2xl text-slate-500 text-lg font-medium leading-relaxed mb-16 opacity-80">
            The elite QC solution for Babyshop. Leveraging a unified neural validation engine 
            to cross-reference thousands of attributes with zero-latency precision.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 w-full">
            <FeatureTile icon={Zap} title="Sub-Millisecond" desc="10k Records Instant" colorClass="bg-blue-600" theme={theme} />
            <FeatureTile icon={Target} title="Deep Audit" desc="Header & Value Logic" colorClass="bg-indigo-600" theme={theme} />
            <FeatureTile icon={Box} title="Unified Scale" desc="Multi-Brand Master" colorClass="bg-emerald-600" theme={theme} />
            <FeatureTile icon={Layers} title="Automated" desc="One-Click Export" colorClass="bg-amber-600" theme={theme} />
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-16">
          <div className="xl:col-span-8 space-y-16">
            <div className={`p-16 rounded-[4.5rem] border transition-all duration-700 relative overflow-hidden ${theme === 'dark' ? 'bg-slate-900/30 border-slate-800 shadow-2xl' : 'bg-white border-slate-100 shadow-2xl'}`}>
              <div className="flex items-center justify-between mb-16">
                <div>
                   <h3 className={`text-5xl font-black tracking-tighter mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Phase 01</h3>
                   <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500">Establishing Authority Reference</p>
                </div>
                <div className="flex gap-4">
                  {[1,2,3].map(i => <div key={i} className="w-3 h-3 rounded-full bg-blue-500/20 border border-blue-500/40"></div>)}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                <FileUploadZone theme={theme} label="Brands Authority" selectedFile={files[UploadType.MASTER_BRANDS]} onFileSelect={(f) => handleFileSelect(UploadType.MASTER_BRANDS, f)} description="Global Brands" />
                <FileUploadZone theme={theme} label="Colors Authority" selectedFile={files[UploadType.MASTER_COLORS]} onFileSelect={(f) => handleFileSelect(UploadType.MASTER_COLORS, f)} description="Validated Palette" />
                <FileUploadZone theme={theme} label="Sizes Authority" selectedFile={files[UploadType.MASTER_SIZES]} onFileSelect={(f) => handleFileSelect(UploadType.MASTER_SIZES, f)} description="Matrix Standards" />
                <FileUploadZone theme={theme} label="Category Logic" selectedFile={files[UploadType.MASTER_CATEGORIES]} onFileSelect={(f) => handleFileSelect(UploadType.MASTER_CATEGORIES, f)} description="Mapping Protocols" />
                <div className="lg:col-span-2">
                   <FileUploadZone theme={theme} label="Marketplace Blueprint" selectedFile={files[UploadType.MASTER_TEMPLATE_EXPORT]} onFileSelect={(f) => handleFileSelect(UploadType.MASTER_TEMPLATE_EXPORT, f)} description="Validation Rules Sheet" />
                </div>
              </div>
            </div>

            <div className={`p-16 rounded-[4.5rem] border transition-all duration-700 ${theme === 'dark' ? 'bg-slate-900/30 border-slate-800 shadow-2xl' : 'bg-white border-slate-100 shadow-2xl'}`}>
               <div className="flex items-center justify-between mb-16">
                  <div>
                     <h3 className={`text-5xl font-black tracking-tighter mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Phase 02</h3>
                     <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500">Injection of User Content</p>
                  </div>
                  <FileSearch className="w-12 h-12 text-emerald-500/30" />
               </div>
              <FileUploadZone theme={theme} label="Target Attribute Batch" selectedFile={files[UploadType.USER_SHEET]} onFileSelect={(f) => handleFileSelect(UploadType.USER_SHEET, f)} description="XLSX Payload to audit" />
            </div>
          </div>

          <div className="xl:col-span-4">
            <div className="sticky top-40 space-y-12">
              <div className={`p-12 rounded-[4rem] border transition-all duration-700 relative overflow-hidden ${theme === 'dark' ? 'bg-slate-900 border-slate-800 shadow-2xl' : 'bg-slate-900 border-slate-800 text-white shadow-3xl shadow-blue-500/20'}`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-3xl rounded-full -mr-10 -mt-10"></div>
                <h4 className="text-2xl font-black mb-10 tracking-tight uppercase italic flex items-center gap-4">
                  <Zap className="w-8 h-8 text-blue-500" /> Command Ops
                </h4>
                
                <button
                  disabled={isProcessing}
                  onClick={startValidation}
                  className={`w-full py-10 rounded-3xl font-black text-[15px] uppercase tracking-[0.4em] flex items-center justify-center gap-5 transition-all duration-500 relative group overflow-hidden ${
                    isProcessing 
                      ? 'bg-slate-800 cursor-not-allowed opacity-50' 
                      : 'bg-blue-600 hover:bg-blue-500 shadow-2xl shadow-blue-600/40 active:scale-95 text-white'
                  }`}
                >
                  {isProcessing ? <><Loader2 className="w-8 h-8 animate-spin" /> Analyzing...</> : <><Target className="w-6 h-6 group-hover:scale-125 transition-transform" /> Execute Neural Audit</>}
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </button>

                {error && (
                  <div className="mt-10 p-8 bg-red-500/10 border border-red-500/30 rounded-3xl flex items-start gap-6 animate-in slide-in-from-top-4 duration-500">
                    <AlertTriangle className="w-7 h-7 text-red-500 shrink-0" />
                    <p className="text-[12px] font-black text-red-500 leading-relaxed uppercase tracking-widest">{error}</p>
                  </div>
                )}

                {result && (
                  <div className="mt-16 space-y-12 animate-in zoom-in duration-700">
                    <div className="grid grid-cols-2 gap-8">
                      <div className="bg-white/5 p-10 rounded-[3rem] border border-white/10 hover:border-emerald-500/40 transition-all group">
                        <p className="text-[10px] text-slate-400 font-black mb-4 uppercase tracking-[0.3em]">Neural Clear</p>
                        <p className="text-7xl font-black text-emerald-400 group-hover:scale-110 transition-transform">{result.stats.passed}</p>
                      </div>
                      <div className="bg-white/5 p-10 rounded-[3rem] border border-white/10 hover:border-red-500/40 transition-all group">
                        <p className="text-[10px] text-slate-400 font-black mb-4 uppercase tracking-[0.3em]">Critical Failures</p>
                        <p className="text-7xl font-black text-red-500 group-hover:scale-110 transition-transform">{result.stats.failed}</p>
                      </div>
                    </div>

                    <div className="p-10 bg-blue-500/5 rounded-[3rem] border border-blue-500/10 backdrop-blur-sm">
                       <div className="flex items-center justify-between mb-6">
                          <p className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 italic">Efficiency Metrics</p>
                          <span className="text-blue-500 font-black text-xl">{((result.stats.passed / result.stats.total) * 100).toFixed(1)}%</span>
                       </div>
                       <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-1500 ease-out shadow-[0_0_15px_rgba(59,130,246,0.5)]" 
                            style={{ width: `${(result.stats.passed / result.stats.total) * 100}%` }}
                          />
                       </div>
                    </div>

                    <button
                      onClick={() => exportToExcel(result)}
                      className="w-full py-10 rounded-3xl font-black text-[15px] uppercase tracking-[0.4em] flex items-center justify-center gap-5 bg-white text-slate-900 hover:bg-slate-100 shadow-3xl active:scale-95 transition-all group"
                    >
                      <Download className="w-7 h-7 group-hover:-translate-y-1 transition-transform" /> Extract Neural Report
                    </button>
                  </div>
                )}
              </div>

              <div className={`p-12 rounded-[3.5rem] border transition-all duration-700 ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-5 mb-10">
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center shadow-inner">
                    <CheckCircle2 className="w-7 h-7 text-blue-500" />
                  </div>
                  <h5 className="text-lg font-black uppercase tracking-widest italic">Live Protocols</h5>
                </div>
                <ul className="space-y-6">
                  {[
                    { text: "Strict Header Logic", color: "text-blue-500" },
                    { text: "Unified Authority Cross-Check", color: "text-indigo-500" },
                    { text: "Detailed Error Mapping", color: "text-emerald-500" },
                    { text: "Case-Agnostic Processing", color: "text-amber-500" }
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-5 text-[11px] font-black uppercase tracking-[0.2em] group">
                      <ArrowRight className={`w-4 h-4 transition-transform group-hover:translate-x-2 ${item.color}`} />
                      <span className="text-slate-500 group-hover:text-slate-300 transition-colors">{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="py-32 border-t border-slate-800/30 mt-32 relative overflow-hidden">
        <div className="absolute inset-0 neural-glow opacity-30"></div>
        <div className="max-w-[1600px] mx-auto px-12 flex flex-col items-center gap-16 relative z-10">
          <div className="flex items-center gap-6">
            {socials.map((s) => ( <SocialIcon key={s.label + 'foot'} {...s} theme={theme} /> ))}
          </div>
          <div className="flex flex-col items-center gap-6 text-center">
            <p className="text-[14px] font-black uppercase tracking-[0.8em] text-slate-500">
              © 2025 <span className="text-blue-500 italic">NITIN PAL</span> | PRO QC NEURAL SUITE
            </p>
            <div className="flex items-center gap-6 opacity-20">
              <span className="w-20 h-[1px] bg-slate-500"></span>
              <ShieldCheck className="w-6 h-6 text-slate-500" />
              <span className="w-20 h-[1px] bg-slate-500"></span>
            </div>
            <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Authorized Access Only • Neural Core v4.2.0</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;