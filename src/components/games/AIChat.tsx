import { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, RefreshCw, ChevronLeft, PlayCircle, Trash2 } from 'lucide-react';
import { ai } from '../../utils/ai';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  pinyin?: string;
  translation?: string;
  correction?: string | null; // If user made a mistake (nullable)
  audio?: boolean; // Can play audio?
}

const SCENARIOS = [
  { id: 'cafe', title: 'Ordering Coffee', icon: '☕', prompt: 'You are a barista in a Beijing coffee shop. I am a customer. Ask me what I want to drink.' },
  { id: 'taxi', title: 'Taking a Taxi', icon: '🚕', prompt: 'You are a taxi driver in Shanghai. I just got in. Ask me where I want to go.' },
  { id: 'market', title: 'Bargaining', icon: '🛍️', prompt: 'You are a seller at a market selling clothes. I want to buy a t-shirt but it is too expensive. Start by welcoming me.' },
  { id: 'intro', title: 'Self Introduction', icon: '👋', prompt: 'You are a new friend I just met at a university in China. Start by introducing yourself and asking my name.' },
  { id: 'doctor', title: 'Seeing a Doctor', icon: '🩺', prompt: 'You are a doctor. I am a patient coming in with a headache. Ask me symptoms.' }
];

export default function AIChat() {
  const [scenario, setScenario] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [explainingId, setExplainingId] = useState<number | null>(null); // Track which message is being explained
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load history on scenario change
  useEffect(() => {
    if (scenario) {
      const saved = localStorage.getItem(`anki-chat-${scenario}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.length > 0) {
            setMessages(parsed);
            return;
          }
        } catch (e) {
          console.error('Failed to parse chat history', e);
        }
      }
      // If we reach here, no valid history exists
      setMessages([]); 
      startScenario(scenario); 
    }
  }, [scenario]);

  const resetScenario = () => {
    if (confirm("Clear conversation history?")) {
      localStorage.removeItem(`anki-chat-${scenario}`);
      // Force a complete clear before restarting
      setMessages([]);
      // Small timeout to ensure state/storage is cleared before re-initializing
      setTimeout(() => {
        startScenario(scenario!);
      }, 10);
    }
  };

  const startScenario = async (sId: string) => {
    const selected = SCENARIOS.find(s => s.id === sId);
    if (!selected) return;
    
    // If we already have messages loaded for this scenario (via useEffect or state), DON'T reset.
    // BUT this function is called when NO history exists (by useEffect) OR by user reset.
    // The issue: user clicks button -> calls startScenario -> resets state -> generates new.
    // We need to rely on the useEffect to handle the "Load or Start" logic.
    
    // If called directly (e.g. by button click in menu), we should check storage first to avoid overwrite.
    const saved = localStorage.getItem(`anki-chat-${sId}`);
    if (saved) {
       try {
         const parsed = JSON.parse(saved);
         if (parsed.length > 0) {
            setScenario(sId);
            setMessages(parsed);
            return; // Stop here, don't generate new
         }
       } catch (e) {}
    }

    setScenario(sId); 
    setIsLoading(true);

    // Initial AI Turn
    const prompt = `Act as a roleplay partner. 
    Scenario: ${selected.prompt}
    
    Please start the conversation.
    Return ONLY a JSON object:
    {
      "reply": "Chinese text",
      "pinyin": "Pinyin with tones",
      "translation": "English translation"
    }`;

    const response = await ai.chat([{ role: "user", content: prompt }], true);
    
    if (response.success && response.data) {
      try {
         const json = JSON.parse(response.data.substring(response.data.indexOf('{'), response.data.lastIndexOf('}') + 1));
         const initialMsg: Message = { 
           role: 'assistant', 
           content: json.reply, 
           pinyin: json.pinyin, 
           translation: json.translation 
         };
         
         // Ensure we are setting state fresh
         setMessages([initialMsg]);
         localStorage.setItem(`anki-chat-${sId}`, JSON.stringify([initialMsg]));
      } catch (e) {
        console.error(e);
        setMessages([{ role: 'assistant', content: "你好！(Error parsing AI response)" }]);
      }
    }
    setIsLoading(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setInput('');
    
    // Optimistic Update
    const tempMsgs: Message[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(tempMsgs);
    // Save user message
    localStorage.setItem(`anki-chat-${scenario}`, JSON.stringify(tempMsgs));
    setIsLoading(true);

    const selected = SCENARIOS.find(s => s.id === scenario);
    const context = tempMsgs.map(m => `${m.role}: ${m.content}`).join('\n');

    const prompt = `Roleplay Context: ${selected?.prompt}
    
    History:
    ${context}
    
    User just said: "${userMsg}"

    Task:
    1. Analyze user's input for grammar/vocab mistakes.
    2. Reply naturally to continue the roleplay.
    
    Return ONLY JSON:
    {
      "reply": "Your Chinese reply",
      "pinyin": "Reply pinyin",
      "translation": "Reply translation",
      "correction": "Optional: If user made a mistake, provide the corrected sentence here INCLUDING Pinyin. Example: 'Correct: 我想喝咖啡 (Wǒ xiǎng hē kāfēi)'. If perfect, return null."
    }`;

    const response = await ai.chat([{ role: "user", content: prompt }], true);

    if (response.success && response.data) {
      try {
        const json = JSON.parse(response.data.substring(response.data.indexOf('{'), response.data.lastIndexOf('}') + 1));
        
        // Update user message with correction if needed
        if (json.correction && json.correction !== "null" && json.correction !== "None") {
            tempMsgs[tempMsgs.length - 1].correction = json.correction;
        }

        // Add assistant reply
        const newMsgs: Message[] = [...tempMsgs, {
            role: 'assistant',
            content: json.reply,
            pinyin: json.pinyin,
            translation: json.translation
        }];
        
        setMessages(newMsgs);
        // Save updated conversation
        localStorage.setItem(`anki-chat-${scenario}`, JSON.stringify(newMsgs));

      } catch (e) {
        console.error(e);
      }
    }
    setIsLoading(false);
  };

  const explainCorrection = async (index: number, correction: string, original: string) => {
    setExplainingId(index);
    
    const prompt = `Explain clearly and concisely why the sentence:
    "${original}"
    
    Is better corrected as:
    "${correction}"
    
    Focus on grammar, word choice, or naturalness. Keep it brief (1-2 sentences).`;

    const response = await ai.chat([{ role: "user", content: prompt }]);
    
    if (response.success && response.data) {
        alert(`👨‍🏫 Teacher says:\n\n${response.data}`);
    } else {
        alert("Couldn't get an explanation right now.");
    }
    setExplainingId(null);
  };

  const speak = (text: string) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
    window.speechSynthesis.speak(u);
  };

  if (!scenario) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">AI Chat Tutor</h2>
          <p className="text-gray-600">Choose a scenario to practice real conversations.</p>
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          {SCENARIOS.map(s => (
            <button
              key={s.id}
              onClick={() => startScenario(s.id)}
              className="p-6 bg-white border-2 border-indigo-50 hover:border-indigo-500 rounded-xl shadow-sm text-left transition-all hover:-translate-y-1 group"
            >
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform origin-left">{s.icon}</div>
              <h3 className="font-bold text-gray-800 text-lg">{s.title}</h3>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    // Mobile: Full screen fixed overlay. Desktop: Card style.
    <div className="fixed inset-0 z-50 bg-white sm:static sm:z-auto sm:rounded-xl sm:shadow-sm sm:border sm:border-gray-200 sm:h-[600px] flex flex-col">
      
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between bg-white sm:rounded-t-xl shadow-sm z-10">
        <button onClick={() => setScenario(null)} className="text-gray-500 hover:text-gray-800 flex items-center gap-1">
          <ChevronLeft className="w-5 h-5" /> <span className="sm:inline hidden">Scenarios</span><span className="sm:hidden">Back</span>
        </button>
        <span className="font-bold text-gray-700 truncate px-2">
            {SCENARIOS.find(s => s.id === scenario)?.icon} {SCENARIOS.find(s => s.id === scenario)?.title}
        </span>
        <button onClick={resetScenario} className="text-gray-400 hover:text-red-500 p-2" title="Restart Chat">
            <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 scroll-smooth" ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} animate-fade-in`}>
             
             {/* Bubble */}
             <div className={`max-w-[85%] sm:max-w-[75%] p-3 sm:p-4 rounded-2xl shadow-sm relative group text-base
               ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'}
             `}>
                <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                
                {/* AI Extras */}
                {m.role === 'assistant' && (
                    <div className="mt-2 pt-2 border-t border-gray-100 text-sm">
                        <div className="text-gray-500 mb-1 font-medium">{m.pinyin}</div>
                        <div className="text-gray-400 italic text-xs">{m.translation}</div>
                    </div>
                )}
                
                {/* Audio Button */}
                <button 
                    onClick={() => speak(m.content)}
                    className={`absolute -right-10 top-2 p-2 rounded-full sm:opacity-0 sm:group-hover:opacity-100 transition-opacity ${m.role === 'user' ? 'text-gray-300' : 'text-gray-400 hover:text-indigo-600'}`}
                >
                    <PlayCircle className="w-6 h-6" />
                </button>
             </div>

             {/* Correction Bubble */}
             {m.correction && (
                <button 
                    onClick={() => explainCorrection(i, m.correction!, m.content)}
                    disabled={explainingId === i}
                    className="mt-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-lg flex items-start gap-2 animate-slide-up max-w-[90%] hover:bg-amber-100 transition-colors cursor-help text-left shadow-sm"
                >
                    {explainingId === i ? <RefreshCw className="w-4 h-4 animate-spin mt-0.5" /> : <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                    <div>
                        <span className="font-bold block mb-0.5">Correction Available:</span>
                        {m.correction}
                        <div className="text-[10px] opacity-60 mt-1 font-medium uppercase tracking-wide">Tap to explain</div>
                    </div>
                </button>
             )}
          </div>
        ))}
        {isLoading && (
             <div className="flex justify-start">
                 <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-gray-200 flex gap-2 items-center text-gray-400 text-sm">
                     <RefreshCw className="w-4 h-4 animate-spin" />
                     <span>Typing...</span>
                 </div>
             </div>
        )}
        <div className="h-2" /> {/* Spacer */}
      </div>

      {/* Input Area */}
      <div className="p-3 sm:p-4 border-t bg-white sm:rounded-b-xl pb-safe">
        <div className="flex gap-2 items-end">
            <textarea 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                  }
              }}
              placeholder="Type in Chinese..."
              className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none max-h-32 min-h-[44px]"
              disabled={isLoading}
              rows={1}
            />
            <button 
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm flex-shrink-0 h-[44px] w-[44px] flex items-center justify-center"
            >
                <Send className="w-5 h-5" />
            </button>
        </div>
      </div>
    </div>
  );
}

