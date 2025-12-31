
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  ShieldCheck, 
  Play, 
  Download, 
  CheckCircle, 
  Loader2,
  AlertTriangle,
  FileSpreadsheet,
  RotateCcw,
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
  ExternalLink,
  LogIn,
  LogOut,
  User,
  Lock,
  UserPlus
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
    className={`p-2.5 rounded-xl transition-all duration-300 group relative ${
      theme === 'dark' ? 'hover:bg-slate-800 text-slate-300 hover:text-blue-400 border border-slate-800 hover:border-slate-700' : 'hover:bg-slate-100 text-slate-500 hover:text-blue-600 border border-transparent'
    }`}
    aria-label={label}
  >
    <Icon className="w-5 h-5" />
    <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-bold uppercase tracking-widest z-[110]">
      {label}
    </span>
  </a>
);

const FeatureTile = ({ icon: Icon, title, desc, colorClass, theme }: { icon: any, title: string, desc: string, colorClass: string, theme: string }) => (
  <div className={`p-8 rounded-[2.5rem] border transition-all duration-500 flex flex-col gap-5 group cursor-default
    ${theme === 'dark' 
      ? 'bg-slate-900/90 border-slate-800 hover:bg-slate-800 hover:border-slate-700 shadow-2xl' 
      : 'bg-white border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_12px_40px_rgb(59,130,246,0.08)]'
    }`}>
    <div className={`w-16 h-16 rounded-[1.75rem] flex items-center justify-center ${colorClass} shadow-xl transition-all group-hover:rotate-6 group-hover:scale-110`}>
      <Icon className="w-8 h-8 text-white" />
    </div>
    <div>
      <h4 className={`text-lg font-black tracking-tight mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{title}</h4>
      <p className={`text-[11px] leading-relaxed font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-200' : 'text-slate-500'}`}>{desc}</p>
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
  const [isBlocked, setIsBlocked] = useState(false);

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
      await validateAccess(session.user.email);
    }
    setIsAuthLoading(false);
  };

  const validateAccess = async (userEmail: string | undefined) => {
    if (!userEmail) return;
    const { data, error: accessError } = await supabase
      .from('user_access')
      .select('is_blocked')
      .eq('email', userEmail)
      .single();

    // If record exists and is blocked
    if (data?.is_blocked) {
      setIsBlocked(true);
      await supabase.auth.signOut();
      setUser(null);
    } else {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
      setIsBlocked(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    
    if (isSignUp) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: fullName }
        }
      });
      if (signUpError) setAuthError(signUpError.message);
      else await validateAccess(data.user?.email);
    } else {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) setAuthError(loginError.message);
      else await validateAccess(data.user?.email);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsBlocked(false);
    setEmail('');
    setPassword('');
    setFullName('');
  };

  const handleFileSelect = (type: UploadType, file: File) => {
    setFiles(prev => ({ ...prev, [type]: file }));
    setResult(null);
  };

  const handleReset = () => {
    setFiles(initialFileState);
    setResult(null);
    setError(null);
  };

  const startValidation = async () => {
    const missing = Object.entries(files).filter(([_, f]) => !f);
    if (missing.length > 0) {
      setError("Data Missing: Please upload all 5 authority masters to start the audit.");
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      const workbooks: any = {};
      for (const key of Object.keys(files)) {
        workbooks[key] = await readFile(files[key as UploadType]!);
      }
      const output = await runQCValidation(workbooks);
      setResult(output);
    } catch (err) {
      setError("Audit Conflict: Ensure headers are correctly spelled.");
    } finally {
      setIsProcessing(false);
    }
  };

  const readFile = (file: File): Promise<XLSX.WorkBook> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        resolve(XLSX.read(data, { type: 'array' }));
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const socials = [
    { href: "https://x.com/RealNitinX", icon: Twitter, label: "X (Twitter)" },
    { href: "https://www.linkedin.com/in/nitinpal1/", icon: Linkedin, label: "LinkedIn" },
    { href: "https://github.com/nitinpal90", icon: Github, label: "GitHub" },
    { href: "https://bento.me/lynxnitin", icon: Globe, label: "Portfolio" }
  ];

  if (isAuthLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#05070A]">
      <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
    </div>
  );

  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 ${theme === 'dark' ? 'bg-[#05070A]' : 'bg-slate-50'}`}>
        <div className={`w-full max-w-md p-10 rounded-[3rem] border shadow-2xl transition-all duration-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
          <div className="flex justify-center mb-8">
            <div className="p-5 rounded-[1.5rem] bg-blue-600 shadow-2xl shadow-blue-500/30">
              <ShieldCheck className="w-10 h-10 text-white" />
            </div>
          </div>
          <h2 className={`text-3xl font-black text-center mb-2 tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            PRO QC AUDITOR
          </h2>
          <p className="text-center text-slate-500 text-xs font-bold uppercase tracking-widest mb-10">Secure Neural Access</p>
          
          {isBlocked && (
            <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold text-center animate-pulse">
              ACCESS DENIED: This account has been restricted.
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-6">
            {isSignUp && (
              <div className="space-y-2 animate-in slide-in-from-top-4 duration-300">
                <label className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={`w-full pl-12 pr-4 py-4 rounded-2xl border transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-100 focus:border-blue-400'}`}
                    placeholder="Enter your name"
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Email Address</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full pl-12 pr-4 py-4 rounded-2xl border transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-100 focus:border-blue-400'}`}
                  placeholder="name@example.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-12 pr-4 py-4 rounded-2xl border transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-100 focus:border-blue-400'}`}
                  placeholder="••••••••"
                />
              </div>
            </div>
            {authError && <p className="text-red-500 text-[10px] font-bold uppercase text-center">{authError}</p>}
            
            <button className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3">
              {isSignUp ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
              {isSignUp ? 'Create Account' : 'Secure Login'}
            </button>
            
            <div className="text-center">
              <button 
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setAuthError('');
                }}
                className={`text-[10px] font-black uppercase tracking-widest transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-blue-600'}`}
              >
                {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
              </button>
            </div>
          </form>
          <div className="mt-10 flex justify-center gap-4">
             {socials.map((s, idx) => <SocialIcon key={idx} {...s} theme={theme} />)}
          </div>
        </div>
      </div>
    );
  }

  const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Member';

  return (
    <div className={`min-h-screen transition-colors duration-500 font-['Inter'] ${theme === 'dark' ? 'bg-[#05070A] text-slate-100' : 'bg-[#F8FAFC] text-slate-900'}`}>
      
      {/* Navigation */}
      <nav className={`h-24 sticky top-0 z-[100] border-b backdrop-blur-3xl transition-all duration-500 ${theme === 'dark' ? 'bg-[#05070A]/80 border-slate-800' : 'bg-white/80 border-slate-100'}`}>
        <div className="max-w-[1500px] mx-auto px-10 h-full flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className={`p-4 rounded-[1.25rem] shadow-2xl transition-all ${theme === 'dark' ? 'bg-blue-600 shadow-blue-900/40' : 'bg-slate-900 shadow-slate-200'}`}>
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter uppercase italic">
                PRO QC <span className="text-blue-500 not-italic">Neural Auditor</span>
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${theme === 'dark' ? 'text-slate-300' : 'text-slate-400'}`}>Welcome, <span className="text-blue-400">{displayName}</span></span>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                <div className="flex gap-1.5">
                  {socials.map((s, idx) => <SocialIcon key={idx} {...s} theme={theme} />)}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <button 
              onClick={toggleTheme}
              className={`p-3.5 rounded-2xl transition-all duration-300 border shadow-lg ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-yellow-400 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className={`h-10 w-px ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
            <button 
              onClick={handleLogout}
              className={`px-7 py-3.5 rounded-[1.25rem] text-[11px] font-black uppercase tracking-widest flex items-center gap-3 transition-all active:scale-95 border-2 shadow-xl ${theme === 'dark' ? 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-white border-slate-100 text-slate-600 hover:border-red-200 hover:text-red-500'}`}
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-[1500px] mx-auto px-10 py-20">
        
        <section className="mb-24 text-center animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="inline-flex items-center gap-3 bg-blue-500/15 text-blue-500 px-7 py-2.5 rounded-full text-[11px] font-black uppercase tracking-[0.25em] mb-12 border border-blue-500/30">
            <Sparkles className="w-4 h-4" /> Secure Quality Control Suite
          </div>
          <h2 className={`text-8xl font-black mb-10 tracking-tighter leading-[0.9] transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Audit Your <span className="text-blue-500 italic">Inventory</span> With <br/>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-indigo-400 to-blue-600">Pure Accuracy</span>
          </h2>
          <p className={`text-2xl font-medium max-w-4xl mx-auto leading-relaxed transition-colors ${theme === 'dark' ? 'text-slate-200' : 'text-slate-500'}`}>
            The high-speed audit solution for enterprise listing data. 
            Automate validation against brand, color, and size masters with full structural integrity.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-32">
          <FeatureTile theme={theme} icon={Target} title="Mapping Sync" desc="Category-Based Rule Logic" colorClass="bg-blue-600 shadow-blue-500/30" />
          <FeatureTile theme={theme} icon={Box} title="Name Validation" desc="Clean String Consistency" colorClass="bg-indigo-600 shadow-indigo-500/30" />
          <FeatureTile theme={theme} icon={Layers} title="Policy Check" desc="Attribute Compliance Audit" colorClass="bg-amber-600 shadow-amber-500/30" />
          <FeatureTile theme={theme} icon={FileSearch} title="Final Audit" desc="Verified Submission Ready" colorClass="bg-emerald-600 shadow-emerald-500/30" />
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-16">
          <div className="xl:col-span-8 space-y-16">
            <div className={`p-12 rounded-[4rem] border transition-all duration-500 ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800 shadow-2xl' : 'bg-white border-slate-100 shadow-2xl shadow-slate-200/50'}`}>
              <div className="flex items-center justify-between mb-14">
                <div>
                  <h3 className={`text-4xl font-black tracking-tighter ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Reference Data</h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-500 mt-3">Stage 01: Context Configuration</p>
                </div>
                <div className={`w-20 h-20 rounded-full flex items-center justify-center font-black text-3xl ${theme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-300'}`}>01</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                <FileUploadZone theme={theme} label="Brand Authority" selectedFile={files[UploadType.MASTER_BRANDS]} onFileSelect={(f) => handleFileSelect(UploadType.MASTER_BRANDS, f)} />
                <FileUploadZone theme={theme} label="Color Palette Master" selectedFile={files[UploadType.MASTER_COLORS]} onFileSelect={(f) => handleFileSelect(UploadType.MASTER_COLORS, f)} description="Checks Color Names" />
                <FileUploadZone theme={theme} label="Size Matrix Master" selectedFile={files[UploadType.MASTER_SIZES]} onFileSelect={(f) => handleFileSelect(UploadType.MASTER_SIZES, f)} description="Checks Size Names" />
                <FileUploadZone theme={theme} label="Category Mapper" selectedFile={files[UploadType.MASTER_CATEGORIES]} onFileSelect={(f) => handleFileSelect(UploadType.MASTER_CATEGORIES, f)} description="Category To Template Mapping" />
                <div className="lg:col-span-2">
                   <FileUploadZone theme={theme} label="Marketplace Spec Sheet" selectedFile={files[UploadType.MASTER_TEMPLATE_EXPORT]} onFileSelect={(f) => handleFileSelect(UploadType.MASTER_TEMPLATE_EXPORT, f)} description="Rules, Selection Types & Required Fields" />
                </div>
              </div>
            </div>

            <div className={`p-12 rounded-[4rem] border transition-all duration-500 group ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800 shadow-2xl' : 'bg-white border-slate-100 shadow-2xl shadow-slate-200/50'}`}>
              <div className="flex items-center justify-between mb-14">
                <div className="flex items-center gap-10">
                  <div className={`w-28 h-28 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl transition-all duration-700 group-hover:scale-105 group-hover:rotate-2 ${theme === 'dark' ? 'bg-blue-600 shadow-blue-900/50' : 'bg-slate-900 shadow-slate-400/30'}`}>
                    <FileSpreadsheet className="w-14 h-14" />
                  </div>
                  <div>
                    <h3 className={`text-4xl font-black tracking-tighter ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Deployment Batch</h3>
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-500 mt-3">Stage 02: Transaction Processing</p>
                  </div>
                </div>
                <div className={`w-20 h-20 rounded-full flex items-center justify-center font-black text-3xl ${theme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-300'}`}>02</div>
              </div>
              <FileUploadZone theme={theme} label="Article Content Sheet" selectedFile={files[UploadType.USER_SHEET]} onFileSelect={(f) => handleFileSelect(UploadType.USER_SHEET, f)} description="Targets: Names, Attributes & Hierarchy" />
            </div>
          </div>

          <div className="xl:col-span-4">
            <div className="sticky top-40 space-y-12">
              <div className={`p-12 rounded-[4rem] relative overflow-hidden transition-all duration-500 border ${theme === 'dark' ? 'bg-slate-900 border-slate-800 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.8)]' : 'bg-[#0F172A] border-slate-800 shadow-[0_40px_100px_-20px_rgba(15,23,42,0.4)] text-white'}`}>
                <div className="absolute -top-10 -right-10 w-48 h-48 bg-blue-500/20 blur-[100px] rounded-full"></div>
                
                <h3 className="text-[11px] font-black mb-12 flex items-center gap-3 relative z-10 text-blue-400 uppercase tracking-[0.6em]">
                   <Zap className="w-5 h-5 fill-current" /> Tactical Hub
                </h3>
                
                <button
                  disabled={isProcessing}
                  onClick={startValidation}
                  className={`w-full py-9 rounded-[2.25rem] font-black text-[14px] uppercase tracking-[0.3em] flex items-center justify-center gap-4 transition-all relative z-10 shadow-2xl ${
                    isProcessing 
                      ? 'bg-slate-800 cursor-not-allowed opacity-50' 
                      : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/50 active:scale-95 text-white'
                  }`}
                >
                  {isProcessing ? (
                    <><Loader2 className="w-7 h-7 animate-spin" /> Verifying Data...</>
                  ) : (
                    'Initiate Pro Audit'
                  )}
                </button>

                {error && (
                  <div className="mt-10 p-8 bg-red-500/10 border border-red-500/20 rounded-[2.5rem] flex gap-5 items-start text-red-100 relative z-10 animate-in slide-in-from-top-4">
                    <AlertTriangle className="w-6 h-6 shrink-0 text-red-500 mt-1" />
                    <p className="text-xs font-bold leading-relaxed">{error}</p>
                  </div>
                )}

                {result && (
                  <div className="mt-16 space-y-12 animate-in slide-in-from-bottom-10 duration-700 relative z-10">
                    <div className="grid grid-cols-2 gap-8">
                      <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 backdrop-blur-3xl transition-all hover:bg-white/15">
                        <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest mb-4">Neural Success</p>
                        <div className="flex items-baseline gap-3">
                           <p className="text-6xl font-black text-green-400 tracking-tighter">{result.stats.passed}</p>
                           <span className="text-xs font-black text-green-400/60 uppercase">OK</span>
                        </div>
                      </div>
                      <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 backdrop-blur-3xl transition-all hover:bg-white/15">
                        <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest mb-4">Audit Failures</p>
                        <div className="flex items-baseline gap-3">
                           <p className="text-6xl font-black text-red-500 tracking-tighter">{result.stats.failed}</p>
                           <span className="text-xs font-black text-red-500/60 uppercase">ERR</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 space-y-6">
                       <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-[0.25em]">
                          <span className="text-slate-300">Category Logic</span>
                          <span className={result.stats.catErrors === 0 ? 'text-green-400' : 'text-red-400'}>{result.stats.catErrors === 0 ? 'Optimal' : result.stats.catErrors + ' Errors'}</span>
                       </div>
                       <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-[0.25em]">
                          <span className="text-slate-300">Attribute Sync</span>
                          <span className={result.stats.valErrors === 0 ? 'text-green-400' : 'text-red-400'}>{result.stats.valErrors === 0 ? 'Optimal' : result.stats.valErrors + ' Errors'}</span>
                       </div>
                    </div>

                    <button
                      onClick={() => exportToExcel(result)}
                      className={`w-full py-8 rounded-[2.5rem] font-black text-[14px] uppercase tracking-[0.3em] flex items-center justify-center gap-4 transition-all shadow-2xl active:scale-95 group ${theme === 'dark' ? 'bg-white text-slate-900 hover:bg-slate-100' : 'bg-white text-[#0F172A] hover:bg-slate-50'}`}
                    >
                      <Download className="w-6 h-6 transition-transform group-hover:translate-y-1.5" /> Export Audit Log
                    </button>
                  </div>
                )}
              </div>

              <div className={`p-12 rounded-[3.5rem] border transition-all duration-500 relative overflow-hidden ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-xl'}`}>
                <div className="flex items-center gap-4 mb-12">
                  <div className="w-3 h-3 rounded-full bg-blue-600 animate-pulse shadow-[0_0_10px_rgba(37,99,235,0.8)]"></div>
                  <h4 className={`text-xs font-black uppercase tracking-[0.5em] ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Audit Protocol</h4>
                </div>
                <div className="space-y-12">
                  {[
                    { t: 'Smart Name Isolation', d: 'Filters target string names only, ignoring ID columns for accuracy.' },
                    { t: 'Dynamic Hierarchy Link', d: 'The 1st category segment dictates recursive attribute rules.' },
                    { t: 'Submission Protocol', d: 'Success status is reserved for articles with zero violations.' },
                    { t: 'Delimiter Strictness', d: 'Validation for pipes with strict zero-whitespace policy.' }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-8">
                      <div className={`text-[13px] font-black w-12 h-12 flex items-center justify-center rounded-2xl shrink-0 border ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>0{i+1}</div>
                      <div>
                        <p className={`text-[14px] font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{item.t}</p>
                        <p className={`text-[11px] leading-normal mt-3 font-bold uppercase tracking-[0.1em] ${theme === 'dark' ? 'text-slate-200' : 'text-slate-500'}`}>{item.d}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className={`transition-all duration-500 border-t py-16 px-16 flex flex-col lg:flex-row justify-between items-center gap-12 ${theme === 'dark' ? 'bg-[#05070A]/60 border-slate-800 shadow-inner' : 'bg-white border-slate-100'}`}>
        <div className="flex items-center gap-6 group">
           <div className="w-4 h-4 rounded-full bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,1)] group-hover:scale-125 transition-transform"></div>
           <span className="text-[11px] font-black uppercase tracking-[0.6em] text-slate-400 group-hover:text-blue-400 transition-colors">Neural Stream Optimal</span>
        </div>
        
        <div className="flex flex-col md:flex-row gap-12 items-center">
          <div className="flex gap-4">
            {socials.map((s, idx) => (
              <a 
                key={idx} 
                href={s.href} 
                target="_blank" 
                rel="noopener noreferrer"
                className={`p-4 rounded-2xl transition-all hover:scale-110 active:scale-95 border shadow-lg group ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-100 hover:text-blue-400 hover:border-blue-500/50' : 'bg-white border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200'}`}
              >
                <s.icon className="w-5 h-5" />
              </a>
            ))}
          </div>
          <div className={`hidden md:block h-12 w-px ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
          <div className="text-center md:text-left">
            <p className={`text-[11px] font-black uppercase tracking-[0.5em] ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>© 2025 <span className="text-blue-500">NITIN PAL</span></p>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-8 lg:gap-14 text-[11px] font-black uppercase tracking-[0.5em]">
           <button 
             onClick={() => window.open('https://github.com/nitinpal90', '_blank')} 
             className="hover:text-blue-500 cursor-pointer transition-all flex items-center gap-2"
           >
             GITHUB AUDIT <ExternalLink className="w-3 h-3" />
           </button>
           <button 
             onClick={() => window.open('https://bento.me/lynxnitin', '_blank')} 
             className="hover:text-blue-500 cursor-pointer transition-all flex items-center gap-2"
           >
             PERSONAL PORTFOLIO <ExternalLink className="w-3 h-3" />
           </button>
        </div>
      </footer>
    </div>
  );
};

export default App;
