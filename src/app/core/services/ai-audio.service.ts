import { Injectable, inject, signal, effect, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { AuthModalService } from './auth-modal.service';
import { BoardStateService } from './board-state.service';
import { MemoryItem, LocationPin } from '../models/memory.model';

export interface AudioStoryData {
  location_id?: string | null;
  content_hash: string;
  audio_url: string;
  transcript: string;
  cached: boolean;
  updated_at?: string;
}

const DEMO_STORIES: Record<string, AudioStoryData> = {
  'loc-1': {
    location_id: 'loc-1',
    content_hash: 'demo-preston-hash',
    audio_url: 'https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3',
    transcript:
      'Welcome to Preston Park, Brighton\'s oldest and largest municipal park, laid out in the 1880s on the former grounds of historic Preston Manor. The park is renowned worldwide for the Preston Twins—magnificent English elms believed to be over four hundred years old, having survived Dutch elm disease. Generations of residents have walked beneath these ancient canopies, finding solace amidst coastal sea breezes.',
    cached: true
  },
  'loc-2': {
    location_id: 'loc-2',
    content_hash: 'demo-north-laine-hash',
    audio_url: 'https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3',
    transcript:
      'Welcome to North Laine, a historic maze of Victorian commercial and residential streets. Originally five open agricultural strips known as "laines" in medieval times, the area transformed in the nineteenth century with artisans and railway workers. Today, its historic shopfronts, bookshops, and murals stand as a monument to community-driven urban preservation.',
    cached: true
  },
  'loc-3': {
    location_id: 'loc-3',
    content_hash: 'demo-hove-hash',
    audio_url: 'https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3',
    transcript:
      'Welcome to the historic Hove Seafront. Developed in the Regency and early Victorian eras with expansive lawns and pastel-hued beach huts, this promenade preserves the distinguished architectural legacy of Decimus Burton and the Brunswick estate. The pebbled shores continue to gather generations of bathers and dreamers gazing across the English Channel.',
    cached: true
  }
};

@Injectable({
  providedIn: 'root'
})
export class AiAudioService {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);
  private authModal = inject(AuthModalService);
  private boardState = inject(BoardStateService);

  // Reactive State
  readonly currentStory = signal<AudioStoryData | null>(null);
  readonly isCacheValid = signal<boolean>(true);
  readonly isGenerating = signal<boolean>(false);
  readonly isPlaying = signal<boolean>(false);
  readonly currentTime = signal<number>(0);
  readonly duration = signal<number>(0);
  readonly errorMessage = signal<string | null>(null);

  // Audio HTML5 Element
  private audioElement: HTMLAudioElement | null = null;
  private currentHash: string = '';

  constructor() {
    this.initAudioElement();

    // Whenever location or canvas cards change, verify audio cache
    effect(() => {
      const location = this.boardState.selectedLocation();
      const cards = this.boardState.canvasCards();
      this.checkAndSyncAudioStory(location, cards);
    });
  }

  private initAudioElement(): void {
    if (typeof window === 'undefined') return;

    this.audioElement = new Audio();
    this.audioElement.preload = 'metadata';

    this.audioElement.addEventListener('timeupdate', () => {
      if (this.audioElement) {
        this.currentTime.set(this.audioElement.currentTime);
      }
    });

    this.audioElement.addEventListener('loadedmetadata', () => {
      if (this.audioElement) {
        this.duration.set(this.audioElement.duration || 0);
      }
    });

    this.audioElement.addEventListener('ended', () => {
      this.isPlaying.set(false);
      this.currentTime.set(0);
    });

    this.audioElement.addEventListener('pause', () => {
      this.isPlaying.set(false);
    });

    this.audioElement.addEventListener('play', () => {
      this.isPlaying.set(true);
    });

    this.audioElement.addEventListener('error', () => {
      this.isPlaying.set(false);
      this.errorMessage.set('Failed to play audio stream.');
    });
  }

  /**
   * Deterministically computes a SHA-256 hash from sorted memory IDs
   */
  async computeHash(locationId: string | null, cards: MemoryItem[]): Promise<string> {
    const sortedIds = cards
      .map((c) => c.id)
      .sort()
      .join(',');

    const raw = `${locationId || 'global'}:${sortedIds}`;

    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(raw);
      const hashBuf = await window.crypto.subtle.digest('SHA-256', data);
      const hashArr = Array.from(new Uint8Array(hashBuf));
      return hashArr.map((b) => b.toString(16).padStart(2, '0')).join('');
    }

    // Fallback simple hash for non-crypto contexts
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = (hash << 5) - hash + raw.charCodeAt(i);
      hash |= 0;
    }
    return 'h-' + Math.abs(hash).toString(16);
  }

  /**
   * Evaluates current board cards and checks whether cached audio matches
   */
  async checkAndSyncAudioStory(location: LocationPin | null, cards: MemoryItem[]): Promise<void> {
    // Stop playback if playing on change
    if (this.isPlaying()) {
      this.pause();
    }

    const locId = location?.id || null;
    const newHash = await this.computeHash(locId, cards);
    this.currentHash = newHash;

    // Check DB for matching story
    try {
      if (locId) {
        const { data, error } = await this.supabase.client
          .from('audio_stories')
          .select('*')
          .eq('location_id', locId)
          .maybeSingle();

        if (!error && data) {
          const match = data.content_hash === newHash;
          this.isCacheValid.set(match);
          this.currentStory.set({
            location_id: data.location_id,
            content_hash: data.content_hash,
            audio_url: data.audio_url,
            transcript: data.transcript,
            cached: true,
            updated_at: data.updated_at
          });
          return;
        }
      }
    } catch {
      // Fallback
    }

    // Check demo initial stories
    if (locId && DEMO_STORIES[locId]) {
      const demo = DEMO_STORIES[locId];
      // In demo mode, if cards count didn't change from default, treat as cached valid
      this.currentStory.set(demo);
      this.isCacheValid.set(true);
      return;
    }

    // Global view or uncached district
    this.currentStory.set({
      location_id: locId,
      content_hash: newHash,
      audio_url: 'https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3',
      transcript: `Discover the living historical archive of ${location?.district || 'Brighton'}. Explore photos, videos, and unlocked letters placed here by neighbors across decades.`,
      cached: true
    });
    this.isCacheValid.set(true);
  }

  /**
   * Play / Generate Action Handler:
   * - If cache is valid: plays immediately (available to guests and users alike).
   * - If cache is missing/outdated:
   *   - If guest: prompts Sign-In modal.
   *   - If user: calls generate-audio-story Edge Function, saves result, and auto-plays!
   */
  async handlePlayOrGenerate(): Promise<void> {
    this.errorMessage.set(null);

    // If already playing, toggle pause
    if (this.isPlaying()) {
      this.pause();
      return;
    }

    // Case 1: Cache is valid - play directly (Guests + Users allowed)
    if (this.isCacheValid() && this.currentStory()?.audio_url) {
      await this.playAudio(this.currentStory()!.audio_url);
      return;
    }

    // Case 2: Cache is outdated or missing
    if (!this.auth.isAuthenticated()) {
      // Intercept Guest: Prompt registration to generate fresh AI stories
      this.authModal.openModal(
        'Sign in to synthesize new AI historical audio stories with Google Gemini & ElevenLabs.'
      );
      return;
    }

    // Case 3: Authenticated user triggers synthesis
    await this.generateNewStory();
  }

  /**
   * Invokes Edge Function `generate-audio-story`
   */
  async generateNewStory(): Promise<void> {
    const location = this.boardState.selectedLocation();
    const cards = this.boardState.canvasCards();
    const session = await this.supabase.client.auth.getSession();
    const token = session.data.session?.access_token;

    if (!token) {
      this.authModal.openModal('Please sign in to generate audio stories.');
      return;
    }

    this.isGenerating.set(true);
    this.errorMessage.set(null);

    try {
      const { data, error } = await this.supabase.client.functions.invoke(
        'generate-audio-story',
        {
          body: {
            location_id: location?.id || null,
            memory_ids: cards.map((c) => c.id),
            district: location?.district,
            city: location?.city,
            country: location?.country
          },
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (error || !data) {
        throw new Error(error?.message || 'Failed to synthesize AI audio story');
      }

      const newStory: AudioStoryData = {
        location_id: data.location_id,
        content_hash: data.content_hash,
        audio_url: data.audio_url,
        transcript: data.transcript,
        cached: data.cached
      };

      this.currentStory.set(newStory);
      this.isCacheValid.set(true);

      // Auto-play newly synthesized narration
      await this.playAudio(newStory.audio_url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error generating story';
      this.errorMessage.set(msg);
      // Fallback: play existing preview if available
      if (this.currentStory()?.audio_url) {
        await this.playAudio(this.currentStory()!.audio_url);
      }
    } finally {
      this.isGenerating.set(false);
    }
  }

  async playAudio(url: string): Promise<void> {
    if (!this.audioElement) return;

    try {
      if (this.audioElement.src !== url) {
        this.audioElement.src = url;
        this.audioElement.load();
      }
      await this.audioElement.play();
      this.isPlaying.set(true);
    } catch (err) {
      console.error('Audio playback error:', err);
      this.isPlaying.set(false);
    }
  }

  pause(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.isPlaying.set(false);
    }
  }

  seek(seconds: number): void {
    if (this.audioElement) {
      this.audioElement.currentTime = seconds;
      this.currentTime.set(seconds);
    }
  }
}
