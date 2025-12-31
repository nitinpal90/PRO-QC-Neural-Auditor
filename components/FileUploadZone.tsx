
import React, { useRef } from 'react';
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

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inputRef.current) inputRef.current.value = '';
    onFileSelect(null as any);
  };

  const isDark = theme === 'dark';

  return (
    <div 
      onClick={() => inputRef.current?.click()}
      className={`relative group cursor-pointer border-2 border-dashed rounded-[2rem] p-8 transition-all duration-500 flex flex-col items-center justify-center text-center
        ${selectedFile 
          ? (isDark ? 'border-green-500/50 bg-green-500/10 shadow-[0_0_40px_rgba(34,197,94,0.1)]' : 'border-green-400 bg-green-50 shadow-xl shadow-green-200/50')
          : (isDark 
              ? 'border-slate-700 bg-slate-800/30 hover:border-blue-500/50 hover:bg-blue-500/5 hover:shadow-2xl' 
              : 'border-slate-200 bg-slate-50/50 hover:border-blue-400 hover:bg-white hover:shadow-xl hover:shadow-blue-200/50'
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
      
      {selectedFile ? (
        <>
          <div className={`${isDark ? 'bg-green-500/30' : 'bg-green-100'} p-4 rounded-2xl mb-4 animate-in zoom-in duration-300`}>
            <FileCheck className={`w-8 h-8 ${isDark ? 'text-green-300' : 'text-green-600'}`} />
          </div>
          <p className={`text-[13px] font-black truncate max-w-full tracking-tight mb-1 ${isDark ? 'text-white' : 'text-green-900'}`}>
            {selectedFile.name}
          </p>
          <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-green-400/70' : 'text-green-600/70'}`}>Success Verified</p>
          <button 
            onClick={handleClear}
            className={`absolute top-4 right-4 p-2 rounded-xl transition-all active:scale-90 ${isDark ? 'bg-red-500/20 hover:bg-red-500/40 text-red-300' : 'bg-red-100 hover:bg-red-200 text-red-600'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </>
      ) : (
        <>
          <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} p-4 rounded-2xl mb-4 group-hover:bg-blue-600 group-hover:shadow-2xl transition-all duration-500 shadow-lg border border-transparent group-hover:border-blue-400/20`}>
            <Upload className={`w-8 h-8 transition-colors duration-500 ${isDark ? 'text-slate-300 group-hover:text-white' : 'text-slate-500 group-hover:text-white'}`} />
          </div>
          <p className={`text-sm font-black tracking-tight mb-2 uppercase ${isDark ? 'text-white' : 'text-slate-800'}`}>{label}</p>
          {description && (
            <p className={`text-[10px] uppercase font-black tracking-[0.2em] px-4 transition-colors duration-500 ${isDark ? 'text-slate-300 group-hover:text-blue-400' : 'text-slate-400 group-hover:text-blue-500'}`}>
              {description}
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default FileUploadZone;
