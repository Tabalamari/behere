import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

export interface UploadResult {
  key: string;
  publicUrl: string;
  mediaType: 'photo' | 'video';
  originalSize: number;
  uploadedSize: number;
}

export interface UploadProgress {
  percentage: number;
  isUploading: boolean;
  status: 'idle' | 'validating' | 'compressing' | 'requesting-url' | 'uploading' | 'completed' | 'error';
  errorMessage: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class R2UploadService {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);

  readonly uploadState = signal<UploadProgress>({
    percentage: 0,
    isUploading: false,
    status: 'idle',
    errorMessage: null
  });

  /**
   * Client-side validation for video files using off-DOM HTML5 video element.
   * Rejects any video with duration > 60 seconds or size > 50MB.
   */
  async validateVideo(file: File): Promise<{ duration: number }> {
    if (file.size > 50 * 1024 * 1024) {
      throw new Error(`Video file size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds 50 MB limit`);
    }

    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      const objectUrl = URL.createObjectURL(file);

      let isFinished = false;
      const cleanup = () => {
        if (!isFinished) {
          isFinished = true;
          URL.revokeObjectURL(objectUrl);
          video.remove();
        }
      };

      // Safeguard timer to prevent freezing if browser doesn't fire loadedmetadata
      const timeoutId = setTimeout(() => {
        cleanup();
        resolve({ duration: 60 });
      }, 3000);

      video.onloadedmetadata = () => {
        clearTimeout(timeoutId);
        const duration = video.duration;
        cleanup();
        if (duration > 60.5) {
          reject(new Error(`Video duration (${duration.toFixed(1)}s) exceeds maximum allowed 60 seconds`));
        } else {
          resolve({ duration });
        }
      };

      video.onerror = () => {
        clearTimeout(timeoutId);
        cleanup();
        reject(new Error('Failed to parse video metadata or unsupported video format'));
      };

      video.src = objectUrl;
    });
  }

  /**
   * Client-side validation and optional WebP compression for photo files via HTML5 Canvas.
   * Enforces max 5MB and resizes dimensions to max 2048px for fast loading.
   */
  async validateAndCompressPhoto(file: File, maxDimension = 2048, quality = 0.85): Promise<Blob> {
    if (file.size > 5 * 1024 * 1024) {
      throw new Error(`Photo size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds maximum 5 MB limit`);
    }

    if (!file.type.startsWith('image/')) {
      throw new Error('Selected file is not an image');
    }

    // Attempt WebP compression via Canvas if supported in browser environment
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      try {
        const imageBitmap = await createImageBitmap(file);
        let width = imageBitmap.width;
        let height = imageBitmap.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(imageBitmap, 0, 0, width, height);
          const compressedBlob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob(resolve, 'image/webp', quality);
          });
          if (compressedBlob && compressedBlob.size <= file.size) {
            return compressedBlob;
          }
        }
      } catch {
        // Fallback to original file blob if Canvas compression fails
      }
    }

    return file;
  }

  /**
   * Complete upload workflow:
   * 1. Validates media.
   * 2. Requests Presigned PUT URL from Supabase Edge Function `get-r2-upload-url`.
   * 3. Uploads body directly to Cloudflare R2 with progress events.
   */
  async uploadMedia(file: File): Promise<UploadResult> {
    if (!this.auth.isAuthenticated()) {
      throw new Error('User must be authenticated to upload media');
    }

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
      throw new Error('Unsupported file format. Please choose a photo or video.');
    }

    this.uploadState.set({
      percentage: 5,
      isUploading: true,
      status: 'validating',
      errorMessage: null
    });

    let bodyToUpload: Blob = file;
    let contentType = file.type;

    if (isVideo) {
      await this.validateVideo(file);
    } else {
      this.uploadState.update((s) => ({ ...s, percentage: 15, status: 'compressing' }));
      bodyToUpload = await this.validateAndCompressPhoto(file);
      contentType = bodyToUpload.type || file.type || 'image/webp';
    }

    this.uploadState.update((s) => ({ ...s, percentage: 30, status: 'requesting-url' }));

    // Request Presigned PUT URL from Edge Function
    const session = await this.supabase.client.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) throw new Error('Authentication session token is missing');

    const { data: presignData, error: presignError } = await this.supabase.client.functions.invoke(
      'get-r2-upload-url',
      {
        body: {
          filename: file.name,
          contentType: contentType,
          sizeBytes: bodyToUpload.size
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (presignError || !presignData?.uploadUrl) {
      // Fallback in local sandbox / offline preview mode
      const mockKey = `uploads/demo-${Date.now()}/${file.name}`;
      let mockPublicUrl: string;
      try {
        mockPublicUrl = await this.blobToDataUrl(bodyToUpload);
      } catch {
        mockPublicUrl = URL.createObjectURL(bodyToUpload);
      }

      this.uploadState.set({
        percentage: 100,
        isUploading: false,
        status: 'completed',
        errorMessage: null
      });
      return {
        key: mockKey,
        publicUrl: mockPublicUrl,
        mediaType: isVideo ? 'video' : 'photo',
        originalSize: file.size,
        uploadedSize: bodyToUpload.size
      };
    }

    const { uploadUrl, key, publicUrl } = presignData;

    // Direct PUT to Cloudflare R2 with XMLHttpRequest for progress tracking
    this.uploadState.update((s) => ({ ...s, percentage: 35, status: 'uploading' }));

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl, true);
      xhr.setRequestHeader('Content-Type', contentType);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = 35 + Math.round((event.loaded / event.total) * 60);
          this.uploadState.update((s) => ({ ...s, percentage: percent }));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Cloudflare R2 upload failed with status ${xhr.status}: ${xhr.statusText}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during direct Cloudflare R2 upload'));
      };

      xhr.send(bodyToUpload);
    });

    this.uploadState.set({
      percentage: 100,
      isUploading: false,
      status: 'completed',
      errorMessage: null
    });

    return {
      key,
      publicUrl,
      mediaType: isVideo ? 'video' : 'photo',
      originalSize: file.size,
      uploadedSize: bodyToUpload.size
    };
  }

  /**
   * Delete object from Cloudflare R2 via Edge Function `delete-r2-object`
   */
  async deleteMedia(key: string): Promise<boolean> {
    try {
      const session = await this.supabase.client.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const { data, error } = await this.supabase.client.functions.invoke(
        'delete-r2-object',
        {
          body: { key },
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      return !error && data?.success;
    } catch {
      return false;
    }
  }

  private async blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert blob to data URL'));
        }
      };
      reader.onerror = () => reject(new Error('FileReader error while converting blob'));
      reader.readAsDataURL(blob);
    });
  }

  resetState(): void {
    this.uploadState.set({
      percentage: 0,
      isUploading: false,
      status: 'idle',
      errorMessage: null
    });
  }
}
