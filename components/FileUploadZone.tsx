import React, { useRef, useState } from 'react';
import { Upload, FileCheck, X } from 'lucide-react';

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
      className={`relative group cursor-pointer border-2 border-dashed rounded-3xl p-6 transition-all duration-300 flex flex-col items-center justify-center text-center
        ${selectedFile 
          ? (isDark ? 'border-blue-500 bg-blue-500/10' : 'border-emerald-400 bg-emerald-50')
          : (isDark 
              ? 'border-slate-800 bg-slate-900/40 hover:border-blue-500/50 hover:bg-blue-500/5' 
              : 'border-slate-200 bg-slate-50/50 hover:border-blue-400 hover:bg-white shadow-sm'
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

      {isHovered && !selectedFile && <div className="absolute inset-0 scan-line pointer-events-none opacity-20"></div>}
      
      {selectedFile ? (
        <div className="animate-in fade-in zoom-in duration-300 flex flex-col items-center">
          <div className={`${isDark ? 'bg-blue-500/30' : 'bg-emerald-100'} p-3 rounded-xl mb-3`}>
             <FileCheck className={`w-6 h-6 ${isDark ? 'text-blue-300' : 'text-emerald-600'}`} />
          </div>
          <p className={`text-[11px] font-bold truncate max-w-[150px] tracking-tight mb-0.5 ${isDark ? 'text-white' : 'text-emerald-900'}`}>
            {selectedFile.name}
          </p>
          <p className={`text-[8px] font-black uppercase tracking-widest ${isDark ? 'text-blue-400/80' : 'text-emerald-600/70'}`}>Active</p>
          <button 
            onClick={handleClear}
            className={`absolute top-3 right-3 p-1.5 rounded-lg transition-all ${isDark ? 'bg-slate-800 text-slate-400 hover:text-red-400' : 'bg-red-100 text-red-600'}`}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <>
          <div className={`${isDark ? 'bg-slate-800' : 'bg-white shadow-sm'} p-3 rounded-xl mb-3 group-hover:bg-blue-600 transition-all border border-transparent ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
            <Upload className={`w-5 h-5 transition-colors ${isDark ? 'text-slate-400 group-hover:text-white' : 'text-slate-500 group-hover:text-white'}`} />
          </div>
          <p className={`text-[11px] font-black tracking-tight mb-1 uppercase ${isDark ? 'text-white' : 'text-slate-800'}`}>{label}</p>
          <p className={`text-[8px] uppercase font-bold tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
             {description || "Link Excel"}
          </p>
        </>
      )}
    </div>
  );
};

export default FileUploadZone;