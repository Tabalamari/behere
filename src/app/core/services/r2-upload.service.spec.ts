import { TestBed } from '@angular/core/testing';
import { R2UploadService } from './r2-upload.service';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { signal } from '@angular/core';

describe('R2UploadService', () => {
  let service: R2UploadService;
  let authServiceMock: Partial<AuthService>;
  let supabaseServiceMock: Partial<SupabaseService>;

  beforeEach(() => {
    authServiceMock = {
      isAuthenticated: signal(false),
      currentUser: signal(null),
    };

    supabaseServiceMock = {
      client: {
        auth: {
          getSession: jasmine.createSpy('getSession').and.returnValue(
            Promise.resolve({ data: { session: null }, error: null })
          )
        },
        functions: {
          invoke: jasmine.createSpy('invoke')
        }
      } as unknown as SupabaseService['client']
    };

    TestBed.configureTestingModule({
      providers: [
        R2UploadService,
        { provide: AuthService, useValue: authServiceMock },
        { provide: SupabaseService, useValue: supabaseServiceMock }
      ]
    });

    service = TestBed.inject(R2UploadService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should reject photo file exceeding 5MB limit', async () => {
    const largeFile = new File([new ArrayBuffer(6 * 1024 * 1024)], 'huge.jpg', {
      type: 'image/jpeg'
    });

    try {
      await service.validateAndCompressPhoto(largeFile);
      fail('Expected validateAndCompressPhoto to throw for >5MB photo');
    } catch (err: unknown) {
      expect((err as Error).message).toContain('exceeds maximum 5 MB limit');
    }
  });

  it('should reject video file exceeding 50MB limit', async () => {
    const hugeVideo = new File([new ArrayBuffer(55 * 1024 * 1024)], 'huge.mp4', {
      type: 'video/mp4'
    });

    try {
      await service.validateVideo(hugeVideo);
      fail('Expected validateVideo to throw for >50MB video');
    } catch (err: unknown) {
      expect((err as Error).message).toContain('exceeds 50 MB limit');
    }
  });

  it('should reject video with duration exceeding 60 seconds limit', async () => {
    const dummyVideo = new File(['dummy content'], 'long.mp4', { type: 'video/mp4' });

    // Spy on document.createElement('video') to mock a 65s duration
    const originalCreateElement = document.createElement.bind(document);
    spyOn(document, 'createElement').and.callFake((tagName: string) => {
      if (tagName === 'video') {
        const mockVideo = originalCreateElement('video');
        Object.defineProperty(mockVideo, 'duration', { value: 65.0, writable: false });
        // Trigger onloadedmetadata asynchronously
        setTimeout(() => {
          if (mockVideo.onloadedmetadata) {
            mockVideo.onloadedmetadata(new Event('loadedmetadata'));
          }
        }, 10);
        return mockVideo;
      }
      return originalCreateElement(tagName);
    });

    try {
      await service.validateVideo(dummyVideo);
      fail('Expected validateVideo to throw for 65s video');
    } catch (err: unknown) {
      expect((err as Error).message).toContain('exceeds maximum allowed 60 seconds');
    }
  });

  it('should reject upload when user is unauthenticated', async () => {
    const validPhoto = new File(['valid'], 'sample.jpg', { type: 'image/jpeg' });

    try {
      await service.uploadMedia(validPhoto);
      fail('Expected uploadMedia to throw when unauthenticated');
    } catch (err: unknown) {
      expect((err as Error).message).toContain('User must be authenticated to upload media');
    }
  });
});
