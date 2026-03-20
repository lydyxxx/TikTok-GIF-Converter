/**
 * API client for backend communication
 */
import type {
  HealthResponse,
  UploadResponse,
  ConversionResultResponse,
} from '@ttgifconv/shared';

const API_BASE = '/api';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Request failed');
  }
  return response.json();
}

export const api = {
  /**
   * Health check
   */
  async health(): Promise<HealthResponse> {
    const response = await fetch(`${API_BASE}/health`);
    return handleResponse<HealthResponse>(response);
  },

  /**
   * Upload file
   */
  async upload(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    });

    return handleResponse<UploadResponse>(response);
  },

  /**
   * Convert file
   */
  async convert(fileId: string): Promise<ConversionResultResponse> {
    const response = await fetch(`${API_BASE}/convert/${fileId}`, {
      method: 'POST',
    });

    return handleResponse<ConversionResultResponse>(response);
  },

  /**
   * Download converted file
   */
  async download(fileId: string): Promise<Blob> {
    const response = await fetch(`${API_BASE}/download/${fileId}`);
    if (!response.ok) {
      throw new Error('Download failed');
    }
    return response.blob();
  },

  /**
   * Get download URL directly
   */
  getDownloadUrl(fileId: string): string {
    return `${API_BASE}/download/${fileId}`;
  },
};
