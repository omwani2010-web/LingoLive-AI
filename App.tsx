
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { LANGUAGES, SCENARIOS } from './constants';
import { Language, Scenario, TranscriptionEntry } from './types';
import { decode, decodeAudioData, createBlob } from './services/audioUtils';
import Visualizer from './components/Visualizer';
import SessionControls from './components/SessionControls';
import ConversationHistory from './components/ConversationHistory';

const App: React.FC = () => {
  const [selectedLang, setSelectedLang] = useState<Language>(LANGUAGES[0]);
  const [selectedScenario, setSelectedScenario] = useState<Scenario>(SCENARIOS[0]);
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transcriptions, setTranscriptions] = useState<TranscriptionEntry[]>([]);
  
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);

  // Refs for audio handling
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  // Transcription buffer refs
  const currentInputTranscription = useRef('');
  const currentOutputTranscription = useRef('');

  const stopSession = useCallback(() => {
    setIsActive(false);
    setIsLoading(false);
    setIsUserSpeaking(false);
    setIsModelSpeaking(false);

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextInRef.current) {
      audioContextInRef.current.close();
      audioContextInRef.current = null;
    }
    if (audioContextOutRef.current) {
      audioContextOutRef.current.close();
      audioContextOutRef.current = null;
    }
    
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then(session => {
        try { session.close(); } catch(e) {}
      });
      sessionPromiseRef.current = null;
    }

    activeSourcesRef.current.forEach(source => {
      try { source.stop(); } catch(e) {}
    });
    activeSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  }, []);

  const startSession = async () => {
    setIsLoading(true);
    setTranscriptions([]);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      audioContextInRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextOutRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const systemInstruction = `
        You are an expert language tutor for the ${selectedLang.name} language.
        Scenario: ${selectedScenario.title}. 
        Specific Instruction: ${selectedScenario.instruction}.
        Your goal is to help the user learn through conversation.
        Always reply in ${selectedLang.name} unless the user seems very stuck, then provide a brief English hint or translation.
        Keep responses concise and encourage the user to speak more.
        Correct their grammar mistakes gently.
      `;

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setIsLoading(false);
            
            const source = audioContextInRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextInRef.current!.createScriptProcessor(4096, 1, 1);
            processorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromiseRef.current?.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextInRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              currentInputTranscription.current += message.serverContent.inputTranscription.text;
              setIsUserSpeaking(true);
            }
            if (message.serverContent?.outputTranscription) {
              currentOutputTranscription.current += message.serverContent.outputTranscription.text;
              setIsModelSpeaking(true);
            }

            if (message.serverContent?.turnComplete) {
              const uText = currentInputTranscription.current;
              const mText = currentOutputTranscription.current;
              
              if (uText) {
                setTranscriptions(prev => [...prev, { id: Math.random().toString(), type: 'user', text: uText, timestamp: Date.now() }]);
              }
              if (mText) {
                setTranscriptions(prev => [...prev, { id: Math.random().toString(), type: 'model', text: mText, timestamp: Date.now() }]);
              }

              currentInputTranscription.current = '';
              currentOutputTranscription.current = '';
              setIsUserSpeaking(false);
              setIsModelSpeaking(false);
            }

            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && audioContextOutRef.current) {
              const ctx = audioContextOutRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              
              source.onended = () => {
                activeSourcesRef.current.delete(source);
                if (activeSourcesRef.current.size === 0) {
                  setIsModelSpeaking(false);
                }
              };

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              activeSourcesRef.current.add(source);
              setIsModelSpeaking(true);
            }

            if (message.serverContent?.interrupted) {
              activeSourcesRef.current.forEach(s => {
                try { s.stop(); } catch(e) {}
              });
              activeSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsModelSpeaking(false);
            }
          },
          onerror: (err) => {
            console.error('Session Error:', err);
            stopSession();
          },
          onclose: () => {
            stopSession();
          },
        },
      });
    } catch (err) {
      console.error('Failed to start session:', err);
      setIsLoading(false);
      stopSession();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col h-screen max-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-800 tracking-tight leading-none">LingoLive AI</h1>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-1">Real-time Language Tutor</p>
          </div>
        </div>
        
        <div className="flex space-x-4">
          <select 
            disabled={isActive || isLoading}
            value={selectedLang.code}
            onChange={(e) => setSelectedLang(LANGUAGES.find(l => l.code === e.target.value)!)}
            className="text-sm border-none bg-slate-100 rounded-lg px-3 py-2 font-medium focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
          >
            {LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.flag} {lang.name}</option>
            ))}
          </select>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col md:flex-row p-4 md:p-8 gap-6 overflow-hidden">
        
        {/* Settings & Interaction Column */}
        <div className="w-full md:w-1/3 flex flex-col space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="font-bold text-slate-800 flex items-center text-sm uppercase tracking-wider">
              <span className="mr-2 opacity-70">🎯</span> Practice Topic
            </h2>
            <div className="grid grid-cols-1 gap-2">
              {SCENARIOS.map(sc => (
                <button
                  key={sc.id}
                  disabled={isActive || isLoading}
                  onClick={() => setSelectedScenario(sc)}
                  className={`
                    text-left p-3 rounded-2xl border transition-all duration-200
                    ${selectedScenario.id === sc.id 
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                      : 'bg-white border-slate-100 hover:border-slate-200 text-slate-600'}
                    ${isActive || isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <div className="flex items-center">
                    <span className="text-xl mr-3">{sc.icon}</span>
                    <div>
                      <h4 className="font-bold text-sm leading-none">{sc.title}</h4>
                      <p className={`text-[10px] mt-1 leading-tight ${selectedScenario.id === sc.id ? 'text-indigo-100' : 'text-slate-400'}`}>
                        {sc.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-between">
            <div className="w-full flex justify-center py-4">
              <Visualizer 
                isActive={isActive} 
                isModelSpeaking={isModelSpeaking} 
                isUserSpeaking={isUserSpeaking} 
              />
            </div>
            
            <div className="w-full py-6">
              <SessionControls 
                isActive={isActive} 
                isLoading={isLoading} 
                onStart={startSession} 
                onStop={stopSession} 
              />
            </div>
          </div>
        </div>

        {/* Conversation History Column */}
        <div className="flex-1 flex flex-col h-full min-h-0">
          <ConversationHistory entries={transcriptions} />
          
          <div className="mt-4 p-5 bg-indigo-900 rounded-3xl text-white shadow-xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-700">
               <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 20 20">
                 <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
               </svg>
             </div>
             <div className="relative z-10">
               <h4 className="font-bold text-indigo-300 text-[10px] uppercase tracking-[0.2em] mb-2">Tutor Insight</h4>
               <p className="text-sm text-indigo-50 leading-relaxed font-medium">
                 "{selectedScenario.instruction.split('.')[0]}."
               </p>
               <div className="mt-3 flex items-center text-xs text-indigo-200">
                 <span className="w-2 h-2 bg-indigo-400 rounded-full mr-2"></span>
                 Pro tip: Use "{selectedLang.code === 'es' ? 'gracias' : selectedLang.code === 'fr' ? 'merci' : 'thank you'}" to be polite!
               </div>
             </div>
          </div>
        </div>
      </main>
      
      {/* Footer Info */}
      <footer className="px-6 py-4 bg-white border-t border-slate-200 text-[10px] text-slate-400 flex justify-between items-center font-medium">
        <p>© 2024 LINGO LIVE • GEMINI POWERED</p>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
            <span>API ACTIVE</span>
          </div>
          <div className="h-4 w-[1px] bg-slate-200"></div>
          <span>STABLE v1.0</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
