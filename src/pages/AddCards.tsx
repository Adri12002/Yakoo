import { useState, useRef } from 'react';
import { Upload, CheckCircle, AlertCircle, FileText, Sparkles, Plus, Wand2, Camera, Library as LibraryIcon } from 'lucide-react';
import { parseCSV, mergeCards } from '../utils/csv';
import { storage } from '../utils/storage';
import { ai } from '../utils/ai';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { createWorker } from 'tesseract.js';
import Library from './Library';

type Tab = 'magic' | 'scan' | 'library' | 'import';

interface ProposedCard {
  hanzi: string;
  pinyin: string;
  translation: string;
  selected: boolean;
}

export default function AddCards() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('magic');

  // --- Magic Paste State ---
  const [magicInput, setMagicInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [proposedCards, setProposedCards] = useState<ProposedCard[]>([]);
  const [magicStatus, setMagicStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [magicMessage, setMagicMessage] = useState('');

  // --- Scan State ---
  const [isScanning, setIsScanning] = useState(false);

  // --- Import State ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [importStatus, setImportStatus] = useState<'idle' | 'parsing' | 'ready' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');

  // --- Magic Paste Logic ---
  const handleAnalyze = async () => {
    if (!magicInput.trim()) return;
    setIsAnalyzing(true);
    setProposedCards([]);
    setMagicStatus('idle');

    const prompt = `Analyze the following text and extract unique Chinese words/phrases suitable for flashcards.
    If the text is English, translate it to Chinese words.
    If it's a mix, extract the Chinese.
    
    Input Text: "${magicInput}"

    Return a JSON object with a "cards" array. Each item must have:
    - hanzi: The Chinese characters
    - pinyin: Pinyin with tone marks
    - translation: English/French translation (keep it brief)
    
    Example JSON:
    {
      "cards": [
        { "hanzi": "你好", "pinyin": "nǐ hǎo", "translation": "Hello" }
      ]
    }`;

    const response = await ai.chat([{ role: "user", content: prompt }], true);

    setIsAnalyzing(false);

    if (response.success && response.data) {
      try {
        const jsonStr = response.data.substring(response.data.indexOf('{'), response.data.lastIndexOf('}') + 1);
        const data = JSON.parse(jsonStr);
        if (data.cards && Array.isArray(data.cards)) {
          const cards = data.cards.map((c: ProposedCard) => ({ ...c, selected: true }));
          setProposedCards(cards);
          if (cards.length === 0) {
             setMagicStatus('error');
             setMagicMessage('No Chinese words found in the text.');
          }
        } else {
          setMagicStatus('error');
          setMagicMessage('AI response format invalid.');
        }
      } catch (e) {
        setMagicStatus('error');
        setMagicMessage('Failed to parse AI response.');
      }
    } else {
      setMagicStatus('error');
      setMagicMessage(response.error || 'AI analysis failed.');
    }
  };

  const handleAddMagicCards = () => {
    const toAdd = proposedCards.filter(c => c.selected);
    if (toAdd.length === 0) return;

    const newCards: Card[] = toAdd.map(c => ({
      id: uuidv4(),
      hanzi: c.hanzi,
      pinyin: c.pinyin,
      translation: c.translation,
      srsState: 'new',
      srsStability: 0,
      srsDifficulty: 5,
      srsDue: new Date().toISOString(),
      srsRepetitions: 0
    }));

    // Merge and Save
    const existingCards = storage.getCards();
    
    // Filter duplicates based on Hanzi
    const uniqueNewCards = newCards.filter(nc => !existingCards.some(ec => ec.hanzi === nc.hanzi));
    const duplicateCount = newCards.length - uniqueNewCards.length;

    const updatedCards = [...existingCards, ...uniqueNewCards];
    storage.saveCards(updatedCards, user?.uid);

    setMagicStatus('success');
    setMagicMessage(`Added ${uniqueNewCards.length} new cards! ${duplicateCount > 0 ? `(${duplicateCount} duplicates skipped)` : ''}`);
    setProposedCards([]);
    setMagicInput('');
  };

  // --- Scan Logic ---
  const handleScanImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const worker = await createWorker('eng+chi_sim');
      const ret = await worker.recognize(file);
      await worker.terminate();
      
      // Clean up the messy text using Mistral
      const rawText = ret.data.text;
      setMagicMessage("Cleaning up scanned text...");
      setMagicStatus('idle');
      
      // Automatically switch to magic tab and start analyzing
      setActiveTab('magic');
      setMagicInput(rawText);
      
      // Trigger AI Cleanup + Extraction immediately
      const prompt = `I have OCR text scanned from a Chinese language book. It is messy and contains mixed languages (English, French, Pinyin, Chinese).
      
      Raw OCR Output:
      """
      ${rawText}
      """

      Please:
      1. Identify the valid Chinese vocabulary/sentences.
      2. Ignore page numbers, headers, and broken text.
      3. Extract them into the JSON format.
      
      Return ONLY the JSON object with "cards": [{ "hanzi": "...", "pinyin": "...", "translation": "..." }]`;

      setIsAnalyzing(true);
      const response = await ai.chat([{ role: "user", content: prompt }], true);
      setIsAnalyzing(false);

      if (response.success && response.data) {
        const jsonStr = response.data.substring(response.data.indexOf('{'), response.data.lastIndexOf('}') + 1);
        const data = JSON.parse(jsonStr);
        if (data.cards && Array.isArray(data.cards)) {
          const cards = data.cards.map((c: ProposedCard) => ({ ...c, selected: true }));
          setProposedCards(cards);
          setMagicStatus('success');
          setMagicMessage(`Found ${cards.length} potential cards from image!`);
        }
      } else {
        setMagicStatus('error');
        setMagicMessage("Could not extract cards from the image. Try manual pasting.");
      }

    } catch (err) {
      console.error(err);
      alert("Failed to scan image. Please try a clearer photo.");
      setIsScanning(false);
    }
    setIsScanning(false);
  };

  // --- Import Logic (Legacy) ---
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setImportStatus('parsing');
    setImportMessage('');

    try {
      const rows = await parseCSV(selectedFile);
      setPreview(rows.slice(0, 5));
      if (rows.length === 0) {
        setImportStatus('error');
        setImportMessage('No valid rows found. Check column headers: Hanzi, Pinyin, Translation');
      } else {
        setImportStatus('ready');
        setImportMessage(`Found ${rows.length} cards ready to import.`);
      }
    } catch (err) {
      console.error(err);
      setImportStatus('error');
      setImportMessage('Failed to parse CSV file.');
    }
  };

  const handleImport = async () => {
    if (!file) return;
    
    try {
      const rows = await parseCSV(file);
      const existingCards = storage.getCards();
      const updatedCards = mergeCards(existingCards, rows);
      
      storage.saveCards(updatedCards, user?.uid);
      
      setImportStatus('success');
      setImportMessage(`Successfully imported! Total cards: ${updatedCards.length}`);
      setFile(null);
      setPreview([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setImportStatus('error');
      setImportMessage('Error saving cards.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      
      {/* Header & Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('magic')}
            className={`flex-1 py-4 font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-colors
              ${activeTab === 'magic' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-gray-600 hover:bg-gray-50'}
            `}
          >
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            Magic Add (AI)
          </button>
          <button
            onClick={() => setActiveTab('scan')}
            className={`flex-1 py-4 font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-colors
              ${activeTab === 'scan' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-gray-600 hover:bg-gray-50'}
            `}
          >
            <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
            Scan Book
          </button>
          <button
            onClick={() => setActiveTab('library')}
            className={`flex-1 py-4 font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-colors
              ${activeTab === 'library' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-gray-600 hover:bg-gray-50'}
            `}
          >
            <LibraryIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            Library
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-4 font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-colors
              ${activeTab === 'import' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-gray-600 hover:bg-gray-50'}
            `}
          >
            <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
            Bulk Import
          </button>
        </div>

        {/* Magic Tab Content */}
        {activeTab === 'magic' && (
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <label className="block font-semibold text-gray-700">Paste text, words, or a topic:</label>
              <textarea
                value={magicInput}
                onChange={e => setMagicInput(e.target.value)}
                placeholder="e.g. 'I want to order coffee in Beijing' or paste a Chinese article paragraph..."
                className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
              />
              <p className="text-xs text-gray-500">The AI will find Chinese words, add Pinyin and translations automatically.</p>
            </div>

            {magicStatus === 'success' && (
               <div className="bg-green-50 text-green-700 p-3 rounded-lg flex items-center gap-2 text-sm font-medium animate-slide-up">
                 <CheckCircle className="w-5 h-5" /> {magicMessage}
               </div>
            )}

             {magicStatus === 'error' && (
               <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center gap-2 text-sm font-medium animate-slide-up">
                 <AlertCircle className="w-5 h-5" /> {magicMessage}
               </div>
            )}

            {/* Action Button */}
            {!isAnalyzing && proposedCards.length === 0 && (
              <button
                onClick={handleAnalyze}
                disabled={!magicInput.trim()}
                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-md"
              >
                <Wand2 className="w-5 h-5" /> Analyze & Extract Words
              </button>
            )}

            {isAnalyzing && (
              <div className="py-8 flex flex-col items-center justify-center text-gray-500 gap-3">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="animate-pulse font-medium">Consulting the AI Oracle...</p>
              </div>
            )}

            {/* Proposed Cards List */}
            {proposedCards.length > 0 && (
              <div className="space-y-4 animate-slide-up">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-gray-700">Found {proposedCards.length} Words</h3>
                  <button onClick={() => setProposedCards([])} className="text-sm text-gray-500 hover:text-gray-800">
                    Clear & Try Again
                  </button>
                </div>

                <div className="bg-gray-50 rounded-lg border border-gray-200 divide-y divide-gray-200 max-h-80 overflow-y-auto">
                  {proposedCards.map((card, idx) => (
                    <div key={idx} className="p-3 flex items-center gap-3 hover:bg-white transition-colors">
                      <input 
                        type="checkbox" 
                        checked={card.selected}
                        onChange={() => {
                          const newCards = [...proposedCards];
                          newCards[idx].selected = !newCards[idx].selected;
                          setProposedCards(newCards);
                        }}
                        className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                      />
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <span className="font-bold text-indigo-900">{card.hanzi}</span>
                        <span className="text-gray-600 font-mono text-sm">{card.pinyin}</span>
                        <span className="text-gray-500 text-sm truncate">{card.translation}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={handleAddMagicCards}
                  className="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95"
                >
                  <Plus className="w-5 h-5" /> Add {proposedCards.filter(c => c.selected).length} Selected Cards
                </button>
              </div>
            )}
          </div>
        )}

        {/* Scan Tab Content */}
        {activeTab === 'scan' && (
          <div className="p-6 space-y-8 text-center">
            {!isScanning ? (
              <div className="border-2 border-dashed border-indigo-200 rounded-xl p-12 bg-indigo-50 hover:bg-indigo-100 transition-colors relative group">
                <input 
                  type="file" 
                  accept="image/*"
                  /* capture="environment" - Removed to allow file selection */
                  onChange={handleScanImage}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <Camera className="w-16 h-16 text-indigo-400 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-bold text-indigo-900 mb-2">Take Photo or Upload</h3>
                <p className="text-gray-600 max-w-xs mx-auto">
                  Snap a picture or choose an image from your gallery.
                </p>
              </div>
            ) : (
               <div className="py-12 flex flex-col items-center justify-center text-gray-500 gap-3">
                <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="animate-pulse font-bold text-indigo-800">Reading Text...</p>
                <p className="text-xs">This might take a moment.</p>
              </div>
            )}
          </div>
        )}

        {/* Library Tab Content */}
        {activeTab === 'library' && (
           <div className="p-4">
             <Library />
           </div>
        )}

        {/* Import Tab Content (Legacy) */}
        {activeTab === 'import' && (
          <div className="p-6 space-y-6">
             <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors relative">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="pointer-events-none">
                <FileText className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 font-medium">
                  {file ? file.name : 'Click to upload CSV'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Required columns: Hanzi, Pinyin, Translation
                </p>
              </div>
            </div>

            {importStatus === 'error' && (
              <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {importMessage}
              </div>
            )}

            {importStatus === 'success' && (
              <div className="bg-emerald-50 text-emerald-700 p-3 rounded-md text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                {importMessage}
              </div>
            )}

            {importStatus === 'ready' && (
              <div className="space-y-4 animate-fade-in">
                <div className="bg-blue-50 text-blue-700 p-3 rounded-md text-sm">
                  {importMessage}
                </div>
                
                {preview.length > 0 && (
                  <div className="overflow-x-auto border border-gray-200 rounded-md">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-600 font-medium">
                        <tr>
                          <th className="p-2 border-b">Hanzi</th>
                          <th className="p-2 border-b">Pinyin</th>
                          <th className="p-2 border-b">Translation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((row, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="p-2">{row.Hanzi}</td>
                            <td className="p-2 text-gray-600">{row.Pinyin}</td>
                            <td className="p-2">{row.Translation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <button
                  onClick={handleImport}
                  className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Confirm CSV Import
                </button>
              </div>
            )}
             <div className="bg-gray-100 p-4 rounded text-sm text-gray-600">
              <h3 className="font-bold mb-2 text-gray-700">CSV Format Guide</h3>
              <code className="block bg-white p-2 rounded border border-gray-300 font-mono text-xs mb-2">
                Hanzi,Pinyin,Translation,Hint
              </code>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
