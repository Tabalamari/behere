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
  'preston-park': {
    location_id: 'loc-1',
    content_hash: 'demo-preston-hash',
    audio_url: '/audio/preston-park.mp3',
    transcript:
      'Welcome to Preston Park, Brighton\'s oldest and largest municipal park, laid out in the 1880s on the former grounds of historic Preston Manor. The park is renowned worldwide for the Preston Twins—magnificent English elms believed to be over four hundred years old, having survived Dutch elm disease. Generations of residents have walked beneath these ancient canopies, finding solace amidst coastal sea breezes.',
    cached: true
  },
  'north-laine': {
    location_id: 'loc-2',
    content_hash: 'demo-north-laine-hash',
    audio_url: '/audio/north-laine.mp3',
    transcript:
      'Welcome to North Laine, a historic maze of Victorian commercial and residential streets. Originally five open agricultural strips known as "laines" in medieval times, the area transformed in the nineteenth century with artisans and railway workers. Today, its historic shopfronts, bookshops, and murals stand as a monument to community-driven urban preservation.',
    cached: true
  },
  'hove-seafront': {
    location_id: 'loc-3',
    content_hash: 'demo-hove-hash',
    audio_url: '/audio/brighton-global.mp3',
    transcript:
      'Welcome to the historic Hove Seafront. Developed in the Regency and early Victorian eras with expansive lawns and pastel-hued beach huts, this promenade preserves the distinguished architectural legacy of Decimus Burton and the Brunswick estate. The pebbled shores continue to gather generations of bathers and dreamers gazing across the English Channel.',
    cached: true
  },
  'brighton-global': {
    location_id: null,
    content_hash: 'demo-global-hash',
    audio_url: '/audio/brighton-global.mp3',
    transcript:
      'Welcome to the living historical archive of Brighton. For generations, this coastal town has gathered artists, travelers, and neighbors beneath sea breezes and Victorian promenades. From the historic elm avenues of Preston Park to the vibrant artisan lanes of North Laine, each memory preserved here safeguards the authentic spirit of this community.',
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
  readonly duration = signal<number>(28);
  readonly errorMessage = signal<string | null>(null);

  readonly currentAudioUrl = computed(() => {
    return this.currentStory()?.audio_url || '';
  });

  isUsingTTSActive(): boolean {
    return this.isUsingTTS;
  }

  // Audio HTML5 Element
  private audioElement: HTMLAudioElement | null = null;
  private currentHash: string = '';

  // Web Speech Synthesis (TTS) State
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private ttsTimer: any = null;
  private ttsStartTime: number = 0;
  private isUsingTTS: boolean = false;

  constructor() {
    this.initAudioElement();

    // Whenever location or canvas cards change, verify and prepare audio story
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
      if (this.audioElement && !this.isUsingTTS) {
        this.currentTime.set(this.audioElement.currentTime);
      }
    });

    this.audioElement.addEventListener('loadedmetadata', () => {
      if (this.audioElement && this.audioElement.duration && !isNaN(this.audioElement.duration) && !this.isUsingTTS) {
        this.duration.set(this.audioElement.duration);
      }
    });

    this.audioElement.addEventListener('durationchange', () => {
      if (this.audioElement && this.audioElement.duration && !isNaN(this.audioElement.duration) && !this.isUsingTTS) {
        this.duration.set(this.audioElement.duration);
      }
    });

    this.audioElement.addEventListener('ended', () => {
      this.isPlaying.set(false);
      this.currentTime.set(0);
    });

    this.audioElement.addEventListener('pause', () => {
      if (!this.isUsingTTS && this.audioElement && this.audioElement.currentTime > 0 && this.audioElement.paused) {
        this.isPlaying.set(false);
      }
    });

    this.audioElement.addEventListener('play', () => {
      if (!this.isUsingTTS) {
        this.isPlaying.set(true);
      }
    });

    this.audioElement.addEventListener('error', () => {
      if (!this.isUsingTTS) {
        console.warn('Audio stream error, switching to Speech Synthesis fallback');
        const text = this.currentStory()?.transcript;
        if (text) {
          this.playSpeechSynthesis(text);
        } else {
          this.isPlaying.set(false);
          this.errorMessage.set('Failed to play audio stream.');
        }
      }
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
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      if (this.ttsTimer) clearInterval(this.ttsTimer);
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
          this.duration.set(28);
          return;
        }
      }
    } catch {
      // Fallback
    }

    // Match by District Name or initial demo story
    const matched = this.getStoryForLocation(location, cards, newHash);
    this.currentStory.set(matched);
    this.isCacheValid.set(true);
    this.duration.set(
      matched.audio_url
        ? 28
        : Math.max(10, Math.round(matched.transcript.split(/\s+/).length / 2.3))
    );
  }

  private getStoryForLocation(
    location: LocationPin | null,
    cards: MemoryItem[],
    hash: string
  ): AudioStoryData {
    const districtLower = (location?.district || '').toLowerCase();
    const city = location?.city || 'Brighton';
    const district = location?.district || 'Brighton';

    if (districtLower.includes('preston')) {
      return {
        ...DEMO_STORIES['preston-park'],
        location_id: location?.id || 'loc-1',
        content_hash: hash
      };
    }

    if (districtLower.includes('laine')) {
      return {
        ...DEMO_STORIES['north-laine'],
        location_id: location?.id || 'loc-2',
        content_hash: hash
      };
    }

    if (districtLower.includes('hove')) {
      return {
        ...DEMO_STORIES['hove-seafront'],
        location_id: location?.id || 'loc-3',
        content_hash: hash
      };
    }

    // Dynamic contextual narration for any other district worldwide
    if (location?.district) {
      const memoryTitles = cards
        .slice(0, 3)
        .map((c) => c.title)
        .filter(Boolean)
        .join(', ');
      const memoryContext = memoryTitles
        ? ` Reflecting local moments like "${memoryTitles}", this`
        : ' This';
      return {
        location_id: location.id,
        content_hash: hash,
        audio_url: '', // Speaks live via Speech Synthesis
        transcript: `Welcome to the neighborhood archive of ${district}, ${city}.${memoryContext} collective memory board preserves the living history, atmosphere, and human stories of our shared streets. Every photo, video, and time-capsule letter safeguarded here ensures that today's quiet everyday moments remain vivid for future generations.`,
        cached: true
      };
    }

    // Global Brighton overview
    return {
      ...DEMO_STORIES['brighton-global'],
      location_id: null,
      content_hash: hash
    };
  }

  /**
   * Play / Pause / Synthesize Action Handler
   */
  async handlePlayOrGenerate(audioEl?: HTMLAudioElement): Promise<void> {
    this.errorMessage.set(null);

    // 1. If currently playing, toggle pause
    if (this.isPlaying()) {
      this.pause(audioEl);
      return;
    }

    // 2. If TTS was paused mid-speech, resume
    if (this.isUsingTTS && typeof window !== 'undefined' && window.speechSynthesis?.paused) {
      window.speechSynthesis.resume();
      this.isPlaying.set(true);
      this.ttsTimer = setInterval(() => {
        this.currentTime.update((c) => Math.min(this.duration(), c + 0.2));
      }, 200);
      return;
    }

    const story = this.currentStory();
    const targetEl = audioEl || this.audioElement;

    // 3. If pre-recorded / cached audio URL exists, play immediately on DOM audio element!
    if (story?.audio_url && targetEl) {
      try {
        this.isUsingTTS = false;
        const resolvedUrl = new URL(story.audio_url, window.location.href).href;
        if (targetEl.src !== resolvedUrl) {
          targetEl.src = resolvedUrl;
        }
        targetEl.volume = 1.0;
        targetEl.muted = false;
        await targetEl.play();
        this.isPlaying.set(true);
        return;
      } catch (err) {
        console.warn('Native HTML5 Audio play failed or blocked, falling back to Web Speech Synthesis:', err);
      }
    }

    // 4. If user is logged in, attempt real-time ElevenLabs generation via Supabase Edge Function
    if (this.auth.isAuthenticated()) {
      const success = await this.generateElevenLabsStory(targetEl);
      if (success) return;
    }

    // 5. Fallback: synthesize immediately with Web Speech
    if (story?.transcript) {
      this.playSpeechSynthesis(story.transcript);
    }
  }

  /**
   * Invokes the deployed Supabase Edge Function `generate-audio-story` (Gemini + ElevenLabs)
   */
  async generateElevenLabsStory(targetEl?: HTMLAudioElement | null): Promise<boolean> {
    const session = await this.supabase.client.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) return false;

    const location = this.boardState.selectedLocation();
    const cards = this.boardState.canvasCards();

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

      if (!error && data?.audio_url) {
        const newStory: AudioStoryData = {
          location_id: data.location_id,
          content_hash: data.content_hash,
          audio_url: data.audio_url,
          transcript: data.transcript || this.currentStory()?.transcript || '',
          cached: true
        };
        this.currentStory.set(newStory);
        this.isCacheValid.set(true);
        this.duration.set(28);
        if (targetEl) {
          targetEl.src = new URL(newStory.audio_url, window.location.href).href;
          await targetEl.play();
          this.isUsingTTS = false;
          this.isPlaying.set(true);
        } else {
          await this.playAudio(newStory.audio_url);
        }
        return true;
      }
    } catch (err) {
      console.warn('ElevenLabs Edge Function generation error, falling back:', err);
    } finally {
      this.isGenerating.set(false);
    }
    return false;
  }

  /**
   * Direct HTML5 Audio playback with safe URL resolution
   */
  async playAudio(url: string): Promise<void> {
    if (typeof window === 'undefined') return;

    if (!this.audioElement) {
      this.initAudioElement();
    }

    try {
      const resolvedUrl = new URL(url, window.location.href).href;
      if (this.audioElement && this.audioElement.src !== resolvedUrl) {
        this.audioElement.src = resolvedUrl;
      }

      if (this.audioElement) {
        await this.audioElement.play();
        this.isUsingTTS = false;
        this.isPlaying.set(true);
      }
    } catch (err) {
      console.warn('HTMLAudioElement play failed or blocked, falling back to Web Speech Synthesis:', err);
      const text = this.currentStory()?.transcript;
      if (text) {
        this.playSpeechSynthesis(text);
      } else {
        this.isPlaying.set(false);
      }
    }
  }

  /**
   * Browser-native Speech Synthesis (TTS) engine
   */
  playSpeechSynthesis(text: string): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.errorMessage.set('Audio narration is not supported in this browser.');
      return;
    }

    if (this.audioElement) {
      this.audioElement.pause();
    }

    window.speechSynthesis.cancel();
    if (this.ttsTimer) clearInterval(this.ttsTimer);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Natural') ||
            v.name.includes('Google') ||
            v.name.includes('Samantha') ||
            v.name.includes('Daniel') ||
            v.name.includes('Alex'))
      ) || voices.find((v) => v.lang.startsWith('en'));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const estDuration = Math.max(10, Math.round(wordCount / 2.3));
    this.duration.set(estDuration);

    this.ttsStartTime = Date.now();
    this.isUsingTTS = true;

    utterance.onstart = () => {
      this.isPlaying.set(true);
      this.ttsTimer = setInterval(() => {
        const elapsed = (Date.now() - this.ttsStartTime) / 1000;
        if (elapsed <= this.duration()) {
          this.currentTime.set(elapsed);
        } else {
          this.currentTime.set(this.duration());
        }
      }, 200);
    };

    utterance.onend = () => {
      this.isPlaying.set(false);
      this.currentTime.set(0);
      if (this.ttsTimer) clearInterval(this.ttsTimer);
    };

    utterance.onerror = (err) => {
      console.warn('SpeechSynthesis error:', err);
      this.isPlaying.set(false);
      if (this.ttsTimer) clearInterval(this.ttsTimer);
    };

    this.currentUtterance = utterance;
    this.isPlaying.set(true);
    window.speechSynthesis.speak(utterance);
  }

  pause(audioEl?: HTMLAudioElement): void {
    if (this.isUsingTTS && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
      if (this.ttsTimer) clearInterval(this.ttsTimer);
      this.isPlaying.set(false);
      return;
    }

    const targetEl = audioEl || this.audioElement;
    if (targetEl) {
      targetEl.pause();
      this.isPlaying.set(false);
    }
  }

  stop(audioEl?: HTMLAudioElement): void {
    const targetEl = audioEl || this.audioElement;
    if (targetEl) {
      targetEl.pause();
      targetEl.currentTime = 0;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      if (this.ttsTimer) clearInterval(this.ttsTimer);
    }
    this.isPlaying.set(false);
    this.currentTime.set(0);
    this.isUsingTTS = false;
  }

  seek(seconds: number, audioEl?: HTMLAudioElement): void {
    this.currentTime.set(seconds);
    const targetEl = audioEl || this.audioElement;
    if (!this.isUsingTTS && targetEl) {
      targetEl.currentTime = seconds;
    }
  }
}
