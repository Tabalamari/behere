import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { MemoryService, LockedLetterItem } from '../../core/services/memory.service';
import { MemoryItem } from '../../core/models/memory.model';

interface CountdownDisplay {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
  isExpired: boolean;
}

@Component({
  selector: 'app-user-cabinet',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  template: `
    <div class="space-y-4 sm:space-y-5 animate-fadeIn pb-8">
      <!-- HEADER CARD -->
      <section class="bg-white rounded-3xl p-6 sm:p-8 border border-[#E5DDD3] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div class="flex items-center gap-4">
          <div class="w-16 h-16 rounded-2xl bg-[#2A6F68] text-white flex items-center justify-center text-2xl font-bold shadow-md shrink-0">
            {{ userInitial() }}
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="font-serif-display text-2xl sm:text-3xl font-bold text-[#231F20]">
                &#64;{{ auth.currentUser()?.nickname }}
              </h1>
              @if (auth.isEmailConfirmed()) {
                <span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold flex items-center gap-1">
                  <span>✓</span>
                  <span>Verified Member</span>
                </span>
              } @else {
                <span class="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-semibold flex items-center gap-1">
                  <span>⚠️</span>
                  <span>Unverified Email</span>
                </span>
              }
            </div>
            <p class="text-xs text-[#6E665F] mt-1 flex items-center gap-2">
              <span>Hyperlocal Contributor</span>
              <span>•</span>
              <span>Joined {{ formattedJoinDate() }}</span>
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <a
            routerLink="/"
            class="px-4 py-2.5 rounded-xl border border-[#E5DDD3] bg-[#FAF7F2] hover:bg-stone-100 text-xs font-semibold text-[#231F20] transition flex items-center gap-2 shadow-xs cursor-pointer">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to District Board</span>
          </a>
        </div>
      </section>

      <!-- NAVIGATION TABS -->
      <nav class="flex items-center gap-2 border-b border-[#E5DDD3] overflow-x-auto pb-2 scrollbar-none">
        <button
          type="button"
          (click)="activeTab.set('profile')"
          [class.border-[#C85A32]]="activeTab() === 'profile'"
          [class.text-[#C85A32]]="activeTab() === 'profile'"
          [class.border-transparent]="activeTab() !== 'profile'"
          [class.text-[#6E665F]]="activeTab() !== 'profile'"
          class="px-4 py-2 text-xs sm:text-sm font-semibold border-b-2 hover:text-[#231F20] transition whitespace-nowrap cursor-pointer flex items-center gap-2">
          <span>⚙️</span>
          <span>Profile Settings</span>
        </button>

        <button
          type="button"
          (click)="activeTab.set('unlocked-letters')"
          [class.border-[#C85A32]]="activeTab() === 'unlocked-letters'"
          [class.text-[#C85A32]]="activeTab() === 'unlocked-letters'"
          [class.border-transparent]="activeTab() !== 'unlocked-letters'"
          [class.text-[#6E665F]]="activeTab() !== 'unlocked-letters'"
          class="px-4 py-2 text-xs sm:text-sm font-semibold border-b-2 hover:text-[#231F20] transition whitespace-nowrap cursor-pointer flex items-center gap-2">
          <span>📜</span>
          <span>Unlocked Letters</span>
          <span class="px-2 py-0.5 rounded-full bg-stone-100 text-[10px] text-[#231F20]">
            {{ unlockedLetters().length }}
          </span>
        </button>

        <button
          type="button"
          (click)="activeTab.set('sealed-capsules')"
          [class.border-[#C85A32]]="activeTab() === 'sealed-capsules'"
          [class.text-[#C85A32]]="activeTab() === 'sealed-capsules'"
          [class.border-transparent]="activeTab() !== 'sealed-capsules'"
          [class.text-[#6E665F]]="activeTab() !== 'sealed-capsules'"
          class="px-4 py-2 text-xs sm:text-sm font-semibold border-b-2 hover:text-[#231F20] transition whitespace-nowrap cursor-pointer flex items-center gap-2">
          <span>🔒</span>
          <span>Sealed Time Capsules</span>
          <span class="px-2 py-0.5 rounded-full bg-amber-100 text-[10px] text-amber-900 font-bold">
            {{ sealedLetters().length }}
          </span>
        </button>

        <button
          type="button"
          (click)="activeTab.set('media')"
          [class.border-[#C85A32]]="activeTab() === 'media'"
          [class.text-[#C85A32]]="activeTab() === 'media'"
          [class.border-transparent]="activeTab() !== 'media'"
          [class.text-[#6E665F]]="activeTab() !== 'media'"
          class="px-4 py-2 text-xs sm:text-sm font-semibold border-b-2 hover:text-[#231F20] transition whitespace-nowrap cursor-pointer flex items-center gap-2">
          <span>📸</span>
          <span>My Photos & Videos</span>
          <span class="px-2 py-0.5 rounded-full bg-stone-100 text-[10px] text-[#231F20]">
            {{ mediaList().length }}
          </span>
        </button>
      </nav>

      <!-- TAB 1: PROFILE SETTINGS -->
      @if (activeTab() === 'profile') {
        <section class="bg-white rounded-3xl p-6 sm:p-8 border border-[#E5DDD3] shadow-sm max-w-xl space-y-6 animate-fadeIn">
          <div>
            <h2 class="font-serif-display text-xl font-bold text-[#231F20]">Profile Settings</h2>
            <p class="text-xs text-[#6E665F] mt-1">
              Update your public display name. Nicknames are unique across the Be HERE collective memory archive.
            </p>
          </div>

          <!-- SUCCESS / ERROR ALERTS -->
          @if (profileSuccess()) {
            <div class="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <span>✓</span>
              <span>{{ profileSuccess() }}</span>
            </div>
          }

          @if (profileError()) {
            <div class="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <span>⚠️</span>
              <span>{{ profileError() }}</span>
            </div>
          }

          <!-- EMAIL VERIFICATION STATUS CARD -->
          <div 
            class="p-4 rounded-2xl border space-y-2.5 transition"
            [ngClass]="auth.isEmailConfirmed() ? 'bg-emerald-50/50 border-emerald-200' : 'bg-amber-50/80 border-amber-300'"
          >
            <div class="flex items-center justify-between flex-wrap gap-2">
              <div>
                <span class="text-xs font-semibold text-[#231F20] block">Account Email</span>
                <span class="font-mono text-xs text-[#6E665F]">{{ auth.userEmail() }}</span>
              </div>
              <div>
                @if (auth.isEmailConfirmed()) {
                  <span class="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold flex items-center gap-1">
                    <span>✓</span>
                    <span>Email Confirmed</span>
                  </span>
                } @else {
                  <span class="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-[11px] font-semibold flex items-center gap-1">
                    <span>⚠️</span>
                    <span>Confirmation Required</span>
                  </span>
                }
              </div>
            </div>

            @if (!auth.isEmailConfirmed()) {
              <div class="pt-2 border-t border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p class="text-[11px] text-amber-900 leading-relaxed">
                  We sent a confirmation email to your email address. Please click the link in your inbox to verify.
                </p>
                <button
                  type="button"
                  [disabled]="isResendingInCabinet()"
                  (click)="onResendCabinetEmail()"
                  class="px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-[#C85A32] text-xs font-semibold hover:bg-stone-50 disabled:opacity-60 transition shrink-0 cursor-pointer flex items-center gap-1"
                >
                  @if (isResendingInCabinet()) {
                    <span class="w-3 h-3 border-2 border-[#C85A32] border-t-transparent rounded-full animate-spin"></span>
                    <span>Sending...</span>
                  } @else if (cabinetResendSuccess()) {
                    <span class="text-emerald-700">✓ Resent!</span>
                  } @else {
                    <span>Resend email</span>
                  }
                </button>
              </div>
            }
          </div>

          <form [formGroup]="profileForm" (ngSubmit)="onSaveProfile()" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-[#231F20] mb-1.5">
                Nickname
              </label>
              <div class="relative">
                <span class="absolute left-3 top-2.5 text-stone-400 font-mono text-sm">&#64;</span>
                <input
                  type="text"
                  formControlName="nickname"
                  class="w-full pl-8 pr-4 py-2.5 bg-[#FAF7F2] border border-[#E5DDD3] rounded-xl text-sm font-mono text-[#231F20] focus:outline-hidden focus:border-[#C85A32] transition"
                  placeholder="new_nickname" />
              </div>
              @if (profileForm.get('nickname')?.touched && profileForm.get('nickname')?.invalid) {
                <p class="text-[11px] text-rose-600 mt-1">
                  Nickname must be 2 to 30 characters (letters, numbers, underscores or hyphens).
                </p>
              }
            </div>

            <div class="pt-2">
              <button
                type="submit"
                [disabled]="profileForm.invalid || isSavingProfile()"
                class="px-5 py-2.5 rounded-xl bg-[#231F20] text-white text-xs font-semibold hover:bg-[#3A3537] disabled:opacity-50 transition shadow-xs flex items-center gap-2 cursor-pointer">
                @if (isSavingProfile()) {
                  <span class="animate-spin text-sm">⏳</span>
                  <span>Updating nickname...</span>
                } @else {
                  <span>Save Changes</span>
                }
              </button>
            </div>
          </form>
        </section>
      }

      <!-- TAB 2: MY UNLOCKED PRIVATE LETTERS ("FOR MYSELF") -->
      @if (activeTab() === 'unlocked-letters') {
        <section class="space-y-4 animate-fadeIn">
          <div class="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 text-xs text-amber-900 leading-relaxed flex items-start gap-3">
            <span class="text-xl shrink-0">📜</span>
            <div>
              <strong class="font-semibold">Private Archive ("For Myself"):</strong>
              <p class="mt-0.5 text-amber-800">
                These letters were sealed by you in the past and configured as private. Now that their unlock date has passed, their full text is decrypted and accessible exclusively to you.
              </p>
            </div>
          </div>

          @if (isLoadingLetters()) {
            <div class="py-12 text-center text-xs text-[#6E665F]">
              <span class="animate-spin text-xl inline-block mb-2">⏳</span>
              <p>Opening private archive...</p>
            </div>
          } @else if (unlockedLetters().length === 0) {
            <div class="bg-white rounded-3xl p-10 border border-[#E5DDD3] text-center space-y-3">
              <span class="text-4xl">✉️</span>
              <h3 class="font-serif-display text-lg font-bold text-[#231F20]">No Unlocked Private Letters Yet</h3>
              <p class="text-xs text-[#6E665F] max-w-md mx-auto">
                You haven't written any private letters that have reached their opening date. When you seal a letter "For Myself" on the main board, it will open here.
              </p>
              <a
                routerLink="/"
                class="inline-block mt-2 px-4 py-2 rounded-xl bg-[#C85A32] text-white text-xs font-semibold hover:bg-[#B34E2A] transition shadow-xs">
                Write a Letter
              </a>
            </div>
          } @else {
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              @for (letter of unlockedLetters(); track letter.id) {
                <article class="bg-[#FBF9F5] rounded-3xl p-6 border border-[#E5DDD3] shadow-sm hover:shadow-md transition space-y-4 relative flex flex-col justify-between">
                  <div>
                    <!-- Badge & Date Header -->
                    <div class="flex items-center justify-between text-[11px] text-[#6E665F] border-b border-[#E5DDD3] pb-3 mb-3">
                      <span class="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold flex items-center gap-1">
                        <span>🔓</span> Unlocked
                      </span>
                      <span>Unlocked: {{ formatReadableDate(letter.unlock_date) }}</span>
                    </div>

                    <!-- Title & District -->
                    <h3 class="font-serif-display text-lg font-bold text-[#231F20] leading-snug">
                      {{ letter.title }}
                    </h3>
                    <p class="text-xs text-[#6E665F] mt-1 flex items-center gap-1">
                      <span>📍</span>
                      <span>{{ letter.location?.district || 'District Board' }}, {{ letter.location?.city || 'Brighton' }}</span>
                    </p>

                    <!-- Letter Body in vintage paper quote style -->
                    <div class="mt-4 p-4 rounded-2xl bg-white border border-[#E5DDD3] text-xs font-serif italic text-[#3B3531] leading-relaxed shadow-xs whitespace-pre-wrap break-words max-h-72 overflow-y-auto">
                      "{{ letter.letter_text }}"
                    </div>
                  </div>

                  <div class="pt-3 border-t border-[#E5DDD3] flex items-center justify-between text-[11px] text-[#6E665F]">
                    <span>Written on {{ formatReadableDate(letter.created_at) }}</span>
                    <span class="font-mono text-[10px] bg-stone-100 px-2 py-0.5 rounded text-stone-500">Private</span>
                  </div>
                </article>
              }
            </div>
          }
        </section>
      }

      <!-- TAB 3: MY SEALED TIME CAPSULES (LIVE COUNTDOWN TIMERS) -->
      @if (activeTab() === 'sealed-capsules') {
        <section class="space-y-4 animate-fadeIn">
          <div class="bg-stone-100/80 border border-[#E5DDD3] rounded-2xl p-4 text-xs text-[#231F20] leading-relaxed flex items-start gap-3">
            <span class="text-xl shrink-0">⏳</span>
            <div>
              <strong class="font-semibold">Cryptographically Sealed Content:</strong>
              <p class="mt-0.5 text-[#6E665F]">
                The letter text inside these capsules is locked in database storage. Nobody—including site administrators—can read the content until the countdown expires.
              </p>
            </div>
          </div>

          @if (isLoadingSealed()) {
            <div class="py-12 text-center text-xs text-[#6E665F]">
              <span class="animate-spin text-xl inline-block mb-2">⏳</span>
              <p>Checking sealed vault...</p>
            </div>
          } @else if (sealedLetters().length === 0) {
            <div class="bg-white rounded-3xl p-10 border border-[#E5DDD3] text-center space-y-3">
              <span class="text-4xl">🔒</span>
              <h3 class="font-serif-display text-lg font-bold text-[#231F20]">No Active Sealed Capsules</h3>
              <p class="text-xs text-[#6E665F] max-w-md mx-auto">
                You do not have any sealed letters waiting for unlock. Visit the main board to seal a future letter for the district or for your future self!
              </p>
              <a
                routerLink="/"
                class="inline-block mt-2 px-4 py-2 rounded-xl bg-[#231F20] text-white text-xs font-semibold hover:bg-[#3A3537] transition shadow-xs">
                Seal a Time Capsule
              </a>
            </div>
          } @else {
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              @for (capsule of sealedLetters(); track capsule.id) {
                @let timer = getCountdown(capsule.unlock_date);

                <article class="bg-white rounded-3xl p-6 border-2 border-amber-200/90 shadow-sm relative space-y-4 flex flex-col justify-between">
                  <div>
                    <!-- Header -->
                    <div class="flex items-center justify-between text-xs border-b border-amber-100 pb-3 mb-3">
                      <div class="flex items-center gap-1.5">
                        <span class="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[11px] flex items-center gap-1">
                          <span>🔒</span> Sealed
                        </span>
                        @if (capsule.is_private) {
                          <span class="px-2 py-0.5 rounded-full bg-stone-100 text-[#6E665F] text-[10px] font-semibold">
                            For Myself
                          </span>
                        } @else {
                          <span class="px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 text-[10px] font-semibold">
                            Public District
                          </span>
                        }
                      </div>

                      <span class="text-[11px] text-[#6E665F]">
                        Unlocks {{ formatReadableDate(capsule.unlock_date) }}
                      </span>
                    </div>

                    <!-- Title -->
                    <h3 class="font-serif-display text-lg font-bold text-[#231F20]">
                      {{ capsule.title }}
                    </h3>
                    <p class="text-xs text-[#6E665F] mt-1 flex items-center gap-1">
                      <span>📍</span>
                      <span>{{ capsule.location_name || 'District Board' }}</span>
                    </p>

                    <!-- LIVE COUNTDOWN TIMER (DAYS : HOURS : MINUTES : SECONDS) -->
                    <div class="mt-5 p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-center">
                      <p class="text-[10px] uppercase tracking-wider text-amber-800 font-bold mb-2">
                        Time Remaining Until Opening
                      </p>
                      
                      @if (timer.isExpired) {
                        <div class="py-2 text-emerald-700 font-bold text-sm flex items-center justify-center gap-2">
                          <span>🔓</span> Ready to unlock! Refresh to view.
                        </div>
                      } @else {
                        <div class="grid grid-cols-4 gap-2 max-w-xs mx-auto">
                          <div class="bg-white p-2 rounded-xl border border-amber-200 shadow-xs">
                            <span class="block text-lg font-mono font-bold text-amber-950 tabular-nums">{{ timer.days }}</span>
                            <span class="text-[9px] uppercase text-[#6E665F]">Days</span>
                          </div>
                          <div class="bg-white p-2 rounded-xl border border-amber-200 shadow-xs">
                            <span class="block text-lg font-mono font-bold text-amber-950 tabular-nums">{{ timer.hours }}</span>
                            <span class="text-[9px] uppercase text-[#6E665F]">Hours</span>
                          </div>
                          <div class="bg-white p-2 rounded-xl border border-amber-200 shadow-xs">
                            <span class="block text-lg font-mono font-bold text-amber-950 tabular-nums">{{ timer.minutes }}</span>
                            <span class="text-[9px] uppercase text-[#6E665F]">Min</span>
                          </div>
                          <div class="bg-white p-2 rounded-xl border border-amber-200 shadow-xs">
                            <span class="block text-lg font-mono font-bold text-amber-950 tabular-nums">{{ timer.seconds }}</span>
                            <span class="text-[9px] uppercase text-[#6E665F]">Sec</span>
                          </div>
                        </div>
                      }
                    </div>
                  </div>

                  <div class="pt-3 border-t border-[#E5DDD3] text-[11px] text-[#6E665F] flex items-center justify-between">
                    <span>Sealed on {{ formatReadableDate(capsule.created_at) }}</span>
                    <span class="text-amber-800 font-semibold text-[10px]">Content Protected</span>
                  </div>
                </article>
              }
            </div>
          }
        </section>
      }

      <!-- TAB 4: MY UPLOADED PHOTOS & VIDEOS (WITH DELETE WORKFLOW) -->
      @if (activeTab() === 'media') {
        <section class="space-y-4 animate-fadeIn">
          <div class="bg-white border border-[#E5DDD3] rounded-2xl p-4 text-xs text-[#231F20] leading-relaxed flex items-start gap-3 shadow-xs">
            <span class="text-xl shrink-0">🛡️</span>
            <div>
              <strong class="font-semibold">Media Ownership & Deletion:</strong>
              <p class="mt-0.5 text-[#6E665F]">
                You have full control over your media contributions. Deleting a photo or video removes it from the district board and calls Cloudflare R2 storage to permanently purge the asset file.
              </p>
            </div>
          </div>

          @if (deleteSuccess()) {
            <div class="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <span>✓</span>
              <span>{{ deleteSuccess() }}</span>
            </div>
          }

          @if (isLoadingMedia()) {
            <div class="py-12 text-center text-xs text-[#6E665F]">
              <span class="animate-spin text-xl inline-block mb-2">⏳</span>
              <p>Loading your media library...</p>
            </div>
          } @else if (mediaList().length === 0) {
            <div class="bg-white rounded-3xl p-10 border border-[#E5DDD3] text-center space-y-3">
              <span class="text-4xl">📷</span>
              <h3 class="font-serif-display text-lg font-bold text-[#231F20]">No Uploaded Media</h3>
              <p class="text-xs text-[#6E665F] max-w-md mx-auto">
                You haven't contributed any photos or videos yet. Capture or upload a local moment to help preserve the neighborhood's living memory.
              </p>
              <a
                routerLink="/"
                class="inline-block mt-2 px-4 py-2 rounded-xl bg-[#2A6F68] text-white text-xs font-semibold hover:bg-[#215953] transition shadow-xs">
                Upload First Photo
              </a>
            </div>
          } @else {
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              @for (item of mediaList(); track item.id) {
                <div class="bg-white rounded-3xl overflow-hidden border border-[#E5DDD3] shadow-sm flex flex-col justify-between group">
                  <!-- Media Preview Box -->
                  <div class="relative w-full h-48 bg-stone-200 overflow-hidden">
                    @if (item.type === 'video') {
                      <div class="w-full h-full bg-black flex items-center justify-center relative">
                        <video 
                          [src]="item.media_url" 
                          preload="metadata" 
                          muted 
                          playsinline 
                          class="w-full h-full object-cover">
                        </video>
                        <div class="absolute inset-0 bg-black/25 flex items-center justify-center pointer-events-none">
                          <div class="w-10 h-10 rounded-full bg-white/90 text-stone-900 flex items-center justify-center shadow-md text-xs font-bold">
                            ▶
                          </div>
                        </div>
                        <span class="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-mono pointer-events-none">
                          VIDEO
                        </span>
                      </div>
                    } @else {
                      <img
                        [src]="item.media_url"
                        [alt]="item.title"
                        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <span class="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-mono">
                        PHOTO
                      </span>
                    }
                  </div>

                  <!-- Details -->
                  <div class="p-4 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 class="font-serif-display font-bold text-sm text-[#231F20] line-clamp-1">
                        {{ item.title }}
                      </h4>
                      <p class="text-[11px] text-[#6E665F] flex items-center gap-1 mt-0.5">
                        <span>📍</span>
                        <span>{{ item.location?.district || 'District Board' }}</span>
                      </p>
                    </div>

                    <div class="pt-3 border-t border-[#E5DDD3] flex items-center justify-between">
                      <span class="text-[10px] text-[#6E665F]">
                        {{ item.captured_at ? ('🗓️ Captured ' + formatReadableDate(item.captured_at)) : formatReadableDate(item.created_at) }}
                      </span>
                      <button
                        type="button"
                        (click)="confirmDelete(item)"
                        class="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition flex items-center gap-1 cursor-pointer">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        </section>
      }

      <!-- CONFIRMATION MODAL FOR MEDIA DELETION -->
      @if (itemToDelete()) {
        <div 
          class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          (click)="cancelDelete()">
          <div 
            class="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#E5DDD3]"
            (click)="$event.stopPropagation()">
            
            <div class="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center text-xl font-bold">
              🗑️
            </div>

            <div>
              <h3 class="font-serif-display text-lg font-bold text-[#231F20]">Delete Memory Permanently?</h3>
              <p class="text-xs text-[#6E665F] mt-1.5 leading-relaxed">
                Are you sure you want to delete <strong>"{{ itemToDelete()?.title }}"</strong>? This action will remove it from the district board and permanently purge the file from Cloudflare R2 storage.
              </p>
            </div>

            <div class="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                (click)="cancelDelete()"
                [disabled]="isDeleting()"
                class="px-4 py-2 rounded-xl border border-[#E5DDD3] text-xs font-semibold text-[#231F20] hover:bg-stone-100 transition cursor-pointer">
                Cancel
              </button>

              <button
                type="button"
                (click)="executeDelete()"
                [disabled]="isDeleting()"
                class="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition flex items-center gap-1.5 shadow-xs cursor-pointer">
                @if (isDeleting()) {
                  <span class="animate-spin text-xs">⏳</span>
                  <span>Purging...</span>
                } @else {
                  <span>Delete Memory</span>
                }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class UserCabinetComponent implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  private memoryService = inject(MemoryService);
  private fb = inject(FormBuilder);

  readonly activeTab = signal<'profile' | 'unlocked-letters' | 'sealed-capsules' | 'media'>('profile');

  // Profile
  readonly profileForm: FormGroup;
  readonly isSavingProfile = signal<boolean>(false);
  readonly profileSuccess = signal<string | null>(null);
  readonly profileError = signal<string | null>(null);
  readonly isResendingInCabinet = signal<boolean>(false);
  readonly cabinetResendSuccess = signal<boolean>(false);

  // Unlocked letters
  readonly unlockedLetters = signal<MemoryItem[]>([]);
  readonly isLoadingLetters = signal<boolean>(false);

  // Sealed letters
  readonly sealedLetters = signal<LockedLetterItem[]>([]);
  readonly isLoadingSealed = signal<boolean>(false);

  // Media
  readonly mediaList = signal<MemoryItem[]>([]);
  readonly isLoadingMedia = signal<boolean>(false);
  readonly itemToDelete = signal<MemoryItem | null>(null);
  readonly isDeleting = signal<boolean>(false);
  readonly deleteSuccess = signal<string | null>(null);

  // Live timer tick
  private timerIntervalId: any = null;
  readonly currentTimeTick = signal<number>(Date.now());

  readonly userInitial = computed(() => {
    const nick = this.auth.currentUser()?.nickname;
    return nick ? nick.charAt(0).toUpperCase() : 'U';
  });

  constructor() {
    this.profileForm = this.fb.group({
      nickname: [
        this.auth.currentUser()?.nickname || '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(30),
          Validators.pattern(/^[a-zA-Z0-9_.-]+$/)
        ]
      ]
    });
  }

  ngOnInit(): void {
    this.loadAllCabinetData();

    // Setup live interval for countdown timer (ticks every 1s)
    this.timerIntervalId = setInterval(() => {
      this.currentTimeTick.set(Date.now());
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.timerIntervalId) {
      clearInterval(this.timerIntervalId);
    }
  }

  async loadAllCabinetData(): Promise<void> {
    await Promise.all([
      this.loadUnlockedLetters(),
      this.loadSealedLetters(),
      this.loadMedia()
    ]);
  }

  async loadUnlockedLetters(): Promise<void> {
    this.isLoadingLetters.set(true);
    try {
      const items = await this.memoryService.fetchUserUnlockedPrivateLetters();
      this.unlockedLetters.set(items);
    } finally {
      this.isLoadingLetters.set(false);
    }
  }

  async loadSealedLetters(): Promise<void> {
    this.isLoadingSealed.set(true);
    try {
      const items = await this.memoryService.fetchUserLockedLetters();
      this.sealedLetters.set(items);
    } finally {
      this.isLoadingSealed.set(false);
    }
  }

  async loadMedia(): Promise<void> {
    this.isLoadingMedia.set(true);
    try {
      const items = await this.memoryService.fetchUserMediaMemories();
      this.mediaList.set(items);
    } finally {
      this.isLoadingMedia.set(false);
    }
  }

  async onResendCabinetEmail(): Promise<void> {
    if (this.isResendingInCabinet()) return;
    this.isResendingInCabinet.set(true);
    this.cabinetResendSuccess.set(false);

    const res = await this.auth.resendConfirmationEmail();
    this.isResendingInCabinet.set(false);

    if (res.success) {
      this.cabinetResendSuccess.set(true);
      setTimeout(() => this.cabinetResendSuccess.set(false), 5000);
    }
  }

  async onSaveProfile(): Promise<void> {
    if (this.profileForm.invalid) return;

    this.isSavingProfile.set(true);
    this.profileSuccess.set(null);
    this.profileError.set(null);

    const newNickname = this.profileForm.value.nickname.trim();

    try {
      const res = await this.auth.updateNickname(newNickname);
      if (res.success) {
        this.profileSuccess.set('Nickname successfully updated!');
      } else {
        if (res.error?.includes('unique') || res.error?.includes('profiles_nickname_key')) {
          this.profileError.set('This nickname is already taken. Please choose another.');
        } else {
          this.profileError.set(res.error || 'Failed to update nickname.');
        }
      }
    } catch (err: unknown) {
      this.profileError.set('An error occurred while updating nickname.');
    } finally {
      this.isSavingProfile.set(false);
    }
  }

  getCountdown(unlockDateStr: string): CountdownDisplay {
    // Reading currentTimeTick signal triggers reactive re-evaluation
    const now = this.currentTimeTick();
    const target = new Date(unlockDateStr).getTime();
    const diff = target - now;

    if (diff <= 0) {
      return { days: '00', hours: '00', minutes: '00', seconds: '00', isExpired: true };
    }

    const totalSec = Math.floor(diff / 1000);
    const d = Math.floor(totalSec / 86400);
    const h = Math.floor((totalSec % 86400) / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;

    return {
      days: String(d).padStart(2, '0'),
      hours: String(h).padStart(2, '0'),
      minutes: String(m).padStart(2, '0'),
      seconds: String(s).padStart(2, '0'),
      isExpired: false
    };
  }

  confirmDelete(item: MemoryItem): void {
    this.itemToDelete.set(item);
  }

  cancelDelete(): void {
    this.itemToDelete.set(null);
  }

  async executeDelete(): Promise<void> {
    const item = this.itemToDelete();
    if (!item) return;

    this.isDeleting.set(true);
    this.deleteSuccess.set(null);

    try {
      const res = await this.memoryService.deleteUserMemory(item.id, item.media_url);
      if (res.success) {
        this.mediaList.update((items) => items.filter((m) => m.id !== item.id));
        this.deleteSuccess.set(`"${item.title}" successfully deleted and purged.`);
      }
    } finally {
      this.isDeleting.set(false);
      this.itemToDelete.set(null);
    }
  }

  formattedJoinDate(): string {
    const raw = this.auth.currentUser()?.created_at;
    if (!raw) return 'Recently';
    return this.formatReadableDate(raw);
  }

  formatReadableDate(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }
}
