import { useState, useRef } from 'react';
import { Upload, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { parseCSV, mergeCards } from '../utils/csv';
import { storage } from '../utils/storage';

import { useAuth } from '../contexts/AuthContext';

export default function Import() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [status, setStatus] = useState<'idle' | 'parsing' | 'ready' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setStatus('parsing');
    setMessage('');

    try {
      const rows = await parseCSV(selectedFile);
      setPreview(rows.slice(0, 5));
      if (rows.length === 0) {
        setStatus('error');
        setMessage('No valid rows found. Check column headers: Hanzi, Pinyin, Translation');
      } else {
        setStatus('ready');
        setMessage(`Found ${rows.length} cards ready to import.`);
      }
    } catch (err) {
      console.error(err);
      setStatus('error');
      setMessage('Failed to parse CSV file.');
    }
  };

  const handleImport = async () => {
    if (!file) return;
    
    try {
      const rows = await parseCSV(file);
      const existingCards = storage.getCards();
      const updatedCards = mergeCards(existingCards, rows);
      
      storage.saveCards(updatedCards, user?.uid);
      
      setStatus('success');
      setMessage(`Successfully imported! Total cards: ${updatedCards.length}`);
      setFile(null);
      setPreview([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setStatus('error');
      setMessage('Error saving cards.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-blue-600" />
          Import Vocabulary
        </h2>
        
        <div className="space-y-4">
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

          {status === 'error' && (
            <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {message}
            </div>
          )}

          {status === 'success' && (
            <div className="bg-emerald-50 text-emerald-700 p-3 rounded-md text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {message}
            </div>
          )}

          {status === 'ready' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-blue-50 text-blue-700 p-3 rounded-md text-sm">
                {message}
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
                  <div className="p-2 text-xs text-center text-gray-500 bg-gray-50 border-t">
                    Preview showing first {preview.length} rows
                  </div>
                </div>
              )}

              <button
                onClick={handleImport}
                className="w-full py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                Confirm Import
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-gray-100 p-4 rounded text-sm text-gray-600">
        <h3 className="font-bold mb-2 text-gray-700">CSV Format Guide</h3>
        <p className="mb-2">Your CSV file must have this header row:</p>
        <code className="block bg-white p-2 rounded border border-gray-300 font-mono text-xs mb-2">
          Hanzi,Pinyin,Translation,Hint
        </code>
        <p>Example:</p>
        <code className="block bg-white p-2 rounded border border-gray-300 font-mono text-xs">
          你好,nǐ hǎo,Hello,Basic greeting
        </code>
      </div>
    </div>
  );
}

