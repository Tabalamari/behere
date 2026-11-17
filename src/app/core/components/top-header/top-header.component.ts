import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { BoardStateService } from '../../services/board-state.service';
import { AuthService } from '../../services/auth.service';
import { AuthModalService } from '../../services/auth-modal.service';

@Component({
  selector: 'app-top-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="border-b border-[#E5DDD3] bg-[#FAF7F2]/95 backdrop-blur sticky top-0 z-20 px-4 md:px-8 py-2.5 transition-all">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <!-- Brand Logo & Title -->
        <div 
          (click)="onLogoClick()"
          class="flex items-center gap-2.5 cursor-pointer group select-none"
          title="Reset to global view">
          <div class="w-9 h-9 rounded-xl bg-[#C85A32] text-white flex items-center justify-center shadow-sm shrink-0 group-hover:scale-105 transition-transform">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2"
                d="M12 21s-6-5.686-6-10a6 6 0 1112 0c0 4.314-6 10-6 10z" />
              <circle cx="12" cy="11" r="2.2" fill="currentColor" />
            </svg>
          </div>
          <div>
            <h1 class="font-serif-display text-xl font-bold tracking-tight text-[#231F20] leading-none group-hover:text-[#C85A32] transition-colors">
              Be HERE
            </h1>
            <p class="hidden xs:block text-[11px] text-[#6E665F] mt-0.5 tracking-wide">
              Hyperlocal Collective Memory
            </p>
          </div>
        </div>

        <!-- Right Section: Live Counters + About + Auth -->
        <div class="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
          <!-- Live Counters -->
          <div class="flex items-center gap-1.5">
            <!-- Padlock / Locked Letters -->
            <div 
              [title]="'Locked Time-Capsule Letters in ' + (boardState.selectedLocation()?.district || 'all districts')"
              class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100/90 border border-amber-300 text-amber-900 text-xs font-semibold shadow-xs">
              <span class="text-xs">🔒</span>
              <span class="tabular-nums font-mono">{{ boardState.lockedLettersCount() }}</span>
              <span class="hidden md:inline text-[10px] text-amber-800 font-normal">sealed</span>
            </div>

            <!-- Hand / Total Users -->
            <div 
              title="Total registered platform participants"
              class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100/90 border border-rose-200 text-rose-900 text-xs font-semibold shadow-xs">
              <span class="text-xs">✋</span>
              <span class="tabular-nums font-mono">{{ boardState.totalUsersCount() }}</span>
              <span class="hidden md:inline text-[10px] text-rose-800 font-normal">members</span>
            </div>
          </div>

          <!-- Actions: About & Auth / Cabinet -->
          <div class="flex items-center gap-1.5 ml-auto sm:ml-0">
            <button 
              type="button"
              (click)="openAboutModal()"
              class="px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#6E665F] hover:text-[#231F20] hover:bg-stone-200/60 transition cursor-pointer">
              About
            </button>

            @if (auth.isAuthenticated()) {
              <div class="flex items-center gap-1">
                <a 
                  routerLink="/cabinet"
                  class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#2A6F68] text-white hover:bg-[#215953] transition shadow-xs flex items-center gap-1">
                  <span>👤</span>
                  <span class="max-w-[110px] truncate">{{ auth.currentUser()?.nickname || 'Cabinet' }}</span>
                </a>
                <button
                  type="button"
                  (click)="signOut()"
                  title="Sign out"
                  class="p-1.5 rounded-lg text-xs text-[#6E665F] hover:text-[#C85A32] hover:bg-stone-200/60 transition cursor-pointer">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            } @else {
              <button 
                type="button"
                (click)="openSignIn()"
                class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#231F20] text-white hover:bg-[#3A3537] transition shadow-xs whitespace-nowrap cursor-pointer">
                SignIn
              </button>
            }
          </div>
        </div>
      </div>

      <!-- Dismissible Walkthrough Tip Banner for Unauthenticated Guests -->
      @if (showGuestTip()) {
        <div class="mt-2 px-3 py-1.5 rounded-xl bg-[#F7E6DF] border border-[#E8C5B8] text-[11px] text-[#6B2D16] flex items-center justify-between gap-2 animate-fadeIn">
          <div>
            <strong class="font-semibold">Walkthrough Tip:</strong>
            <span> You are browsing as a <b>Guest</b>. Try "Wish for me", tap any district pin on the Map, or test <b>Add Memory</b> to authenticate.</span>
          </div>
          <button 
            type="button"
            (click)="dismissGuestTip()"
            title="Dismiss tip"
            class="text-[#6B2D16]/70 hover:text-[#6B2D16] font-bold px-1.5 py-0.5 rounded text-xs cursor-pointer">
            ✕
          </button>
        </div>
      }
    </header>

    <!-- ABOUT MODAL DIALOG -->
    @if (isAboutOpen()) {
      <div 
        class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
        (click)="closeAboutModal()">
        <div 
          class="bg-[#FAF7F2] rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-[#E5DDD3] relative max-h-[90vh] overflow-y-auto"
          (click)="$event.stopPropagation()">
          
          <div class="flex items-center justify-between border-b border-[#E5DDD3] pb-3">
            <div class="flex items-center gap-2">
              <span class="text-xl">📍</span>
              <h2 class="font-serif-display text-xl font-bold text-[#231F20]">About Be HERE</h2>
            </div>
            <button 
              type="button"
              (click)="closeAboutModal()"
              class="w-8 h-8 rounded-full bg-stone-200/80 hover:bg-stone-300 text-stone-700 flex items-center justify-center font-bold text-sm transition cursor-pointer">
              ✕
            </button>
          </div>

          <p class="text-xs text-[#3B3531] leading-relaxed">
            <strong>Be HERE</strong> is a hyperlocal memory platform dedicated to preserving the everyday living atmosphere of neighborhoods, historic quarters, and quiet corners. What seems mundane today becomes an invaluable historical artifact decades later.
          </p>

          <div class="grid grid-cols-1 gap-2.5 text-xs">
            <div class="bg-white p-3.5 rounded-2xl border border-[#E5DDD3] shadow-xs">
              <div class="font-bold text-[#231F20] text-sm mb-1 flex items-center gap-1.5">
                <span>⏳</span> Time-Capsule Letters
              </div>
              <p class="text-[#6E665F] leading-normal">
                Seal a message for the public district board or privately for your future self. Content is cryptographically locked until your chosen opening date.
              </p>
            </div>

            <div class="bg-white p-3.5 rounded-2xl border border-[#E5DDD3] shadow-xs">
              <div class="font-bold text-[#231F20] text-sm mb-1 flex items-center gap-1.5">
                <span>🏛️</span> AI Local Historian
              </div>
              <p class="text-[#6E665F] leading-normal">
                Multimodal AI recognizes historical landmarks in district photos and generates spoken narration of verified archival facts.
              </p>
            </div>

            <div class="bg-white p-3.5 rounded-2xl border border-[#E5DDD3] shadow-xs">
              <div class="font-bold text-[#231F20] text-sm mb-1 flex items-center gap-1.5">
                <span>💌</span> Global Warmth Pool
              </div>
              <p class="text-[#6E665F] leading-normal">
                Leave an anonymous encouraging wish for a stranger anywhere in the world, or draw one whenever you need calm and inspiration.
              </p>
            </div>
          </div>

          <div class="pt-2 flex justify-end">
            <button
              type="button"
              (click)="closeAboutModal()"
              class="px-5 py-2 rounded-xl bg-[#231F20] text-white text-xs font-semibold hover:bg-[#3A3537] transition cursor-pointer">
              Explore Board
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class TopHeaderComponent {
  readonly boardState = inject(BoardStateService);
  readonly auth = inject(AuthService);
  private authModal = inject(AuthModalService);
  private router = inject(Router);

  readonly isAboutOpen = signal<boolean>(false);
  private isTipDismissed = signal<boolean>(false);

  // Visible strictly while the user is not authenticated and has not dismissed it
  readonly showGuestTip = computed(() => !this.auth.isAuthenticated() && !this.isTipDismissed());

  onLogoClick(): void {
    this.boardState.clearLocation();
    this.router.navigate(['/']);
  }

  openAboutModal(): void {
    this.isAboutOpen.set(true);
  }

  closeAboutModal(): void {
    this.isAboutOpen.set(false);
  }

  openSignIn(): void {
    this.authModal.openModal('Sign in to create memories and time-capsule letters.');
  }

  signOut(): void {
    this.auth.signOut();
  }

  dismissGuestTip(): void {
    this.isTipDismissed.set(true);
  }
}
