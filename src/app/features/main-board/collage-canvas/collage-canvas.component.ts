import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BoardStateService } from '../../../core/services/board-state.service';
import { MemoryService } from '../../../core/services/memory.service';
import { AuthService } from '../../../core/services/auth.service';
import { AuthModalService } from '../../../core/services/auth-modal.service';
import { MemoryItem, CommentItem } from '../../../core/models/memory.model';

interface CardLayout {
  item: MemoryItem;
  left: string;
  top: string;
  rotate: number;
  zIndex: number;
}

@Component({
  selector: 'app-collage-canvas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="space-y-2">
      <!-- CANVAS HEADER BAR -->
      <div class="flex flex-wrap items-center justify-between gap-2 px-1">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-[#C85A32] animate-pulse"></span>
          <h2 class="text-xs font-bold uppercase tracking-wider text-[#6E665F]">
            @if (boardState.selectedLocation(); as loc) {
              Memories in {{ loc.district }}, {{ loc.city }}
            } @else {
              Latest 25 Hyperlocal Memories Across All Locations
            }
          </h2>
        </div>
        <span class="text-[11px] text-[#6E665F] select-none">
          Hover or tap to inspect • Click to expand
        </span>
      </div>

      <!-- STRATIFIED 5x5 COLLAGE BOARD -->
      <div 
        class="relative w-full h-[560px] sm:h-[660px] rounded-3xl border border-[#E5DDD3] overflow-hidden select-none shadow-inner"
        style="background: radial-gradient(circle at 20% 25%, rgba(200, 90, 50, 0.05), transparent 45%), radial-gradient(circle at 80% 75%, rgba(42, 111, 104, 0.06), transparent 50%), #F3EDE4;">
        
        <!-- Subtle Canvas Grid Marks -->
        <div class="absolute inset-0 opacity-15 pointer-events-none"
             style="background-image: radial-gradient(#6E665F 1px, transparent 1px); background-size: 28px 28px;">
        </div>

        @if (memoryService.isLoading()) {
          <div class="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-xs z-30">
            <div class="flex items-center gap-2 px-4 py-2 rounded-xl bg-white shadow-md text-xs font-semibold text-[#231F20]">
              <span class="animate-spin text-sm">⏳</span> Loading local memories...
            </div>
          </div>
        }

        <!-- 25 Stratified Jittered Cards (Enlarged ~7% for enhanced visual impact) -->
        @for (card of cardLayouts(); track card.item.id; let idx = $index) {
          <div 
            (click)="onCardClick(card.item)"
            [style.left]="card.left"
            [style.top]="card.top"
            [style.transform]="'rotate(' + card.rotate + 'deg)'"
            [style.z-index]="focusedCardId() === card.item.id ? 40 : card.zIndex"
            [class.scale-125]="focusedCardId() === card.item.id"
            [class.rotate-0]="focusedCardId() === card.item.id"
            [class.shadow-2xl]="focusedCardId() === card.item.id"
            [class.border-[#C85A32]]="focusedCardId() === card.item.id"
            class="absolute w-[19.5%] h-[19.2%] sm:w-[18.8%] sm:h-[18.8%] p-1 sm:p-1.5 rounded-xl border border-black/8 bg-white shadow-sm cursor-pointer transition-all duration-300 ease-out hover:scale-130 hover:rotate-0 hover:z-40 hover:shadow-2xl hover:border-[#C85A32] flex flex-col group">
            
            @if (card.item.type === 'letter') {
              <!-- Letter Paper Card -->
              <div class="w-full h-full rounded-lg bg-[#FFFDF7] border border-[#EBE3D7] p-1.5 sm:p-2.5 flex flex-col justify-between overflow-hidden">
                <div class="flex items-center justify-between text-[9px] sm:text-[10px] font-bold text-[#C85A32]">
                  <span>✉️ Letter</span>
                  <span class="truncate max-w-[70px]">{{ card.item.captured_at ? ('🗓️ ' + formatCardDate(card.item.captured_at)) : (card.item.location?.district || 'Sealed') }}</span>
                </div>
                <p class="font-serif-display text-[9px] sm:text-[10px] text-[#231F20] leading-snug line-clamp-3 sm:line-clamp-4 italic my-auto">
                  "{{ card.item.letter_text || card.item.title }}"
                </p>
                <div class="text-[8px] sm:text-[9px] text-[#6E665F] truncate">
                  &#64;{{ card.item.author_nickname || 'Neighbor' }}
                </div>
              </div>
            } @else {
              <!-- Photo or Video Card -->
              <div class="relative w-full h-full rounded-lg overflow-hidden bg-stone-900">
                @if (card.item.type === 'video') {
                  <video 
                    [src]="card.item.media_url" 
                    preload="metadata" 
                    muted 
                    playsinline 
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none">
                  </video>
                  <span class="absolute top-1 right-1 bg-black/75 backdrop-blur-xs text-white text-[8px] sm:text-[9px] px-1 py-0.5 rounded-md font-bold flex items-center gap-0.5 z-10 pointer-events-none">
                    <span>▶</span> 1m
                  </span>
                } @else {
                  <img 
                    [src]="card.item.media_url || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80'" 
                    [alt]="card.item.title"
                    loading="lazy"
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                }

                @if (card.item.captured_at) {
                  <span class="absolute top-1 left-1 bg-black/75 backdrop-blur-xs text-amber-200 text-[8px] sm:text-[9px] px-1 py-0.5 rounded font-mono font-bold z-10 pointer-events-none flex items-center gap-0.5">
                    <span>🗓️</span> {{ formatCardDate(card.item.captured_at) }}
                  </span>
                }

                <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-1 sm:p-1.5 z-10 pointer-events-none">
                  <p class="text-[9px] sm:text-[10px] text-white font-semibold truncate leading-tight">
                    {{ card.item.title }}
                  </p>
                  <p class="text-[8px] sm:text-[9px] text-stone-300 truncate">
                    &#64;{{ card.item.author_nickname }}
                  </p>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </section>

    <!-- FULL EXPANDED VIEW MODAL ON CLICK -->
    @if (activeExpandedMemory(); as item) {
      <div 
        class="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
        (click)="closeExpandedModal()">
        
        <div 
          class="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-[#E5DDD3] max-h-[92vh] flex flex-col"
          (click)="$event.stopPropagation()">
          
          <!-- Modal Header -->
          <div class="flex items-center justify-between px-5 py-3.5 border-b border-[#E5DDD3] bg-[#FAF7F2]">
            <div class="flex items-center gap-2">
              <span 
                [class.bg-[#F7E6DF]]="item.type === 'photo'"
                [class.text-[#C85A32]]="item.type === 'photo'"
                [class.bg-teal-50]="item.type === 'video'"
                [class.text-[#2A6F68]]="item.type === 'video'"
                [class.bg-stone-200]="item.type === 'letter'"
                [class.text-stone-800]="item.type === 'letter'"
                class="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md">
                {{ item.type }}
              </span>
              <h3 class="font-serif-display font-bold text-sm sm:text-base text-[#231F20] truncate max-w-[280px]">
                {{ item.title }}
              </h3>
            </div>

            <button 
              type="button"
              (click)="closeExpandedModal()"
              class="w-7 h-7 rounded-full bg-stone-200/80 hover:bg-stone-300 text-stone-700 flex items-center justify-center text-xs font-bold cursor-pointer">
              ✕
            </button>
          </div>

          <!-- Modal Scrollable Content -->
          <div class="p-5 space-y-4 overflow-y-auto flex-1">
            <!-- Media / Text Container -->
            <div class="rounded-2xl overflow-hidden bg-stone-100 border border-[#E5DDD3]">
              @if (item.type === 'letter') {
                <div class="p-6 bg-[#FFFDF7] font-serif-display text-sm sm:text-base text-[#231F20] leading-relaxed italic border-l-4 border-[#C85A32] whitespace-pre-wrap break-words max-h-[60vh] overflow-y-auto">
                  "{{ item.letter_text || item.title }}"
                </div>
              } @else if (item.type === 'video') {
                <div class="relative bg-black flex items-center justify-center rounded-2xl overflow-hidden min-h-[220px]">
                  <video 
                    [src]="item.media_url" 
                    controls 
                    autoplay 
                    playsinline 
                    class="w-full max-h-[60vh] object-contain rounded-2xl bg-black">
                  </video>
                </div>
              } @else {
                <img 
                  [src]="item.media_url" 
                  [alt]="item.title"
                  class="w-full max-h-84 object-cover" />
              }
            </div>

            <!-- Metadata Info Bar -->
            <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-[#6E665F] bg-[#FAF7F2] px-3.5 py-2.5 rounded-xl border border-[#E5DDD3]">
              <span>👤 Author: <strong class="text-[#231F20]">&#64;{{ item.author_nickname }}</strong></span>
              <span>📍 <strong class="text-[#231F20]">{{ item.location?.district }}, {{ item.location?.city }}</strong></span>
              @if (item.captured_at) {
                <span class="text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
                  <span>🗓️ Captured:</span> <strong>{{ formatCardDateFull(item.captured_at) }}</strong>
                </span>
              } @else {
                <span>📅 Posted: {{ item.created_at | date:'mediumDate' }}</span>
              }
            </div>

            <!-- Community Comments Section -->
            <div class="space-y-2.5 pt-1">
              <h4 class="text-xs font-bold uppercase tracking-wider text-[#6E665F] flex items-center gap-1.5">
                <span>💬 Community Notes & Comments</span>
                <span class="text-[10px] font-normal text-stone-400">({{ comments().length }})</span>
              </h4>

              <!-- Comments List -->
              <div class="space-y-2 max-h-44 overflow-y-auto pr-1">
                @if (comments().length === 0) {
                  <p class="text-xs text-[#6E665F] italic py-2">
                    No memories shared in comments yet. Be the first to leave a warm note!
                  </p>
                } @else {
                  @for (comm of comments(); track comm.id) {
                    <div class="bg-[#FAF7F2] p-2.5 rounded-xl text-xs border border-[#EFE8DF] space-y-0.5">
                      <div class="flex justify-between items-center text-[10px] text-[#6E665F]">
                        <strong class="text-[#231F20]">&#64;{{ comm.author_nickname }}</strong>
                        <span>{{ comm.created_at | date:'shortTime' }}</span>
                      </div>
                      <p class="text-[#3B3531]">{{ comm.content }}</p>
                    </div>
                  }
                }
              </div>

              <!-- Comment Input Form (protected via requireAuth) -->
              <div class="flex gap-2 pt-1.5">
                <input 
                  type="text" 
                  [(ngModel)]="newCommentText"
                  (keyup.enter)="submitComment()"
                  placeholder="Leave a warm note on this memory..."
                  class="flex-1 px-3 py-2 rounded-xl border border-[#D8CEC2] text-xs bg-[#FAF7F2] focus:bg-white focus:outline-none focus:border-[#C85A32]" />
                <button 
                  type="button"
                  (click)="submitComment()"
                  [disabled]="isPostingComment() || !newCommentText.trim()"
                  class="px-4 py-2 rounded-xl bg-[#231F20] hover:bg-[#C85A32] active:scale-95 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-50">
                  {{ isPostingComment() ? 'Posting...' : 'Post' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class CollageCanvasComponent {
  readonly boardState = inject(BoardStateService);
  readonly memoryService = inject(MemoryService);
  private auth = inject(AuthService);
  private authModal = inject(AuthModalService);

  readonly activeExpandedMemory = signal<MemoryItem | null>(null);
  readonly focusedCardId = signal<string | null>(null);
  readonly comments = signal<CommentItem[]>([]);
  readonly isPostingComment = signal<boolean>(false);
  newCommentText = '';

  constructor() {
    effect(() => {
      const loc = this.boardState.selectedLocation();
      this.memoryService.loadCanvasMemories(loc ? loc.id : null);
    });
  }

  /**
   * Deterministic 5x5 Stratified Jittered Grid computation.
   * Assigns row/col slots, offset (±12%), tilt (-4° to +4°), and bounded overlap <= 25%.
   */
  readonly cardLayouts = computed<CardLayout[]>(() => {
    const items = this.boardState.canvasCards();
    return items.slice(0, 25).map((item, idx) => {
      const row = Math.floor(idx / 5);
      const col = idx % 5;

      const hash = this.hashString(item.id);
      const seed1 = ((hash * 37) % 100) / 100 - 0.5;
      const seed2 = ((hash * 73) % 100) / 100 - 0.5;
      const rotate = (((hash * 19) % 9) - 4); // -4 deg to +4 deg

      // Base percentage position for 5x5 grid with enlarged cards
      const baseLeft = col * 19.3 + 1.2;
      const baseTop = row * 19.3 + 1.2;

      // Deterministic Jitter capped to guarantee overlap <= 25% of card area
      const jitterX = seed1 * 2.5;
      const jitterY = seed2 * 2.5;

      const left = Math.max(0.5, Math.min(79.5, baseLeft + jitterX));
      const top = Math.max(0.5, Math.min(79.5, baseTop + jitterY));
      const zIndex = (idx % 12) + 1;

      return {
        item,
        left: `${left}%`,
        top: `${top}%`,
        rotate,
        zIndex
      };
    });
  });

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  formatCardDate(isoDate?: string | null): string {
    if (!isoDate) return '';
    try {
      const parts = isoDate.split('-');
      if (parts.length >= 2) {
        const year = parts[0];
        const monthNum = parseInt(parts[1], 10) - 1;
        const d = new Date(parseInt(year, 10), monthNum, parts[2] ? parseInt(parts[2], 10) : 1);
        return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
      }
      return isoDate;
    } catch {
      return isoDate;
    }
  }

  formatCardDateFull(isoDate?: string | null): string {
    if (!isoDate) return '';
    try {
      const parts = isoDate.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      }
      return isoDate;
    } catch {
      return isoDate;
    }
  }

  onCardClick(item: MemoryItem): void {
    this.openExpandedModal(item);
  }

  async openExpandedModal(item: MemoryItem): Promise<void> {
    this.activeExpandedMemory.set(item);
    this.newCommentText = '';
    const comms = await this.memoryService.fetchComments(item.id);
    this.comments.set(comms);
  }

  closeExpandedModal(): void {
    this.activeExpandedMemory.set(null);
    this.comments.set([]);
    this.newCommentText = '';
  }

  async submitComment(): Promise<void> {
    const memory = this.activeExpandedMemory();
    if (!memory) return;

    if (!this.auth.isAuthenticated()) {
      this.authModal.openModal('Sign in to leave a comment on this memory.');
      return;
    }

    const trimmed = this.newCommentText.trim();
    if (!trimmed) return;

    this.isPostingComment.set(true);
    const res = await this.memoryService.addComment(memory.id, trimmed);
    this.isPostingComment.set(false);

    if (res.success && res.comment) {
      this.comments.update((prev) => [...prev, res.comment!]);
      this.newCommentText = '';
    }
  }
}
