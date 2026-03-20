import React from 'react';
import { CheckCircle2, Loader2, AlertCircle, FileVideo, Scissors, ShieldCheck, Package } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { ConversionStage } from '@ttgifconv/shared';
import { CONVERSION_STAGES } from '@ttgifconv/shared';
import { cn } from '@/lib/utils';

interface ConversionProgressProps {
  stage: ConversionStage;
  progress: number;
  message: string;
}

const stageIcons: Record<ConversionStage, React.ComponentType<{ className?: string }>> = {
  [CONVERSION_STAGES.IDLE]: FileVideo,
  [CONVERSION_STAGES.UPLOADING]: Loader2,
  [CONVERSION_STAGES.INSPECTING]: FileVideo,
  [CONVERSION_STAGES.VALIDATING]: ShieldCheck,
  [CONVERSION_STAGES.CONVERTING]: Scissors,
  [CONVERSION_STAGES.COMPRESSING]: Package,
  [CONVERSION_STAGES.VERIFYING]: ShieldCheck,
  [CONVERSION_STAGES.COMPLETE]: CheckCircle2,
  [CONVERSION_STAGES.ERROR]: AlertCircle,
};

const stageLabels: Record<ConversionStage, string> = {
  [CONVERSION_STAGES.IDLE]: 'Ожидание',
  [CONVERSION_STAGES.UPLOADING]: 'Загрузка файла',
  [CONVERSION_STAGES.INSPECTING]: 'Анализ метаданных',
  [CONVERSION_STAGES.VALIDATING]: 'Проверка файла',
  [CONVERSION_STAGES.CONVERTING]: 'Конвертация',
  [CONVERSION_STAGES.COMPRESSING]: 'Сжатие',
  [CONVERSION_STAGES.VERIFYING]: 'Верификация',
  [CONVERSION_STAGES.COMPLETE]: 'Готово',
  [CONVERSION_STAGES.ERROR]: 'Ошибка',
};

export const ConversionProgressDisplay: React.FC<ConversionProgressProps> = ({
  stage,
  progress,
  message,
}) => {
  const Icon = stageIcons[stage];
  const isComplete = stage === CONVERSION_STAGES.COMPLETE;
  const isError = stage === CONVERSION_STAGES.ERROR;
  const isLoading = !isComplete && !isError && stage !== CONVERSION_STAGES.IDLE;

  return (
    <div className="w-full space-y-6">
      {/* Main progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{stageLabels[stage]}</span>
          <span className="text-sm text-muted-foreground">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Status message */}
      <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
        <Icon
          className={cn(
            'w-5 h-5',
            isLoading && 'animate-spin text-primary',
            isComplete && 'text-green-600',
            isError && 'text-destructive'
          )}
        />
        <span className="text-sm">{message}</span>
      </div>

      {/* Steps timeline */}
      <div className="space-y-3">
        <ConversionStep
          label="Загрузка"
          isCompleted={progress >= 10}
          isActive={stage === CONVERSION_STAGES.UPLOADING}
        />
        <ConversionStep
          label="Анализ метаданных"
          isCompleted={progress >= 20}
          isActive={stage === CONVERSION_STAGES.INSPECTING}
        />
        <ConversionStep
          label="Проверка"
          isCompleted={progress >= 30}
          isActive={stage === CONVERSION_STAGES.VALIDATING}
        />
        <ConversionStep
          label="Конвертация в WebM"
          isCompleted={progress >= 50}
          isActive={stage === CONVERSION_STAGES.CONVERTING}
        />
        <ConversionStep
          label="Сжатие"
          isCompleted={progress >= 80}
          isActive={stage === CONVERSION_STAGES.COMPRESSING}
        />
        <ConversionStep
          label="Верификация"
          isCompleted={progress >= 90}
          isActive={stage === CONVERSION_STAGES.VERIFYING}
        />
      </div>
    </div>
  );
};

interface ConversionStepProps {
  label: string;
  isCompleted: boolean;
  isActive: boolean;
}

const ConversionStep: React.FC<ConversionStepProps> = ({
  label,
  isCompleted,
  isActive,
}) => {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          'flex items-center justify-center w-6 h-6 rounded-full border-2 transition-colors',
          isCompleted
            ? 'bg-primary border-primary text-primary-foreground'
            : isActive
            ? 'border-primary animate-pulse'
            : 'border-muted-foreground/30'
        )}
      >
        {isCompleted && <CheckCircle2 className="w-4 h-4" />}
        {isActive && <Loader2 className="w-3 h-3 animate-spin" />}
      </div>
      <span
        className={cn(
          'text-sm',
          isCompleted ? 'text-foreground' : 'text-muted-foreground',
          isActive && 'font-medium'
        )}
      >
        {label}
      </span>
    </div>
  );
};
