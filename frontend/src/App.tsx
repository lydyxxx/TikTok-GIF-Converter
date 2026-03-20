import React, { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileUpload } from '@/components/FileUpload';
import { ConversionProgressDisplay } from '@/components/ConversionProgress';
import { ResultPanel, HistoryList } from '@/components/ResultPanel';
import { api } from '@/lib/api';
import { historyDB } from '@/lib/history-db';
import type {
  ConversionStage,
  ConversionMetadata,
  HistoryEntry,
  HistoryEntrySummary,
} from '@ttgifconv/shared';
import { CONVERSION_STAGES } from '@ttgifconv/shared';
import { v4 as uuidv4 } from 'uuid';

function App() {
  const [activeTab, setActiveTab] = useState<'convert' | 'history'>('convert');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [stage, setStage] = useState<ConversionStage>(CONVERSION_STAGES.IDLE);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('Ожидание файла...');
  const [result, setResult] = useState<{
    downloadUrl: string;
    metadata: ConversionMetadata;
    warnings: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntrySummary[]>([]);

  // Load history on mount
  React.useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const entries = await historyDB.getAll();
    setHistory(entries);
  };

  const handleFileSelected = useCallback(async (file: File) => {
    setSelectedFile(file);
    setError(null);
    setResult(null);
    setStage(CONVERSION_STAGES.UPLOADING);
    setProgress(5);
    setMessage('Загрузка файла...');

    try {
      // Upload file
      const uploadResponse = await api.upload(file);
      setProgress(15);
      setMessage('Файл загружен, начинаем конвертацию...');

      // Start conversion
      setStage(CONVERSION_STAGES.INSPECTING);
      const conversionResult = await api.convert(uploadResponse.fileId);

      if (conversionResult.success) {
        setStage(CONVERSION_STAGES.COMPLETE);
        setProgress(100);
        setMessage('Конвертация завершена!');
        setResult({
          downloadUrl: conversionResult.downloadUrl,
          metadata: conversionResult.metadata,
          warnings: conversionResult.warnings || [],
        });

        // Add to history
        const historyEntry: HistoryEntry = {
          id: uuidv4(),
          originalName: file.name,
          originalFormat: file.name.endsWith('.gif') ? 'gif' : 'webp',
          timestamp: Date.now(),
          metadata: conversionResult.metadata,
          warnings: conversionResult.warnings || [],
        };

        // Fetch the blob for storage
        try {
          const blob = await api.download(uploadResponse.fileId);
          historyEntry.outputBlob = blob;
        } catch (e) {
          console.warn('Failed to store blob in history:', e);
        }

        await historyDB.add(historyEntry);
        await loadHistory();
      } else if (conversionResult.error) {
        throw new Error(conversionResult.error.message || 'Конвертация не удалась');
      } else {
        throw new Error('Конвертация не удалась');
      }
    } catch (err) {
      setStage(CONVERSION_STAGES.ERROR);
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
      setProgress(0);
    }
  }, []);

  const handleDownload = useCallback(() => {
    if (result) {
      window.open(result.downloadUrl, '_blank');
    }
  }, [result]);

  const handleReconvert = useCallback(() => {
    setSelectedFile(null);
    setResult(null);
    setStage(CONVERSION_STAGES.IDLE);
    setProgress(0);
    setMessage('Ожидание файла...');
    setError(null);
  }, []);

  const handleAddToHistory = useCallback(() => {
    // Already handled in handleFileSelected
  }, []);

  const handleHistoryDelete = useCallback(async (id: string) => {
    await historyDB.delete(id);
    await loadHistory();
  }, []);

  const handleHistorySelect = useCallback(async (id: string) => {
    const entry = await historyDB.get(id);
    if (entry && entry.outputBlob) {
      // Create download from blob
      const url = URL.createObjectURL(entry.outputBlob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }, []);

  const handleHistoryDownload = useCallback(async (id: string) => {
    const entry = await historyDB.get(id);
    if (entry && entry.outputBlob) {
      const url = URL.createObjectURL(entry.outputBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${entry.originalName.replace(/\.[^.]+$/, '')}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2">Tiktok GIF Converter</h1>
          <p className="text-muted-foreground">
            Конвертер TikTok GIF/WebP в Telegram стикеры
          </p>
        </header>

        {/* Main content */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'convert' | 'history')}
          className="max-w-2xl mx-auto"
        >
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="convert">Конвертация</TabsTrigger>
            <TabsTrigger value="history">История</TabsTrigger>
          </TabsList>

          <TabsContent value="convert" className="space-y-6">
            {/* Upload or Progress or Result */}
            {!selectedFile && !result && stage === CONVERSION_STAGES.IDLE && (
              <FileUpload
                onFileSelected={handleFileSelected}
                disabled={false}
              />
            )}

            {(selectedFile || (stage !== CONVERSION_STAGES.IDLE && stage !== CONVERSION_STAGES.ERROR)) &&
              !result && (
                <div className="p-6 rounded-lg border bg-card">
                  <ConversionProgressDisplay
                    stage={stage}
                    progress={progress}
                    message={message}
                  />
                </div>
              )}

            {result && (
              <ResultPanel
                metadata={result.metadata}
                downloadUrl={result.downloadUrl}
                warnings={result.warnings}
                onDownload={handleDownload}
                onReconvert={handleReconvert}
                onAddToHistory={handleAddToHistory}
              />
            )}

            {error && (
              <div className="p-6 rounded-lg border border-destructive/50 bg-destructive/10">
                <p className="text-destructive font-medium">Ошибка</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
                <button
                  onClick={handleReconvert}
                  className="mt-4 text-sm text-primary hover:underline"
                >
                  Попробовать снова
                </button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history">
            <HistoryList
              entries={history}
              onSelect={handleHistorySelect}
              onDelete={handleHistoryDelete}
              onDownload={handleHistoryDownload}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
