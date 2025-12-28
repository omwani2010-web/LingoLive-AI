
import React from 'react';

interface SessionControlsProps {
  isActive: boolean;
  onStart: () => void;
  onStop: () => void;
  isLoading: boolean;
}

const SessionControls: React.FC<SessionControlsProps> = ({ isActive, onStart, onStop, isLoading }) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="relative">
        {/* Pulsing ring for active state */}
        {isActive && (
          <div className="absolute inset-0 rounded-full bg-indigo-400 animate-ping opacity-25"></div>
        )}
        
        <button
          onClick={isActive ? onStop : onStart}
          disabled={isLoading}
          className={`
            relative z-10 w-24 h-24 rounded-full flex items-center justify-center
            transition-all duration-300 transform hover:scale-110 active:scale-95
            ${isActive 
              ? 'bg-rose-500 shadow-lg shadow-rose-200' 
              : 'bg-indigo-600 shadow-lg shadow-indigo-200 hover:bg-indigo-700'}
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          aria-label={isActive ? "Stop Listening" : "Start Listening"}
        >
          {isLoading ? (
            <svg className="animate-spin h-10 w-10 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : isActive ? (
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          )}
        </button>
      </div>
      
      <div className="text-center">
        <p className={`text-sm font-bold tracking-wide uppercase transition-colors duration-300 ${isActive ? 'text-rose-500' : 'text-slate-600'}`}>
          {isLoading ? 'Connecting...' : isActive ? 'Listening...' : 'Tap to Listen'}
        </p>
        <p className="text-[11px] text-slate-400 mt-1">
          {isActive ? 'Click to stop session' : 'Start real-time voice practice'}
        </p>
      </div>
    </div>
  );
};

export default SessionControls;
