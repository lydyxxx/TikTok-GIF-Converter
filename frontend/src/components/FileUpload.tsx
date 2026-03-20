import React, { useCallback, useState, useRef } from 'react';
import { Upload, FileVideo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelected,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      // Validate file type
      const validTypes = ['image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        alert('Неподдерживаемый тип файла. Пожалуйста, загрузите .gif или .webp');
        return;
      }

      // Validate file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        alert('Файл слишком большой. Максимальный размер: 50MB');
        return;
      }

      onFileSelected(file);
    },
    [onFileSelected]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [disabled, handleFile]
  );

  const handleClick = useCallback(() => {
    if (disabled) return;
    inputRef.current?.click();
  }, [disabled]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center w-full h-64',
        'border-2 border-dashed rounded-lg transition-colors cursor-pointer',
        'bg-muted/20 hover:bg-muted/40',
        isDragging ? 'border-primary bg-muted/60' : 'border-muted-foreground/25',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".gif,.webp,image/gif,image/webp"
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />

      <div className="flex flex-col items-center gap-4 p-6 text-center">
        <div className="p-4 rounded-full bg-primary/10">
          <FileVideo className="w-12 h-12 text-primary" />
        </div>

        <div className="space-y-2">
          <p className="text-lg font-medium">
            Перетащите файл сюда или нажмите для выбора
          </p>
          <p className="text-sm text-muted-foreground">
            Поддерживаемые форматы: .gif, .webp (анимированный)
          </p>
          <p className="text-xs text-muted-foreground">
            Максимальный размер: 50MB
          </p>
        </div>

        <Button type="button" variant="outline" size="lg" disabled={disabled}>
          <Upload className="w-4 h-4 mr-2" />
          Загрузить gif
        </Button>
      </div>
    </div>
  );
};
