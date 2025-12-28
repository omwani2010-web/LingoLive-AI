
import React from 'react';
import { TranscriptionEntry } from '../types';

interface ConversationHistoryProps {
  entries: TranscriptionEntry[];
}

const ConversationHistory: React.FC<ConversationHistoryProps> = ({ entries }) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  return (
    <div className="flex-1 min-h-0 flex flex-col mt-6 border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
        <h3 className="text-sm font-semibold text-slate-700">Live Transcription</h3>
        <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold uppercase">Real-time</span>
      </div>
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
      >
        {entries.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 opacity-50">
             <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm">Speak to see the transcript here...</p>
          </div>
        ) : (
          entries.map((entry) => (
            <div 
              key={entry.id} 
              className={`flex flex-col ${entry.type === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div 
                className={`
                  max-w-[85%] px-4 py-2 rounded-2xl text-sm
                  ${entry.type === 'user' 
                    ? 'bg-emerald-50 text-emerald-900 rounded-tr-none border border-emerald-100' 
                    : 'bg-indigo-50 text-indigo-900 rounded-tl-none border border-indigo-100'}
                `}
              >
                {entry.text}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 mx-1">
                {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ConversationHistory;
