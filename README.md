# ttgifconv — Конвертер в Telegram стикеры

**TikTok WebP → Telegram WebM Sticker Converter**

Приложение для конвертации анимированных GIF и WebP файлов в Telegram-совместимые `.webm` стикеры с автоматическим сжатием и проверкой ограничений.

## Особенности

- ✅ **Поддерживаемые форматы**: `.gif`, `.webp` (анимированный)
- ✅ **Выходной формат**: `.webm` (VP9)
- ✅ **Telegram ограничения**:
  - Размер: 512×512 пикселей (одна сторона ровно 512px)
  - Длительность: ≤ 3 секунд
  - Размер файла: ≤ 256 KB
- ✅ **Итеративное сжатие**: автоматический подбор битрейта и FPS
- ✅ **Красивый UI**: прогресс конвертации по шагам
- ✅ **История**: локальное сохранение через IndexedDB
- ✅ **Dark mode**: поддержка тёмной темы

## Требования

- **Node.js**: ≥ 18.0.0
- **npm**: ≥ 9.0.0
- **FFmpeg**: должен быть установлен и доступен в PATH

## Установка

### 1. Установка FFmpeg

#### Windows

```bash
# Через winget
winget install Gyan.FFmpeg

# Или через chocolatey
choco install ffmpeg

# Или скачать с https://ffmpeg.org/download.html
# и добавить в PATH вручную
```

#### macOS

```bash
brew install ffmpeg
```

#### Linux

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install ffmpeg

# Fedora
sudo dnf install ffmpeg

# Arch
sudo pacman -S ffmpeg
```

### 2. Установка зависимостей проекта

```bash
cd E:\ttgifconv
npm install
```

### 3. Проверка установки FFmpeg

```bash
ffmpeg -version
ffprobe -version
```

## Запуск

### Режим разработки (оба приложения одновременно)

```bash
npm run dev
```

Это запустит:
- **Backend**: http://localhost:3001
- **Frontend**: http://localhost:5173

### Отдельный запуск

#### Backend

```bash
cd backend
npm run dev
```

#### Frontend

```bash
cd frontend
npm run dev
```

## Сборка для продакшена

```bash
# Сборка всех проектов
npm run build

# Или по отдельности
npm run build:backend
npm run build:frontend
```

## Тесты

```bash
# Запуск всех тестов
npm test

# Type checking
npm run type-check

# Linting
npm run lint
```

## Структура проекта

```
conv/
├── shared/              # Общие TypeScript типы
│   ├── src/
│   │   ├── constants.ts # Telegram ограничения, коды ошибок
│   │   ├── types/       # API типы, типы конвертации, истории
│   │   └── index.ts
│   └── package.json
│
├── backend/             # Fastify сервер + FFmpeg
│   ├── src/
│   │   ├── config/      # Конфигурация (env)
│   │   ├── routes/      # API endpoints
│   │   ├── services/    # Бизнес-логика конвертации
│   │   ├── utils/       # FFmpeg утилиты
│   │   ├── tests/       # Тесты
│   │   ├── app.ts       # Fastify приложение
│   │   └── index.ts     # Entry point
│   └── package.json
│
├── frontend/            # React + Vite + Tailwind
│   ├── src/
│   │   ├── components/  # UI компоненты
│   │   │   ├── ui/      # shadcn/ui примитивы
│   │   │   ├── FileUpload.tsx
│   │   │   ├── ConversionProgress.tsx
│   │   │   └── ResultPanel.tsx
│   │   ├── lib/         # Утилиты (api, history-db)
│   │   ├── App.tsx      # Главное приложение
│   │   └── main.tsx     # Entry point
│   └── package.json
│
├── tmp/                 # Временные файлы (игнорируется)
├── outputs/             # Готовые .webm файлы (игнорируется)
└── package.json         # Корневой package.json (workspaces)
```

## API Endpoints

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/health` | Проверка статуса сервера и FFmpeg |
| POST | `/api/upload` | Загрузка файла (multipart/form-data) |
| POST | `/api/convert/:fileId` | Конвертация файла |
| GET | `/api/download/:fileId` | Скачивание готового .webm |
| GET | `/outputs/:fileId.webm` | Прямой доступ к файлу |

## Переменные окружения

Создайте файл `.env` в корне проекта:

```env
# Backend
PORT=3001
HOST=127.0.0.1
MAX_FILE_SIZE=52428800
TMP_DIR=./tmp
OUTPUT_DIR=./outputs

# Conversion settings
DEFAULT_FPS=30
DEFAULT_BITRATE=500
MAX_COMPRESSION_PASSES=5
MIN_QUALITY=0.5
```

## Как это работает

### Конвертация Pipeline

1. **Загрузка** → файл сохраняется во временную директорию
2. **Инспекция** → ffprobe читает метаданные (размер, длительность, FPS)
3. **Валидация** → проверка типа файла и анимации
4. **Конвертация** → масштабирование в 512×512, обрезка до 3 секунд
5. **Итеративное сжатие** → подбор битрейта пока размер ≤ 256 KB
6. **Верификация** → финальная проверка всех ограничений Telegram
7. **Результат** → файл перемещается в `outputs/`, возвращается metadata

### Стратегия сжатия

```
Pass 1: 500 kbps @ 30 fps
Pass 2: 350 kbps @ 30 fps
Pass 3: 245 kbps @ 30 fps
Pass 4: 170 kbps @ 22 fps
Pass 5: 120 kbps @ 15 fps (минимальное качество)
```

Если после 5 попыток файл всё ещё > 256 KB, возвращается лучший вариант с предупреждением.

## История

История конвертаций сохраняется локально в браузере через **IndexedDB**:

- Оригинальное имя файла
- Формат (gif/webp)
- Выходные метаданные (размер, длительность, FPS)
- Blob готового файла (для скачивания без сервера)
- Дата/время конвертации

**Действия с историей**:
- Скачать .webm
- Повторно конвертировать (загрузить файл снова)
- Удалить из истории

## Ограничения

- Максимальный размер загружаемого файла: **50 MB**
- Статический WebP **не поддерживается** (только анимированный)
- Конвертация работает только локально (требуется установленный FFmpeg)

## Технологии

### Backend
- **Fastify** — быстрый HTTP сервер
- **fluent-ffmpeg** — обёртка для FFmpeg
- **uuid** — генерация уникальных ID
- **zod** — валидация схем

### Frontend
- **React 18** — UI библиотека
- **Vite** — сборщик
- **Tailwind CSS** — стилизация
- **shadcn/ui** — компоненты
- **idb** — работа с IndexedDB
- **lucide-react** — иконки

### Shared
- **TypeScript** — строгая типизация
- **ES Modules** — современный формат модулей

## Лицензия

MIT


