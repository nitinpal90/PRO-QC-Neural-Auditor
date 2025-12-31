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
    className={`p-2.5 rounded-xl transition-all duration-300 group relative border ${
      theme === 'dark' 
        ? 'bg-slate-900/50 border-slate-800 hover:bg-blue-500/10 text-slate-400 hover:text-blue-400 hover:border-blue-500/30' 
        : 'bg-white border-slate-100 hover:bg-slate-100 text-slate-500 hover:text-blue-600'
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
  <div className={`p-6 rounded-3xl border transition-all duration-500 flex flex-col gap-4 group cursor-default relative overflow-hidden
    ${theme === 'dark' 
      ? 'bg-slate-900/40 border-slate-800 hover:bg-slate-800/60 hover:border-slate-700 hover:-translate-y-1' 
      : 'bg-white border-slate-100 shadow-sm hover:shadow-xl'
    }`}>
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colorClass} shadow-lg transition-all duration-500 group-hover:rotate-6`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div>
      <h4 className={`text-base font-bold tracking-tight mb-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{title}</h4>
      <p className={`text-[9px] font-bold uppercase tracking-[0.1em] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{desc}</p>
    </div>
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

  if (isAuthLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#05070A]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500/50">Neural Sync In Progress</p>
      </div>
    </div>
  );

  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 ${theme === 'dark' ? 'bg-[#05070A]' : 'bg-slate-50'}`}>
        <div className={`w-full max-w-sm p-8 rounded-[2.5rem] border shadow-2xl ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-2xl bg-blue-600">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className={`text-2xl font-black text-center mb-1 tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>NEURAL AUDITOR</h2>
          <p className="text-center text-slate-500 text-[9px] font-bold uppercase tracking-[0.3em] mb-8">Babyshop Quality Suite</p>
          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
              <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border text-sm ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                placeholder="Full Name" />
            )}
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border text-sm ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
              placeholder="Email" />
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border text-sm ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
              placeholder="Password" />
            {authError && <p className="text-red-500 text-[10px] font-bold text-center">{authError}</p>}
            <button className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg">
              {isSignUp ? 'Create Account' : 'Login'}
            </button>
            <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="w-full text-[9px] font-bold uppercase tracking-widest text-slate-500 hover:text-blue-500 py-1">
              {isSignUp ? 'Already have access?' : 'Request access?'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 ${theme === 'dark' ? 'bg-[#05070A] text-slate-100' : 'bg-[#F8FAFC] text-slate-900'}`}>
      <nav className={`h-20 sticky top-0 z-[100] border-b backdrop-blur-3xl transition-all ${theme === 'dark' ? 'bg-[#05070A]/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
        <div className="max-w-[1400px] mx-auto px-8 h-full flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className={`p-3 rounded-xl shadow-lg ${theme === 'dark' ? 'bg-blue-600 shadow-blue-900/40' : 'bg-slate-900'}`}>
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight uppercase italic flex items-center gap-2">
                PRO QC <span className="text-blue-500 not-italic">Neural Engine</span>
              </h1>
              <p className={`text-[9px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Active Node: <span className="text-blue-500">{user.email?.split('@')[0]}</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 pr-6 border-r border-slate-800">
              {socials.map((s) => ( <SocialIcon key={s.label} {...s} theme={theme} /> ))}
            </div>
            <button onClick={toggleTheme} className={`p-3 rounded-xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-yellow-400' : 'bg-white border-slate-200 text-slate-500'}`}>
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={handleLogout} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all border ${theme === 'dark' ? 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-white border-slate-200 text-slate-600'}`}>
              <LogOut className="w-3 h-3" /> Exit
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto px-8 py-16">
        <header className="mb-20 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-500 px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest mb-6 border border-blue-500/20">
            <Sparkles className="w-3 h-3" /> Automated Validation Logic
          </div>
          <h2 className={`text-6xl font-black mb-6 tracking-tighter leading-[1.1] ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Next-Gen <span className="text-blue-500">QC Audit.</span>
          </h2>
          <p className="text-slate-500 text-sm font-medium leading-relaxed">
            Universal attribute validator for Babyshop marketplace. High-performance cross-referencing for brands, colors, sizes, and category rules.
          </p>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16 max-w-5xl mx-auto">
          <FeatureTile icon={Zap} title="Instant" desc="10k Records/Sec" colorClass="bg-blue-600" theme={theme} />
          <FeatureTile icon={Target} title="Precise" desc="Header Mapping" colorClass="bg-indigo-600" theme={theme} />
          <FeatureTile icon={Box} title="Unified" desc="Multi-Brand Support" colorClass="bg-emerald-600" theme={theme} />
          <FeatureTile icon={Layers} title="Export" desc="One-Click Report" colorClass="bg-amber-600" theme={theme} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
          <div className="xl:col-span-8 space-y-10">
            <div className={`p-10 rounded-[2.5rem] border transition-all ${theme === 'dark' ? 'bg-slate-900/30 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
              <div className="flex items-center justify-between mb-8">
                <div>
                   <h3 className={`text-3xl font-black tracking-tight mb-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Phase 01</h3>
                   <p className="text-[9px] font-black uppercase tracking-widest text-blue-500">Master Authority Sheets</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <FileUploadZone theme={theme} label="Brands Master" selectedFile={files[UploadType.MASTER_BRANDS]} onFileSelect={(f) => handleFileSelect(UploadType.MASTER_BRANDS, f)} />
                <FileUploadZone theme={theme} label="Colors Master" selectedFile={files[UploadType.MASTER_COLORS]} onFileSelect={(f) => handleFileSelect(UploadType.MASTER_COLORS, f)} />
                <FileUploadZone theme={theme} label="Sizes Master" selectedFile={files[UploadType.MASTER_SIZES]} onFileSelect={(f) => handleFileSelect(UploadType.MASTER_SIZES, f)} />
                <FileUploadZone theme={theme} label="Category Logic" selectedFile={files[UploadType.MASTER_CATEGORIES]} onFileSelect={(f) => handleFileSelect(UploadType.MASTER_CATEGORIES, f)} />
                <div className="lg:col-span-2">
                   <FileUploadZone theme={theme} label="Blueprint Template" selectedFile={files[UploadType.MASTER_TEMPLATE_EXPORT]} onFileSelect={(f) => handleFileSelect(UploadType.MASTER_TEMPLATE_EXPORT, f)} />
                </div>
              </div>
            </div>

            <div className={`p-10 rounded-[2.5rem] border transition-all ${theme === 'dark' ? 'bg-slate-900/30 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
               <h3 className={`text-3xl font-black tracking-tight mb-8 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Phase 02</h3>
              <FileUploadZone theme={theme} label="User Attribute Sheet" selectedFile={files[UploadType.USER_SHEET]} onFileSelect={(f) => handleFileSelect(UploadType.USER_SHEET, f)} description="Batch file to audit" />
            </div>
          </div>

          <div className="xl:col-span-4">
            <div className="sticky top-28 space-y-8">
              <div className={`p-8 rounded-[2.5rem] border ${theme === 'dark' ? 'bg-slate-900 border-slate-800 shadow-xl' : 'bg-slate-900 border-slate-800 text-white shadow-2xl'}`}>
                <h4 className="text-lg font-black mb-8 tracking-tight uppercase italic flex items-center gap-3">
                  <Zap className="w-5 h-5 text-blue-500" /> Control Panel
                </h4>
                
                <button
                  disabled={isProcessing}
                  onClick={startValidation}
                  className={`w-full py-6 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${
                    isProcessing 
                      ? 'bg-slate-800 cursor-not-allowed opacity-50' 
                      : 'bg-blue-600 hover:bg-blue-50 shadow-lg shadow-blue-600/20 active:scale-95 text-white'
                  }`}
                >
                  {isProcessing ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</> : <><Target className="w-4 h-4" /> Run Neural Audit</>}
                </button>

                {error && (
                  <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] font-bold text-red-500 leading-relaxed uppercase tracking-wider">{error}</p>
                  </div>
                )}

                {result && (
                  <div className="mt-10 space-y-8 animate-in zoom-in duration-500">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                        <p className="text-[9px] text-slate-400 font-bold mb-2 uppercase tracking-widest">Passed</p>
                        <p className="text-3xl font-black text-emerald-400">{result.stats.passed}</p>
                      </div>
                      <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                        <p className="text-[9px] text-slate-400 font-bold mb-2 uppercase tracking-widest">Failures</p>
                        <p className="text-3xl font-black text-red-500">{result.stats.failed}</p>
                      </div>
                    </div>

                    <div className="p-6 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                       <div className="flex items-center justify-between mb-3">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 italic">Efficiency</p>
                          <span className="text-blue-500 font-bold text-xs">{((result.stats.passed / result.stats.total) * 100).toFixed(1)}%</span>
                       </div>
                       <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 transition-all duration-1000" 
                            style={{ width: `${(result.stats.passed / result.stats.total) * 100}%` }}
                          />
                       </div>
                    </div>

                    <button
                      onClick={() => exportToExcel(result)}
                      className="w-full py-6 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 bg-white text-slate-900 hover:bg-slate-100 shadow-xl active:scale-95 transition-all"
                    >
                      <Download className="w-5 h-5" /> Download Report
                    </button>
                  </div>
                )}
              </div>

              <div className={`p-8 rounded-[2rem] border ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <h5 className="text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-blue-500" /> System Protocols
                </h5>
                <ul className="space-y-4">
                  {[
                    "Header Verification",
                    "Unified Authority Check",
                    "Error Context Mapping",
                    "Case-Agnostic Logic"
                  ].map((text, i) => (
                    <li key={i} className="flex items-center gap-3 text-[9px] font-bold uppercase tracking-widest text-slate-500">
                      <ArrowRight className="w-3 h-3 text-blue-500/50" /> {text}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="py-16 border-t border-slate-800/30 mt-20">
        <div className="max-w-[1400px] mx-auto px-8 flex flex-col items-center gap-10">
          <div className="flex items-center gap-4">
            {socials.map((s) => ( <SocialIcon key={s.label + 'foot'} {...s} theme={theme} /> ))}
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">
            © 2025 <span className="text-blue-500 italic">NITIN PAL</span> | PRO QC NEURAL SUITE
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;