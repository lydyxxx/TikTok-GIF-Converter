import React, { act } from 'react';
import ReactDOM from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HistoryList, ResultPanel } from './ResultPanel';
import type { ConversionMetadata, HistoryEntrySummary } from '@ttgifconv/shared';

describe('ResultPanel', () => {
  let container: HTMLDivElement | null = null;

  afterEach(() => {
    if (container) {
      document.body.removeChild(container);
      container = null;
    }
  });

  it('renders preview video for converted result', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);

    const root = ReactDOM.createRoot(container);

    const metadata: ConversionMetadata = {
      width: 512,
      height: 512,
      duration: 2.4,
      fps: 30,
      fileSize: 120000,
      format: 'webm',
      codec: 'vp9',
      compressionPass: 1,
      input: {
        width: 800,
        height: 800,
        duration: 2.4,
        fps: 30,
        codec: 'gif',
        format: 'gif',
        isAnimated: true,
        frameCount: 72,
        bitrate: 0,
      },
    };

    await act(async () => {
      root.render(
        <ResultPanel
          metadata={metadata}
          downloadUrl="/api/files/test.webm"
          warnings={[]}
          onDownload={vi.fn()}
          onReconvert={vi.fn()}
          onAddToHistory={vi.fn()}
        />
      );
    });

    const preview = container.querySelector('video');
    expect(preview).not.toBeNull();
    expect(preview?.getAttribute('src')).toBe('/api/files/test.webm');
    expect(preview?.className).toContain('max-h-[240px]');

    await act(async () => {
      root.unmount();
    });
  });

  it('renders mini preview video in history entries', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);

    const root = ReactDOM.createRoot(container);
    const createObjectURL = vi.fn(() => 'blob:history-preview');
    const revokeObjectURL = vi.fn();

    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    });

    const entries: HistoryEntrySummary[] = [
      {
        id: 'entry-1',
        originalName: 'cat.gif',
        originalFormat: 'gif',
        timestamp: Date.now(),
        metadata: {
          width: 512,
          height: 512,
          duration: 2,
          fps: 30,
          fileSize: 120000,
          format: 'webm',
          codec: 'vp9',
          compressionPass: 1,
          input: {
            width: 640,
            height: 480,
            duration: 2,
            fps: 30,
            codec: 'gif',
            format: 'gif',
            isAnimated: true,
            frameCount: 60,
            bitrate: 0,
          },
        },
        outputBlob: new Blob(['video'], { type: 'video/webm' }),
        warnings: [],
      },
    ];

    await act(async () => {
      root.render(
        <HistoryList
          entries={entries}
          onSelect={vi.fn()}
          onDelete={vi.fn()}
          onDownload={vi.fn()}
        />
      );
    });

    const preview = container.querySelector('video');
    expect(preview).not.toBeNull();
    expect(preview?.getAttribute('src')).toBe('blob:history-preview');
    expect(preview?.className).toContain('h-14');

    await act(async () => {
      root.unmount();
    });

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:history-preview');
    vi.unstubAllGlobals();
  });
});
