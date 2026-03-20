import React from 'react';
import { Download, RotateCcw, Trash2, FileVideo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ConversionMetadata, HistoryEntrySummary } from '@ttgifconv/shared';
import { TELEGRAM_CONSTRAINTS } from '@ttgifconv/shared';

interface ResultPanelProps {
  metadata: ConversionMetadata;
  downloadUrl: string;
  warnings: string[];
  onDownload: () => void;
  onReconvert: () => void;
  onAddToHistory: () => void;
}

export const ResultPanel: React.FC<ResultPanelProps> = ({
  metadata,
  downloadUrl,
  warnings,
  onDownload,
  onReconvert,
  onAddToHistory,
}) => {
  React.useEffect(() => {
    onAddToHistory();
  }, []);

  return (
    <div className="w-full space-y-4">
      {/* Preview card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileVideo className="w-5 h-5" />
            Результат конвертации
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="mx-auto max-w-[240px] overflow-hidden rounded-xl border bg-muted/30 sm:max-w-[280px]">
            <video
              className="max-h-[240px] aspect-square w-full object-contain sm:max-h-[280px]"
              src={downloadUrl}
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              aria-label="Превью результата конвертации"
            />
          </div>

          {/* Metadata grid */}
          <div className="grid grid-cols-2 gap-4">
            <MetadataItem
              label="Размер"
              value={`${metadata.width}×${metadata.height}`}
            />
            <MetadataItem
              label="Длительность"
              value={`${metadata.duration.toFixed(2)}с`}
            />
            <MetadataItem
              label="FPS"
              value={metadata.fps.toString()}
            />
            <MetadataItem
              label="Размер файла"
              value={formatFileSize(metadata.fileSize)}
            />
            <MetadataItem
              label="Формат"
              value={metadata.format.toUpperCase()}
            />
            <MetadataItem
              label="Кодек"
              value={metadata.codec.toUpperCase()}
            />
          </div>

          {/* Telegram compliance badges */}
          <div className="flex flex-wrap gap-2">
            <ComplianceBadge
              label={`512×512`}
              isCompliant={
                metadata.width <= TELEGRAM_CONSTRAINTS.MAX_WIDTH &&
                metadata.height <= TELEGRAM_CONSTRAINTS.MAX_HEIGHT
              }
            />
            <ComplianceBadge
              label={`≤3с`}
              isCompliant={metadata.duration <= TELEGRAM_CONSTRAINTS.MAX_DURATION}
            />
            <ComplianceBadge
              label={`≤256KB`}
              isCompliant={metadata.fileSize <= TELEGRAM_CONSTRAINTS.MAX_FILE_SIZE}
            />
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="p-3 rounded-md bg-yellow-50 text-yellow-800 text-sm space-y-1">
              {warnings.map((warning, index) => (
                <div key={index}>⚠️ {warning}</div>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button onClick={onDownload} className="flex-1">
            <Download className="w-4 h-4 mr-2" />
            Скачать .webm
          </Button>
          <Button variant="outline" onClick={onReconvert}>
            <RotateCcw className="w-4 h-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

interface MetadataItemProps {
  label: string;
  value: string;
}

const MetadataItem: React.FC<MetadataItemProps> = ({ label, value }) => (
  <div className="p-3 rounded-lg bg-muted">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-sm font-medium">{value}</div>
  </div>
);

interface ComplianceBadgeProps {
  label: string;
  isCompliant: boolean;
}

const ComplianceBadge: React.FC<ComplianceBadgeProps> = ({
  label,
  isCompliant,
}) => (
  <Badge variant={isCompliant ? 'default' : 'destructive'}>
    {isCompliant ? '✓' : '✗'} {label}
  </Badge>
);

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

interface HistoryListProps {
  entries: HistoryEntrySummary[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onDownload: (id: string) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({
  entries,
  onSelect,
  onDelete,
  onDownload,
}) => {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileVideo className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>История пуста</p>
        <p className="text-sm">Конвертированные файлы появятся здесь</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <Card key={entry.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <HistoryPreview entry={entry} />
                <div>
                  <div className="font-medium">{entry.originalName}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatFileSize(entry.metadata.fileSize)} •{' '}
                    {entry.metadata.duration.toFixed(2)}с •{' '}
                    {new Date(entry.timestamp).toLocaleDateString('ru-RU')}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDownload(entry.id)}
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onSelect(entry.id)}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(entry.id)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

interface HistoryPreviewProps {
  entry: HistoryEntrySummary;
}

const HistoryPreview: React.FC<HistoryPreviewProps> = ({ entry }) => {
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(entry.thumbnailDataUrl ?? null);

  React.useEffect(() => {
    if (entry.thumbnailDataUrl) {
      setPreviewUrl(entry.thumbnailDataUrl);
      return;
    }

    if (!entry.outputBlob) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(entry.outputBlob);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [entry.outputBlob, entry.thumbnailDataUrl]);

  if (previewUrl) {
    if (entry.thumbnailDataUrl) {
      return (
        <img
          className="h-14 w-14 rounded-lg border bg-muted object-cover"
          src={previewUrl}
          alt={`Превью ${entry.originalName}`}
        />
      );
    }

    return (
      <video
        className="h-14 w-14 rounded-lg border bg-muted object-cover"
        src={previewUrl}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        aria-label={`Превью ${entry.originalName}`}
      />
    );
  }

  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-lg border bg-muted">
      <FileVideo className="w-5 h-5" />
    </div>
  );
};
