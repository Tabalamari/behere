import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WishService } from '../../../core/services/wish.service';
import { AuthService } from '../../../core/services/auth.service';
import { AuthModalService } from '../../../core/services/auth-modal.service';

@Component({
  selector: 'app-wishes-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="bg-white border border-[#E5DDD3] rounded-2xl p-3.5 shadow-xs transition-all">
      <div class="flex flex-wrap items-center justify-between gap-2.5">
        <!-- Action Buttons -->
        <div class="flex items-center gap-2">
          <!-- Wish for me -->
          <button 
            type="button"
            (click)="onWishForMe()"
            [disabled]="wishService.isLoading()"
            class="px-3.5 py-2 rounded-xl bg-[#2A6F68] hover:bg-[#215953] active:scale-95 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50">
            <span>✨</span>
            <span>{{ wishService.isLoading() ? 'Drawing...' : 'Wish for me' }}</span>
          </button>

          <!-- Add Wish -->
          <button 
            type="button"
            (click)="onAddWishClick()"
            class="px-3.5 py-2 rounded-xl bg-[#FAF7F2] hover:bg-[#F2ECE1] border border-[#D8CEC2] text-[#231F20] text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer">
            <span>💌</span>
            <span>Add Wish</span>
          </button>
        </div>

        <!-- Tagline -->
        <span class="text-[11px] text-[#6E665F] select-none">
          Global warmth pool • Not tied to location
        </span>
      </div>

      <!-- Displayed Wish Banner -->
      @if (wishService.isWishOpen() && wishService.currentWish(); as wish) {
        <div class="mt-3 pt-3 border-t border-dashed border-[#E5DDD3] flex items-start justify-between gap-3 animate-fadeIn">
          <div class="flex items-start gap-2.5">
            <span class="text-base select-none mt-0.5">🌿</span>
            <div>
              <p class="text-xs font-medium text-[#231F20] italic leading-relaxed">
                "{{ wish.content }}"
              </p>
              <p class="text-[11px] text-[#6E665F] mt-1 flex items-center gap-1.5">
                <span>— {{ wish.author_nickname || 'A fellow traveler' }}</span>
                <span class="text-stone-300">•</span>
                <span class="text-[10px]">{{ wish.created_at | date:'mediumDate' }}</span>
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <button 
              type="button"
              (click)="onWishForMe()"
              title="Draw next wish"
              class="text-[11px] text-[#2A6F68] font-semibold hover:underline cursor-pointer flex items-center gap-0.5">
              <span>Next</span>
              <span>→</span>
            </button>
            <button 
              type="button"
              (click)="wishService.closeWish()"
              title="Close wish"
              class="w-5 h-5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 flex items-center justify-center text-xs font-bold cursor-pointer">
              ✕
            </button>
          </div>
        </div>
      }
    </section>

    <!-- ADD WISH MODAL -->
    @if (isModalOpen()) {
      <div 
        class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
        (click)="closeModal()">
        <div 
          class="bg-white rounded-3xl max-w-md w-full p-5 space-y-3.5 shadow-2xl border border-[#E5DDD3] relative"
          (click)="$event.stopPropagation()">
          
          <div class="flex items-center justify-between border-b border-[#E5DDD3] pb-2.5">
            <div class="flex items-center gap-2">
              <span class="text-lg">💌</span>
              <h3 class="font-serif-display font-bold text-base text-[#231F20]">Send a Wish to a Stranger</h3>
            </div>
            <button 
              type="button"
              (click)="closeModal()"
              class="w-7 h-7 rounded-full bg-stone-200/80 hover:bg-stone-300 flex items-center justify-center text-xs font-bold text-stone-700 cursor-pointer">
              ✕
            </button>
          </div>

          <p class="text-xs text-[#6E665F]">
            Your words will join the global warmth pool and will brighten a random person's day across any city or country.
          </p>

          <div class="space-y-1">
            <textarea 
              [(ngModel)]="newWishContent" 
              maxlength="500" 
              rows="4" 
              placeholder="May you find an unexpected reason to smile today..."
              class="w-full p-3 rounded-2xl border border-[#D8CEC2] text-xs focus:outline-none focus:border-[#2A6F68] focus:ring-1 focus:ring-[#2A6F68]/20 bg-[#FAF7F2] resize-none leading-relaxed">
            </textarea>
            <div class="flex justify-between items-center text-[10px] text-[#6E665F] px-1">
              <span>Warm & anonymous</span>
              <span [class.text-amber-700]="newWishContent.length > 450">{{ newWishContent.length }} / 500</span>
            </div>
          </div>

          @if (errorMessage()) {
            <p class="text-xs text-rose-600 bg-rose-50 px-2.5 py-1.5 rounded-xl border border-rose-200">
              {{ errorMessage() }}
            </p>
          }

          <div class="pt-1 flex gap-2">
            <button 
              type="button"
              (click)="closeModal()"
              class="flex-1 py-2.5 rounded-xl border border-[#D8CEC2] text-xs font-semibold text-[#6E665F] hover:bg-stone-100 transition cursor-pointer">
              Cancel
            </button>
            <button 
              type="button"
              (click)="submitWish()"
              [disabled]="wishService.isPosting() || !newWishContent.trim()"
              class="flex-1 py-2.5 rounded-xl bg-[#2A6F68] hover:bg-[#215953] active:scale-95 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50">
              {{ wishService.isPosting() ? 'Sending...' : 'Send Wish ✨' }}
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class WishesPanelComponent {
  readonly wishService = inject(WishService);
  private auth = inject(AuthService);
  private authModal = inject(AuthModalService);

  readonly isModalOpen = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  newWishContent = '';

  onWishForMe(): void {
    this.wishService.fetchRandomWish();
  }

  onAddWishClick(): void {
    if (!this.auth.isAuthenticated()) {
      this.authModal.openModal('Sign in to leave a warm wish in the global pool.');
      return;
    }
    this.newWishContent = '';
    this.errorMessage.set(null);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.errorMessage.set(null);
  }

  async submitWish(): Promise<void> {
    if (!this.newWishContent.trim()) return;

    this.errorMessage.set(null);
    const result = await this.wishService.addWish(this.newWishContent);
    if (result.success) {
      this.closeModal();
    } else {
      this.errorMessage.set(result.error || 'Failed to submit wish.');
    }
  }
}
