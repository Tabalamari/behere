import { Component, inject, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AiAudioService } from '../../../core/services/ai-audio.service';
import { BoardStateService } from '../../../core/services/board-state.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-audio-story-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="bg-white rounded-3xl p-3.5 sm:p-4 border border-[#E5DDD3] shadow-sm space-y-2.5 transition-all relative overflow-hidden">
      <!-- Native HTML5 Audio Element in DOM for 100% reliable Chrome/Safari playback -->
      <audio 
        #audioPlayer 
        [src]="audio.currentAudioUrl()" 
        preload="auto"
        (timeupdate)="onAudioTimeUpdate(audioPlayer)"
        (loadedmetadata)="onAudioLoadedMetadata(audioPlayer)"
        (durationchange)="onAudioLoadedMetadata(audioPlayer)"
        (ended)="onAudioEnded()"
        (play)="onAudioPlay()"
        (playing)="onAudioPlay()"
        (error)="onAudioError(audioPlayer)"
        class="hidden">
      </audio>
      <!-- Top Row: Badge + Status + Expand Transcript Toggle -->
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg bg-[#C85A32]/10 text-[#C85A32] flex items-center justify-center font-bold text-sm">
            🏛️
          </div>
          <div>
            <div class="flex items-center gap-1.5 flex-wrap">
              <h3 class="font-serif-display text-sm font-bold text-[#231F20] leading-none">
                AI Local Historian
              </h3>
              <span class="text-xs text-[#6E665F]">
                • {{ boardState.selectedLocation()?.district || 'Global Brighton Archive' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Cache Status Badge -->
        <div class="flex items-center gap-2">
          @if (audio.isCacheValid()) {
            <span 
              title="Narration matches all visible memories on the Canvas"
              class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold flex items-center gap-1 shadow-2xs">
              <span>✓</span>
              <span>Archival Audio Ready</span>
            </span>
          } @else {
            <span 
              title="New memories were added to this district. Click to synthesize fresh audio narration."
              class="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-semibold flex items-center gap-1 shadow-2xs">
              <span>⚡</span>
              <span>New Memories Added</span>
            </span>
          }

          <!-- Transcript Toggle -->
          <button
            type="button"
            (click)="isTranscriptOpen.set(!isTranscriptOpen())"
            class="px-2.5 py-1 rounded-lg text-[11px] font-medium text-[#6E665F] hover:text-[#231F20] hover:bg-stone-100 transition cursor-pointer">
            {{ isTranscriptOpen() ? 'Hide Script ▲' : 'Read Script ▼' }}
          </button>
        </div>
      </div>

      <!-- Main Controls Bar: Play/Pause/Stop Buttons + Audio Progress + Timers -->
      <div class="flex items-center gap-2.5 sm:gap-4 bg-[#FAF7F2] p-2.5 sm:p-3 rounded-2xl border border-[#E5DDD3]">
        <!-- CONTROLS GROUP: PLAY/PAUSE + STOP -->
        <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
          @if (audio.isGenerating()) {
            <!-- Loading Spinner Button -->
            <button
              type="button"
              disabled
              title="Generating spoken narration..."
              class="w-11 h-11 rounded-2xl bg-[#C85A32] text-white flex items-center justify-center shadow-sm shrink-0 opacity-80 cursor-wait">
              <span class="animate-spin text-base">⏳</span>
            </button>
          } @else if (audio.isPlaying()) {
            <!-- EXPLICIT PAUSE BUTTON -->
            <button
              type="button"
              (click)="onPauseClick()"
              title="Pause spoken narration"
              aria-label="Pause spoken narration"
              class="w-11 h-11 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center shadow-sm shrink-0 transition-transform active:scale-95 cursor-pointer">
              <!-- Pause Icon -->
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
              </svg>
            </button>
          } @else {
            <!-- PLAY / RESUME BUTTON -->
            <button
              type="button"
              (click)="onPlayClick()"
              [title]="audio.currentTime() > 0 ? 'Resume spoken narration' : 'Play spoken narration'"
              [attr.aria-label]="audio.currentTime() > 0 ? 'Resume spoken narration' : 'Play spoken narration'"
              class="w-11 h-11 rounded-2xl bg-[#C85A32] hover:bg-[#B34E2A] text-white flex items-center justify-center shadow-sm shrink-0 transition-transform active:scale-95 cursor-pointer">
              <!-- Play / Resume Icon -->
              <svg class="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </button>
          }

          <!-- Dedicated Stop & Reset Button (visible whenever playback has started or paused) -->
          @if (audio.isPlaying() || audio.currentTime() > 0) {
            <button
              type="button"
              (click)="onStopClick()"
              title="Stop playback and rewind to beginning"
              aria-label="Stop playback"
              class="w-11 h-11 rounded-2xl bg-white hover:bg-stone-100 text-[#6E665F] hover:text-[#231F20] border border-[#E5DDD3] flex items-center justify-center shadow-xs shrink-0 transition-transform active:scale-95 cursor-pointer">
              <!-- Stop Icon -->
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h12v12H6z"/>
              </svg>
            </button>
          }
        </div>

        <!-- Progress & Text Section -->
        <div class="flex-1 min-w-0 flex flex-col justify-center gap-1">
          <div class="flex items-center justify-between text-[11px] text-[#6E665F]">
            @if (audio.isGenerating()) {
              <span class="font-medium text-[#C85A32] animate-pulse">
                Researching district history with Gemini 2.5 Flash & ElevenLabs...
              </span>
            } @else if (audio.isPlaying()) {
              <span class="truncate font-semibold text-[#C85A32] flex items-center gap-1.5">
                <span class="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Now Playing: {{ audio.currentStory()?.audio_url ? 'Archival Spoken Narration' : 'Local Historian Speech (TTS)' }}
              </span>
            } @else if (audio.currentTime() > 0) {
              <span class="truncate font-medium text-amber-800 flex items-center gap-1.5">
                <span class="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
                Paused — Click to resume
              </span>
            } @else if (!audio.isCacheValid() && !auth.isAuthenticated()) {
              <span class="text-amber-800 font-medium truncate">
                Board updated! Sign in to generate new AI narration.
              </span>
            } @else if (!audio.isCacheValid()) {
              <span class="text-amber-800 font-medium truncate">
                Board updated. Click Play to synthesize new narration.
              </span>
            } @else {
              <span class="truncate font-medium text-[#231F20]">
                {{ audio.currentStory()?.audio_url ? 'Archival Spoken Narration' : 'Local Historian Speech (TTS)' }}
              </span>
            }

            <span class="font-mono text-[10px] tabular-nums shrink-0 ml-2">
              {{ formattedCurrentTime() }} / {{ formattedDuration() }}
            </span>
          </div>

          <!-- Clickable Progress Bar -->
          <div
            (click)="onScrubProgress($event)"
            class="relative w-full h-2.5 bg-stone-200/90 rounded-full overflow-hidden cursor-pointer group">
            <div
              class="h-full bg-[#C85A32] rounded-full transition-all duration-100"
              [style.width.%]="progressPercentage()"></div>
          </div>
        </div>
      </div>

      <!-- EXPANDABLE TRANSCRIPT DRAWER -->
      @if (isTranscriptOpen()) {
        <div class="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E5DDD3] text-xs leading-relaxed text-[#3B3531] font-serif animate-fadeIn relative">
          <div class="flex items-center justify-between text-[10px] uppercase font-mono tracking-wider text-[#6E665F] mb-1.5">
            <span>Archival Spoken Script</span>
            <span>Verified Factual History</span>
          </div>
          <p class="italic">
            "{{ audio.currentStory()?.transcript }}"
          </p>
        </div>
      }

      <!-- ERROR ALERT -->
      @if (audio.errorMessage()) {
        <div class="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-center justify-between gap-2">
          <span>⚠️ {{ audio.errorMessage() }}</span>
          <button 
            type="button" 
            (click)="audio.errorMessage.set(null)"
            class="text-rose-700 font-bold px-1 cursor-pointer">
            ✕
          </button>
        </div>
      }
    </section>
  `
})
export class AudioStoryBarComponent {
  readonly audio = inject(AiAudioService);
  readonly boardState = inject(BoardStateService);
  readonly auth = inject(AuthService);

  @ViewChild('audioPlayer') audioPlayerRef?: ElementRef<HTMLAudioElement>;

  readonly isTranscriptOpen = signal<boolean>(false);

  readonly progressPercentage = computed(() => {
    const cur = this.audio.currentTime();
    const dur = this.audio.duration();
    if (!dur || dur <= 0) return 0;
    return Math.min(100, Math.max(0, (cur / dur) * 100));
  });

  readonly formattedCurrentTime = computed(() => {
    return this.formatTime(this.audio.currentTime());
  });

  readonly formattedDuration = computed(() => {
    return this.formatTime(this.audio.duration());
  });

  onPlayClick(): void {
    const el = this.audioPlayerRef?.nativeElement;
    this.audio.handlePlayOrGenerate(el);
  }

  onPauseClick(): void {
    const el = this.audioPlayerRef?.nativeElement;
    this.audio.pause(el);
  }

  onStopClick(): void {
    const el = this.audioPlayerRef?.nativeElement;
    this.audio.stop(el);
  }

  onAudioTimeUpdate(el: HTMLAudioElement): void {
    if (!this.audio.isUsingTTSActive()) {
      this.audio.currentTime.set(el.currentTime);
      if (!el.paused && !this.audio.isPlaying()) {
        this.audio.isPlaying.set(true);
      }
    }
  }

  onAudioLoadedMetadata(el: HTMLAudioElement): void {
    if (!this.audio.isUsingTTSActive() && el.duration && !isNaN(el.duration)) {
      this.audio.duration.set(el.duration);
    }
  }

  onAudioEnded(): void {
    this.audio.isPlaying.set(false);
    this.audio.currentTime.set(0);
  }

  onAudioPlay(): void {
    if (!this.audio.isUsingTTSActive()) {
      this.audio.isPlaying.set(true);
    }
  }

  onAudioError(el: HTMLAudioElement): void {
    if (!this.audio.isUsingTTSActive() && this.audio.isPlaying()) {
      console.warn('DOM Audio playback error:', el.error);
      const transcript = this.audio.currentStory()?.transcript;
      if (transcript) {
        this.audio.playSpeechSynthesis(transcript);
      }
    }
  }

  onScrubProgress(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const ratio = Math.min(1, Math.max(0, clickX / rect.width));
    const targetSeconds = ratio * this.audio.duration();
    const el = this.audioPlayerRef?.nativeElement;
    this.audio.seek(targetSeconds, el);
  }

  private formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
