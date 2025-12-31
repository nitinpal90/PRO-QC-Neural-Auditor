import React, { useRef, useState } from 'react';
import { Upload, FileCheck, X, FileSearch } from 'lucide-react';

interface Props {
  label: string;
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  accept?: string;
  description?: string;
  theme?: 'light' | 'dark';
}

const FileUploadZone: React.FC<Props> = ({ label, onFileSelect, selectedFile, accept = ".xlsx, .xls", description, theme = 'light' }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inputRef.current) inputRef.current.value = '';
    onFileSelect(null as any);
  };

  const isDark = theme === 'dark';

  return (
    <div 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => inputRef.current?.click()}
      className={`relative group cursor-pointer border-2 border-dashed rounded-[2.5rem] p-8 transition-all duration-500 flex flex-col items-center justify-center text-center overflow-hidden
        ${selectedFile 
          ? (isDark ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_50px_rgba(59,130,246,0.2)]' : 'border-green-400 bg-green-50 shadow-xl shadow-green-200/50')
          : (isDark 
              ? 'border-slate-800 bg-slate-900/40 hover:border-blue-500/50 hover:bg-blue-500/5 hover:shadow-2xl' 
              : 'border-slate-200 bg-slate-50/50 hover:border-blue-400 hover:bg-white hover:shadow-xl'
            )
        }`}
    >
      <input 
        type="file" 
        ref={inputRef} 
        className="hidden" 
        accept={accept}
        onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
      />

      {isHovered && !selectedFile && <div className="absolute inset-0 scan-line pointer-events-none"></div>}
      
      {selectedFile ? (
        <div className="animate-in fade-in zoom-in duration-500 flex flex-col items-center">
          <div className={`${isDark ? 'bg-blue-500/30' : 'bg-green-100'} p-5 rounded-2xl mb-4 relative`}>
             <FileCheck className={`w-10 h-10 ${isDark ? 'text-blue-300' : 'text-green-600'}`} />
             <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#05070A] animate-pulse"></div>
          </div>
          <p className={`text-[13px] font-black truncate max-w-[200px] tracking-tight mb-1 ${isDark ? 'text-white' : 'text-green-900'}`}>
            {selectedFile.name}
          </p>
          <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-blue-400/80' : 'text-green-600/70'}`}>Authority Link Active</p>
          <button 
            onClick={handleClear}
            className={`absolute top-4 right-4 p-2 rounded-xl transition-all active:scale-90 ${isDark ? 'bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700' : 'bg-red-100 hover:bg-red-200 text-red-600'}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <div className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} p-5 rounded-2xl mb-4 group-hover:bg-blue-600 group-hover:border-blue-400 shadow-xl transition-all duration-500 border`}>
            <Upload className={`w-8 h-8 transition-colors duration-500 ${isDark ? 'text-slate-400 group-hover:text-white' : 'text-slate-500 group-hover:text-white'}`} />
          </div>
          <p className={`text-[12px] font-black tracking-tight mb-2 uppercase ${isDark ? 'text-white' : 'text-slate-800'}`}>{label}</p>
          <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-slate-700 group-hover:bg-blue-400 transition-colors"></div>
             <p className={`text-[9px] uppercase font-black tracking-[0.15em] transition-colors duration-500 ${isDark ? 'text-slate-500 group-hover:text-blue-400' : 'text-slate-400 group-hover:text-blue-500'}`}>
                {description || "Click to link master"}
             </p>
          </div>
        </>
      )}
    </div>
  );
};

export default FileUploadZone;