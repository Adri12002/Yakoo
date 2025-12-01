import { useState, useEffect } from 'react';
import { BookOpen, RefreshCw, Plus, Type, Play, Pause, CheckCircle, AlertCircle, HelpCircle, Save, Trash2, List, ChevronLeft, ArrowRight } from 'lucide-react';
import { storage, SavedStory } from '../../utils/storage';
import { ai } from '../../utils/ai';
import { Card } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../../contexts/AuthContext';

interface StoryWord {
  hanzi: string;
  pinyin: string;
  translation: string;
  type: 'known' | 'struggle' | 'new';
}

interface StorySentence {
  id: string;
  text: string;
  translation: string;
  words: StoryWord[];
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

interface Story {
  title: string;
  sentences: StorySentence[];
  quiz: QuizQuestion[];
}

export default function StoryReader() {
  const { user } = useAuth();
  const [status, setStatus] = useState<'start' | 'loading' | 'reading' | 'quiz'>('start');
  const [story, setStory] = useState<Story | null>(null);
  const [currentStoryId, setCurrentStoryId] = useState<string | null>(null); // ID if saved/loaded
  const [showPinyin, setShowPinyin] = useState(false);
  const [selectedWord, setSelectedWord] = useState<StoryWord | null>(null);
  const [focusedSentence, setFocusedSentence] = useState<StorySentence | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState<number>(-1);
  
  // Quiz State
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Library State
  const [showLibrary, setShowLibrary] = useState(false);
  const [savedStories, setSavedStories] = useState<SavedStory[]>([]);

  useEffect(() => {
    setSavedStories(storage.getStories());
  }, []);

  const generateStory = async () => {
    setStatus('loading');
    setShowLibrary(false);
    setCurrentStoryId(null); // New story is not saved yet
    const allCards = storage.getCards();
    
    if (allCards.length < 10) {
      alert("You need at least 10 words to generate a story.");
      setStatus('start');
      return;
    }

    const struggleWords = allCards
      .filter(c => (c.srsDifficulty > 6 || c.srsStability < 3))
      .sort(() => 0.5 - Math.random())
      .slice(0, 5)
      .map(c => c.hanzi);

    const knownWords = allCards
      .filter(c => !struggleWords.includes(c.hanzi))
      .sort(() => 0.5 - Math.random())
      .slice(0, 15)
      .map(c => c.hanzi);

    const prompt = `Write a short story (3-5 sentences) in Chinese suitable for a learner.
    
    Target Vocab (Struggle): ${struggleWords.join(', ')}
    Context Vocab (Known): ${knownWords.join(', ')}
    
    Return ONLY a JSON object with this exact structure:
    {
      "title": "Story Title",
      "sentences": [
        {
          "id": "s1",
          "text": "Full Chinese sentence.",
          "translation": "English/French translation of this sentence.",
          "words": [
            { "hanzi": "我", "pinyin": "wǒ", "translation": "I", "type": "known" },
            ...
          ]
        }
      ],
      "quiz": [
        {
          "question": "Question about the story in English?",
          "options": ["Option A", "Option B", "Option C"],
          "correctIndex": 0
        },
        {
          "question": "Another question?",
          "options": ["Option A", "Option B", "Option C"],
          "correctIndex": 1
        }
      ]
    }`;

    const response = await ai.chat([{ role: "user", content: prompt }], true);

    if (response.success && response.data) {
      try {
        const jsonStr = response.data.substring(response.data.indexOf('{'), response.data.lastIndexOf('}') + 1);
        const storyData = JSON.parse(jsonStr);
        // Ensure IDs are unique
        storyData.sentences = storyData.sentences.map((s: any, i: number) => ({
            ...s, 
            id: `s-${i}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }));
        
        setStory(storyData);
        setStatus('reading');
        setFocusedSentence(null);
        setSelectedWord(null);
        setIsPlaying(false);
        setCurrentSentenceIndex(-1);
        setQuizAnswers(new Array(storyData.quiz.length).fill(-1));
        setQuizSubmitted(false);
      } catch (e) {
        console.error(e);
        alert("Failed to parse story.");
        setStatus('start');
      }
    } else {
      alert(response.error || "AI generation failed.");
      setStatus('start');
    }
  };

  // --- Library Logic ---

  const saveCurrentStory = () => {
    if (!story) return;
    
    const storyId = currentStoryId || uuidv4();
    const savedStory: SavedStory = {
      id: storyId,
      date: new Date().toISOString(),
      title: story.title,
      data: story
    };

    storage.saveStory(savedStory, user?.uid);
    setSavedStories(storage.getStories());
    setCurrentStoryId(storyId);
    alert("Story saved to Library!");
  };

  const loadStory = (saved: SavedStory) => {
    setStory(saved.data);
    setCurrentStoryId(saved.id);
    setStatus('reading');
    setShowLibrary(false);
    setFocusedSentence(null);
    setSelectedWord(null);
    setIsPlaying(false);
    setCurrentSentenceIndex(-1);
    setQuizAnswers(new Array(saved.data.quiz.length).fill(-1));
    setQuizSubmitted(false);
  };

  const deleteStory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Delete this story?")) {
      storage.deleteStory(id, user?.uid);
      setSavedStories(storage.getStories());
      if (currentStoryId === id) {
        setCurrentStoryId(null);
        setStory(null);
        setStatus('start');
      }
    }
  };

  // --- Smart Interaction ---

  const handleWordClick = (word: StoryWord, sentence: StorySentence) => {
    setSelectedWord(word);
    setFocusedSentence(sentence);
  };

  const handleSentenceDoubleClick = (sentence: StorySentence) => {
    setFocusedSentence(sentence);
    setSelectedWord(null);
  };

  const handleAddCard = () => {
    if (!selectedWord) return;
    const newCard: Card = {
      id: uuidv4(),
      hanzi: selectedWord.hanzi,
      pinyin: selectedWord.pinyin,
      translation: selectedWord.translation,
      srsState: 'new',
      srsStability: 0,
      srsDifficulty: 5,
      srsDue: new Date().toISOString()
    };
    const allCards = storage.getCards();
    if (allCards.some(c => c.hanzi === newCard.hanzi)) {
      alert("Word already in deck!");
      return;
    }
    storage.saveCards([...allCards, newCard]);
    alert(`Added "${newCard.hanzi}" to your deck!`);
    setSelectedWord(null);
  };

  // --- Audiobook Logic ---

  const playStory = () => {
    if (!story) return;
    setIsPlaying(true);
    setCurrentSentenceIndex(0);
    speakSentence(0);
  };

  const speakSentence = (index: number) => {
    if (!story || index >= story.sentences.length) {
      setIsPlaying(false);
      setCurrentSentenceIndex(-1);
      return;
    }

    const sentence = story.sentences[index];
    setCurrentSentenceIndex(index);
    
    const utterance = new SpeechSynthesisUtterance(sentence.text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.9; 
    
    utterance.onend = () => {
      if (isPlaying) {
        speakSentence(index + 1);
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopStory = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setCurrentSentenceIndex(-1);
  };

  // --- Quiz Logic ---

  const submitQuiz = () => {
    setQuizSubmitted(true);
  };

  if (status === 'quiz' && story) {
    const score = quizAnswers.reduce((acc, ans, i) => acc + (ans === story.quiz[i].correctIndex ? 1 : 0), 0);
    
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <h2 className="text-2xl font-bold text-indigo-700 flex items-center gap-2 justify-center">
          <HelpCircle className="w-6 h-6" />
          Comprehension Check
        </h2>

        <div className="space-y-6">
          {story.quiz.map((q, qIndex) => (
            <div key={qIndex} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <p className="font-medium text-lg text-gray-800 mb-4">{q.question}</p>
              <div className="space-y-2">
                {q.options.map((opt, oIndex) => (
                  <button
                    key={oIndex}
                    disabled={quizSubmitted}
                    onClick={() => {
                      const newAns = [...quizAnswers];
                      newAns[qIndex] = oIndex;
                      setQuizAnswers(newAns);
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-colors flex items-center justify-between
                      ${quizAnswers[qIndex] === oIndex ? 'border-indigo-500 bg-indigo-50 text-indigo-900' : 'border-gray-200 hover:bg-gray-50'}
                      ${quizSubmitted && oIndex === q.correctIndex ? 'bg-green-100 border-green-500' : ''}
                      ${quizSubmitted && quizAnswers[qIndex] === oIndex && oIndex !== q.correctIndex ? 'bg-red-100 border-red-500' : ''}
                    `}
                  >
                    <span>{opt}</span>
                    {quizSubmitted && oIndex === q.correctIndex && <CheckCircle className="w-5 h-5 text-green-600" />}
                    {quizSubmitted && quizAnswers[qIndex] === oIndex && oIndex !== q.correctIndex && <AlertCircle className="w-5 h-5 text-red-600" />}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {quizSubmitted ? (
          <div className="text-center space-y-4">
            <div className="text-xl font-bold">
              Score: <span className={score === story.quiz.length ? 'text-green-600' : 'text-orange-600'}>{score} / {story.quiz.length}</span>
            </div>
            <button onClick={() => setStatus('reading')} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium">
              Back to Story
            </button>
            <button onClick={generateStory} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium ml-4">
              New Story
            </button>
          </div>
        ) : (
          <button 
            onClick={submitQuiz}
            disabled={quizAnswers.includes(-1)}
            className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Check Answers
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Library Sidebar Overlay */}
      {showLibrary && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={() => setShowLibrary(false)}>
          <div className="w-full max-w-sm bg-white h-full shadow-2xl p-6 overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <List className="w-5 h-5" /> My Library
              </h3>
              <button onClick={() => setShowLibrary(false)} className="text-gray-400 hover:text-gray-600">
                <ChevronLeft className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-3">
              {savedStories.length === 0 && (
                <p className="text-gray-400 text-center py-8">No saved stories yet.</p>
              )}
              {savedStories.map(s => (
                <div 
                  key={s.id} 
                  onClick={() => loadStory(s)}
                  className="p-4 border rounded-lg hover:bg-indigo-50 cursor-pointer group relative transition-colors border-gray-200"
                >
                  <h4 className="font-bold text-indigo-900">{s.title}</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(s.date).toLocaleDateString()}
                  </p>
                  <button 
                    onClick={(e) => deleteStory(s.id, e)}
                    className="absolute top-4 right-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm sticky top-4 z-40">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowLibrary(true)} className="text-gray-600 hover:text-indigo-600" title="Open Library">
              <List className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-bold text-indigo-700 hidden sm:block">Story Reader</h2>
          </div>
          
          {status === 'reading' && (
            <div className="flex items-center gap-2">
              <button 
                onClick={saveCurrentStory}
                className={`p-2 rounded-full transition-colors ${currentStoryId ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                title="Save Story"
              >
                {currentStoryId ? <CheckCircle className="w-5 h-5" /> : <Save className="w-5 h-5" />}
              </button>
              
              <div className="w-px h-6 bg-gray-200 mx-1"></div>

              <button 
                onClick={isPlaying ? stopStory : playStory}
                className={`p-2 rounded-full transition-colors ${isPlaying ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'}`}
                title={isPlaying ? "Stop Reading" : "Read Aloud"}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              <div className="bg-gray-100 p-1 rounded-lg flex">
                <button 
                  onClick={() => setShowPinyin(false)}
                  className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors ${!showPinyin ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}
                >
                  Hanzi
                </button>
                <button 
                  onClick={() => setShowPinyin(true)}
                  className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors ${showPinyin ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}
                >
                  + Pinyin
                </button>
              </div>
            </div>
          )}
        </div>

        {status === 'start' && (
          <div className="py-12 bg-white rounded-xl border border-indigo-100 shadow-sm text-center">
            <BookOpen className="w-16 h-16 text-indigo-300 mx-auto mb-4" />
            <p className="mb-6 text-gray-600 max-w-md mx-auto">Generate a unique story based on your vocabulary, or open your Library to read saved stories.</p>
            <div className="flex justify-center gap-4">
              <button onClick={() => setShowLibrary(true)} className="px-6 py-3 bg-white text-indigo-600 border-2 border-indigo-100 font-bold rounded-full hover:bg-indigo-50">
                Open Library
              </button>
              <button onClick={generateStory} className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-full hover:bg-indigo-700 shadow-lg">
                Generate Story
              </button>
            </div>
          </div>
        )}

        {status === 'loading' && (
          <div className="py-12 flex flex-col items-center gap-4 text-gray-500">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
            <p>Writing a story for you...</p>
          </div>
        )}

        {status === 'reading' && story && (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 min-h-[300px] relative">
            <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">{story.title}</h3>
            
            <div className="leading-loose text-xl text-justify space-y-4">
              {story.sentences.map((sentence, sIdx) => (
                <div 
                  key={sentence.id}
                  onDoubleClick={() => handleSentenceDoubleClick(sentence)}
                  className={`
                    transition-colors rounded p-1
                    ${currentSentenceIndex === sIdx ? 'bg-yellow-100' : ''}
                    ${focusedSentence?.id === sentence.id ? 'bg-indigo-50' : ''}
                  `}
                >
                  {sentence.words.map((word, wIdx) => (
                    <span 
                      key={`${sIdx}-${wIdx}`}
                      onClick={(e) => { e.stopPropagation(); handleWordClick(word, sentence); }}
                      className={`
                        inline-block mx-0.5 px-1 rounded cursor-pointer transition-colors relative group
                        ${word.type === 'struggle' ? 'text-orange-600 border-b-2 border-orange-200' : ''}
                        ${word.type === 'new' ? 'text-blue-600 border-b-2 border-blue-200' : ''}
                        ${word.type === 'known' ? 'text-gray-800 hover:bg-gray-200' : ''}
                      `}
                    >
                      <div className="flex flex-col items-center">
                        {showPinyin && <span className="text-xs text-gray-400 mb-1">{word.pinyin}</span>}
                        <span>{word.hanzi}</span>
                      </div>
                    </span>
                  ))}
                  <span className="ml-1 text-gray-400">。</span> 
                </div>
              ))}
            </div>

            {/* Smart Translation Bar (Sentence or Word) */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-50">
              <div className="max-w-2xl mx-auto flex justify-between items-center">
                <div className="flex-1">
                  {selectedWord ? (
                    <div className="animate-slide-up">
                      <div className="flex items-baseline gap-3 mb-1">
                        <span className="text-2xl font-bold text-indigo-700">{selectedWord.hanzi}</span>
                        <span className="text-lg text-gray-500">{selectedWord.pinyin}</span>
                        <span className="text-sm px-2 py-0.5 rounded bg-gray-100 text-gray-600 uppercase text-xs font-bold">{selectedWord.type}</span>
                      </div>
                      <div className="text-gray-800">{selectedWord.translation}</div>
                      {selectedWord.type === 'new' && (
                        <button onClick={handleAddCard} className="mt-2 text-sm text-blue-600 font-bold hover:underline flex items-center gap-1">
                          <Plus className="w-3 h-3" /> Add to Deck
                        </button>
                      )}
                    </div>
                  ) : focusedSentence ? (
                    <div className="animate-slide-up">
                      <div className="text-xs font-bold text-indigo-400 uppercase mb-1 flex items-center gap-1">
                        <Type className="w-3 h-3" /> Sentence Translation
                      </div>
                      <div className="text-lg text-gray-800 font-medium">
                        {focusedSentence.translation}
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-400 italic text-sm">
                      Double-click a sentence or click a word for translation.
                    </div>
                  )}
                </div>
                
                <div className="ml-4 pl-4 border-l border-gray-200">
                   <button 
                     onClick={() => { stopStory(); setStatus('quiz'); }}
                     className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 shadow-sm flex items-center gap-2"
                   >
                     Take Quiz <ArrowRight className="w-4 h-4" />
                   </button>
                </div>
              </div>
            </div>
            
            {/* Spacer for bottom bar */}
            <div className="h-24"></div>
          </div>
        )}
      </div>
    </div>
  );
}

