import { Component, inject, signal, effect, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { BoardStateService } from '../../../core/services/board-state.service';
import { AuthService } from '../../../core/services/auth.service';
import { AuthModalService } from '../../../core/services/auth-modal.service';
import { OverpassGeoService } from '../../../core/services/overpass-geo.service';
import { R2UploadService } from '../../../core/services/r2-upload.service';
import { MemoryService } from '../../../core/services/memory.service';
import { LocationPin, MemoryType } from '../../../core/models/memory.model';

@Component({
  selector: 'app-controls-filter-bar',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <section class="space-y-2.5">
      <!-- MAIN CONTROLS ROW -->
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white border border-[#E5DDD3] rounded-2xl p-3 sm:p-3.5 shadow-xs">
        <!-- ROW 1 (or Left on desktop): Creation Action Buttons -->
        <div class="grid grid-cols-3 gap-2 w-full lg:w-auto">
          <button 
            type="button"
            (click)="onOpenCreateModal('photo')"
            class="py-2.5 px-3 rounded-xl bg-[#C85A32] hover:bg-[#B24D28] active:scale-95 text-white text-xs font-semibold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap">
            <span>📷</span>
            <span>Add Photo</span>
          </button>

          <button 
            type="button"
            (click)="onOpenCreateModal('video')"
            class="py-2.5 px-3 rounded-xl bg-[#C85A32] hover:bg-[#B24D28] active:scale-95 text-white text-xs font-semibold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap">
            <span>🎥</span>
            <span>Add Video</span>
          </button>

          <button 
            type="button"
            (click)="onOpenCreateModal('letter')"
            class="py-2.5 px-3 rounded-xl bg-[#231F20] hover:bg-[#3A3537] active:scale-95 text-white text-xs font-semibold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap">
            <span>✉️</span>
            <span>Add Letter</span>
          </button>
        </div>

        <!-- ROW 2 (or Right on desktop): Cascading Location Autocomplete Filters -->
        <div class="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full lg:w-auto">
          <!-- Country Filter -->
          <div class="relative flex-1 sm:w-36">
            <input 
              type="text" 
              placeholder="Country..."
              [ngModel]="boardState.filterCountry()"
              (ngModelChange)="onCountryInput($event)"
              (focus)="onCountryFocus()"
              (blur)="onBlurField('country')"
              class="w-full px-2.5 py-1.5 rounded-xl border border-[#D8CEC2] text-xs bg-[#FAF7F2] focus:bg-white focus:outline-none focus:border-[#C85A32] transition" />
            @if (countrySuggestions().length > 0) {
              <ul class="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-[#D8CEC2] rounded-xl shadow-lg max-h-48 overflow-y-auto text-xs py-1">
                @for (item of countrySuggestions(); track item.id) {
                  <li 
                    (mousedown)="selectCountry(item)"
                    class="px-3 py-1.5 hover:bg-stone-100 cursor-pointer text-[#231F20] truncate">
                    {{ item.country }}
                  </li>
                }
              </ul>
            }
          </div>

          <!-- City Filter -->
          <div class="relative flex-1 sm:w-36">
            <input 
              type="text" 
              placeholder="City..."
              [ngModel]="boardState.filterCity()"
              (ngModelChange)="onCityInput($event)"
              (focus)="onCityFocus()"
              (blur)="onBlurField('city')"
              class="w-full px-2.5 py-1.5 rounded-xl border border-[#D8CEC2] text-xs bg-[#FAF7F2] focus:bg-white focus:outline-none focus:border-[#C85A32] transition" />
            @if (citySuggestions().length > 0) {
              <ul class="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-[#D8CEC2] rounded-xl shadow-lg max-h-48 overflow-y-auto text-xs py-1">
                @for (item of citySuggestions(); track item.id) {
                  <li 
                    (mousedown)="selectCity(item)"
                    class="px-3 py-1.5 hover:bg-stone-100 cursor-pointer text-[#231F20] truncate">
                    {{ item.city }} <span class="text-[10px] text-[#6E665F]">({{ item.country }})</span>
                  </li>
                }
              </ul>
            }
          </div>

          <!-- District Filter -->
          <div class="relative flex-1 sm:w-40">
            <input 
              type="text" 
              placeholder="District..."
              [ngModel]="boardState.filterDistrict()"
              (ngModelChange)="onDistrictInput($event)"
              (focus)="onDistrictFocus()"
              (blur)="onBlurField('district')"
              class="w-full px-2.5 py-1.5 rounded-xl border border-[#D8CEC2] text-xs bg-[#FAF7F2] focus:bg-white focus:outline-none focus:border-[#C85A32] transition font-medium" />
            @if (districtSuggestions().length > 0) {
              <ul class="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-[#D8CEC2] rounded-xl shadow-lg max-h-48 overflow-y-auto text-xs py-1">
                @for (item of districtSuggestions(); track item.id) {
                  <li 
                    (mousedown)="selectDistrict(item)"
                    class="px-3 py-1.5 hover:bg-stone-100 cursor-pointer text-[#231F20] truncate flex items-center justify-between">
                    <span>📍 {{ item.district }}</span>
                    <span class="text-[10px] text-[#6E665F]">{{ item.city }}</span>
                  </li>
                }
              </ul>
            }
          </div>

          <!-- Reset Filter Button -->
          @if (boardState.hasActiveLocation() || boardState.filterCountry() || boardState.filterCity() || boardState.filterDistrict()) {
            <button 
              type="button" 
              (click)="resetFilters()"
              title="Reset location filters"
              class="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-[#6E665F] hover:text-[#231F20] text-xs font-semibold transition cursor-pointer shrink-0">
              ✕ Reset
            </button>
          }
        </div>
      </div>

      <!-- ACTIVE FILTER BADGE -->
      @if (boardState.selectedLocation(); as loc) {
        <div class="flex items-center justify-between px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 animate-fadeIn">
          <div class="flex items-center gap-1.5">
            <span class="text-sm">📍</span>
            <span>Filtering memories for: <strong>{{ loc.district }}</strong>, {{ loc.city }}</span>
          </div>
          <button 
            type="button"
            (click)="resetFilters()"
            class="text-xs font-semibold text-amber-800 hover:underline cursor-pointer">
            Show all districts
          </button>
        </div>
      }
    </section>

    <!-- CREATION MODAL DIALOG (ADD PHOTO / VIDEO / LETTER) -->
    @if (isCreateModalOpen()) {
      <div 
        class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
        (click)="closeCreateModal()">
        <div 
          class="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-[#E5DDD3] relative max-h-[92vh] overflow-y-auto"
          (click)="$event.stopPropagation()">
          
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-[#E5DDD3] pb-3">
            <div class="flex items-center gap-2">
              <span class="text-xl">
                {{ modalType() === 'photo' ? '📷' : modalType() === 'video' ? '🎥' : '✉️' }}
              </span>
              <div>
                <h3 class="font-serif-display font-bold text-lg text-[#231F20]">
                  {{ modalType() === 'photo' ? 'Add Photo Memory' : modalType() === 'video' ? 'Add Video Memory' : 'Add Time-Capsule Letter' }}
                </h3>
                <p class="text-[11px] text-[#6E665F]">
                  {{ modalType() === 'letter' ? 'Seal a message for the future' : 'Preserve a piece of your neighborhood' }}
                </p>
              </div>
            </div>
            <button 
              type="button"
              (click)="closeCreateModal()"
              class="w-8 h-8 rounded-full bg-stone-200/80 hover:bg-stone-300 text-stone-700 flex items-center justify-center font-bold text-xs cursor-pointer">
              ✕
            </button>
          </div>

          <!-- Form -->
          <form [formGroup]="createForm" (ngSubmit)="submitMemory()" class="space-y-3.5">
            <!-- Title -->
            <div>
              <label class="block text-xs font-semibold text-[#231F20] mb-1">
                Title / Caption *
              </label>
              <input 
                type="text" 
                formControlName="title"
                placeholder="e.g. Quiet evening at the neighborhood corner bakery"
                class="w-full px-3 py-2 rounded-xl border border-[#D8CEC2] text-xs bg-[#FAF7F2] focus:bg-white focus:outline-none focus:border-[#C85A32]" />
              @if (createForm.get('title')?.touched && createForm.get('title')?.invalid) {
                <span class="text-[11px] text-rose-600 mt-0.5 block">Title is required (min 3 chars).</span>
              }
            </div>

            <!-- Location Fields (Country, City, District) -->
            <div class="space-y-1.5 p-3 rounded-2xl bg-[#FAF7F2] border border-[#E5DDD3]">
              <span class="text-[11px] font-bold text-[#231F20] uppercase tracking-wider block">
                Location (Required) *
              </span>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label class="block text-[10px] text-[#6E665F] mb-0.5">Country</label>
                  <input 
                    type="text" 
                    formControlName="country"
                    placeholder="Country"
                    list="modal-country-list"
                    class="w-full px-2 py-1.5 rounded-lg border border-[#D8CEC2] text-xs bg-white focus:outline-none" />
                  <datalist id="modal-country-list">
                    @for (c of allCountries; track c) {
                      <option [value]="c"></option>
                    }
                  </datalist>
                </div>
                <div>
                  <label class="block text-[10px] text-[#6E665F] mb-0.5">City</label>
                  <input 
                    type="text" 
                    formControlName="city"
                    placeholder="City"
                    class="w-full px-2 py-1.5 rounded-lg border border-[#D8CEC2] text-xs bg-white focus:outline-none" />
                </div>
                <div>
                  <label class="block text-[10px] text-[#6E665F] mb-0.5">District</label>
                  <input 
                    type="text" 
                    formControlName="district"
                    placeholder="District"
                    class="w-full px-2 py-1.5 rounded-lg border border-[#D8CEC2] text-xs bg-white focus:outline-none font-medium" />
                </div>
              </div>
            </div>

            <!-- MEDIA UPLOAD SECTION (FOR PHOTO & VIDEO) -->
            @if (modalType() === 'photo' || modalType() === 'video') {
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <label class="block text-xs font-semibold text-[#231F20]">
                    Media File *
                  </label>
                  <span class="text-[10px] text-[#6E665F]">
                    Gallery or Camera
                  </span>
                </div>

                <!-- Hidden inputs: Gallery (without capture) and Camera (with capture="environment") -->
                <input 
                  #photoGalleryInput 
                  type="file" 
                  accept="image/*" 
                  class="hidden" 
                  (change)="onFileSelected($event)" />

                <input 
                  #photoCameraInput 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  class="hidden" 
                  (change)="onFileSelected($event)" />

                <input 
                  #videoGalleryInput 
                  type="file" 
                  accept="video/*" 
                  class="hidden" 
                  (change)="onFileSelected($event)" />

                <input 
                  #videoCameraInput 
                  type="file" 
                  accept="video/*" 
                  capture="environment" 
                  class="hidden" 
                  (change)="onFileSelected($event)" />

                <!-- Selection Buttons when no file selected -->
                @if (!selectedFile()) {
                  <div class="grid grid-cols-2 gap-2 sm:gap-3">
                    <!-- Option 1: Gallery / Device Files -->
                    <button
                      type="button"
                      (click)="triggerGalleryInput()"
                      class="p-3.5 sm:p-4 rounded-2xl border-2 border-dashed border-[#D8CEC2] hover:border-[#C85A32] bg-[#FAF7F2] hover:bg-[#F7E6DF]/30 text-center flex flex-col items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer group">
                      <div class="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white border border-[#E5DDD3] shadow-2xs flex items-center justify-center text-xl group-hover:scale-105 transition-transform">
                        🖼️
                      </div>
                      <div class="text-center">
                        <strong class="text-xs font-bold text-[#231F20] block">
                          {{ modalType() === 'photo' ? 'Photo Gallery' : 'Video Library' }}
                        </strong>
                        <span class="text-[10px] text-[#6E665F] leading-tight block mt-0.5">
                          Pick from device
                        </span>
                      </div>
                    </button>

                    <!-- Option 2: Live Camera Capture -->
                    <button
                      type="button"
                      (click)="triggerCameraInput()"
                      class="p-3.5 sm:p-4 rounded-2xl border-2 border-dashed border-[#D8CEC2] hover:border-[#C85A32] bg-[#FAF7F2] hover:bg-[#F7E6DF]/30 text-center flex flex-col items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer group">
                      <div class="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white border border-[#E5DDD3] shadow-2xs flex items-center justify-center text-xl group-hover:scale-105 transition-transform">
                        {{ modalType() === 'photo' ? '📸' : '🎬' }}
                      </div>
                      <div class="text-center">
                        <strong class="text-xs font-bold text-[#231F20] block">
                          {{ modalType() === 'photo' ? 'Take Photo' : 'Record Video' }}
                        </strong>
                        <span class="text-[10px] text-[#6E665F] leading-tight block mt-0.5">
                          Open live camera
                        </span>
                      </div>
                    </button>
                  </div>
                  <p class="text-[10px] sm:text-[11px] text-center text-[#6E665F]">
                    {{ modalType() === 'photo' ? 'Photos: JPG, PNG, WebP (max 5 MB)' : 'Videos: MP4, MOV (max 60 seconds)' }}
                  </p>
                } @else {
                  <!-- Media Preview Card -->
                  <div class="p-3 rounded-2xl bg-[#FAF7F2] border border-[#E5DDD3] space-y-2.5">
                    <div class="flex items-center gap-3">
                      @if (previewUrl()) {
                        @if (modalType() === 'photo') {
                          <img [src]="previewUrl()" class="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-xl border border-white shadow-2xs shrink-0" alt="Preview" />
                        } @else {
                          <div class="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-stone-900 text-white flex items-center justify-center text-2xl shrink-0">
                            ▶️
                          </div>
                        }
                      }
                      <div class="flex-1 min-w-0 text-xs">
                        <strong class="text-[#231F20] font-semibold block truncate text-[11px] sm:text-xs">
                          {{ selectedFile()?.name }}
                        </strong>
                        <span class="text-[#6E665F] text-[10px] sm:text-[11px] block mt-0.5">
                          {{ (selectedFile()!.size / (1024 * 1024)).toFixed(2) }} MB
                        </span>
                        <span class="text-emerald-700 font-semibold text-[10px] flex items-center gap-1 mt-0.5">
                          <span>✓</span> File ready for canvas
                        </span>
                      </div>
                    </div>

                    <!-- Change / Retake Action Row -->
                    <div class="flex items-center gap-1.5 pt-1 border-t border-[#E5DDD3]">
                      <button
                        type="button"
                        (click)="triggerGalleryInput()"
                        class="px-2.5 py-1 rounded-lg bg-white hover:bg-stone-100 text-[#231F20] border border-[#D8CEC2] text-[10px] sm:text-[11px] font-semibold flex items-center gap-1 transition active:scale-95 cursor-pointer">
                        <span>🖼️</span> Gallery
                      </button>
                      <button
                        type="button"
                        (click)="triggerCameraInput()"
                        class="px-2.5 py-1 rounded-lg bg-white hover:bg-stone-100 text-[#231F20] border border-[#D8CEC2] text-[10px] sm:text-[11px] font-semibold flex items-center gap-1 transition active:scale-95 cursor-pointer">
                        <span>📸</span> Camera
                      </button>
                      <button
                        type="button"
                        (click)="clearSelectedFile()"
                        class="ml-auto px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 text-[10px] sm:text-[11px] font-semibold transition active:scale-95 cursor-pointer">
                        ✕ Remove
                      </button>
                    </div>
                  </div>
                }

                @if (fileValidationError()) {
                  <p class="text-xs text-rose-600 bg-rose-50 p-2 rounded-xl border border-rose-200">
                    {{ fileValidationError() }}
                  </p>
                }

                <!-- Upload Progress Bar -->
                @if (uploadService.uploadState().isUploading) {
                  <div class="space-y-1">
                    <div class="flex justify-between text-[11px] text-[#6E665F]">
                      <span class="capitalize">{{ uploadService.uploadState().status }}...</span>
                      <span>{{ uploadService.uploadState().percentage }}%</span>
                    </div>
                    <div class="w-full h-2 rounded-full bg-stone-200 overflow-hidden">
                      <div 
                        class="h-full bg-[#C85A32] transition-all duration-200"
                        [style.width.%]="uploadService.uploadState().percentage">
                      </div>
                    </div>
                  </div>
                }
              </div>
            }

            <!-- TIME-CAPSULE LETTER SECTION -->
            @if (modalType() === 'letter') {
              <div class="space-y-3">
                <div>
                  <div class="flex justify-between text-xs mb-1">
                    <label class="font-semibold text-[#231F20]">
                      Time-Capsule Letter Text *
                    </label>
                    <span class="text-[11px] text-[#6E665F]">
                      {{ letterCharCount() }} / 500
                    </span>
                  </div>
                  <textarea 
                    formControlName="letterText"
                    maxlength="500" 
                    rows="4" 
                    placeholder="Write a message to be cryptographically sealed until future opening date..."
                    class="w-full p-3 rounded-xl border border-[#D8CEC2] text-xs bg-[#FAF7F2] focus:bg-white focus:outline-none focus:border-[#231F20] resize-none leading-relaxed">
                  </textarea>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label class="block text-[11px] font-semibold text-[#231F20] mb-1">
                      Unlock Date *
                    </label>
                    <input 
                      type="datetime-local" 
                      formControlName="unlockDate"
                      class="w-full px-2.5 py-1.5 rounded-xl border border-[#D8CEC2] text-xs bg-[#FAF7F2] focus:outline-none" />
                  </div>

                  <div>
                    <label class="block text-[11px] font-semibold text-[#231F20] mb-1">
                      Visibility *
                    </label>
                    <select 
                      formControlName="visibility"
                      class="w-full px-2.5 py-1.5 rounded-xl border border-[#D8CEC2] text-xs bg-[#FAF7F2] focus:outline-none">
                      <option value="public">Public (Canvas once unlocked)</option>
                      <option value="private">Private ("For Myself" in Cabinet)</option>
                    </select>
                  </div>
                </div>
              </div>
            }

            @if (formGeneralError()) {
              <p class="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                {{ formGeneralError() }}
              </p>
            }

            <!-- Submit Button -->
            <div class="pt-2 flex gap-2">
              <button 
                type="button"
                (click)="closeCreateModal()"
                class="flex-1 py-3 rounded-xl border border-[#D8CEC2] text-xs font-semibold text-[#6E665F] hover:bg-stone-100 active:scale-95 transition cursor-pointer">
                Cancel
              </button>

              <button 
                type="submit"
                [disabled]="isSubmitting() || (modalType() !== 'letter' && !selectedFile()) || createForm.invalid"
                class="flex-1 py-3 rounded-xl bg-[#C85A32] hover:bg-[#B24D28] active:scale-95 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50">
                {{ isSubmitting() ? 'Saving...' : 'Save to Canvas' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `
})
export class ControlsFilterBarComponent {
  readonly boardState = inject(BoardStateService);
  private auth = inject(AuthService);
  private authModal = inject(AuthModalService);
  private geoService = inject(OverpassGeoService);
  readonly uploadService = inject(R2UploadService);
  private memoryService = inject(MemoryService);
  private fb = inject(FormBuilder);

  @ViewChild('photoGalleryInput') photoGalleryInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('photoCameraInput') photoCameraInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('videoGalleryInput') videoGalleryInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('videoCameraInput') videoCameraInputRef?: ElementRef<HTMLInputElement>;

  readonly allCountries = this.geoService.getAllCountries();

  readonly countrySuggestions = signal<LocationPin[]>([]);
  readonly citySuggestions = signal<LocationPin[]>([]);
  readonly districtSuggestions = signal<LocationPin[]>([]);

  readonly isCreateModalOpen = signal<boolean>(false);
  readonly modalType = signal<MemoryType>('photo');
  readonly selectedFile = signal<File | null>(null);
  readonly previewUrl = signal<string | null>(null);
  readonly fileValidationError = signal<string | null>(null);
  readonly formGeneralError = signal<string | null>(null);
  readonly isSubmitting = signal<boolean>(false);

  createForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    country: ['United Kingdom', [Validators.required]],
    city: ['Brighton', [Validators.required]],
    district: ['Preston Park', [Validators.required]],
    letterText: [''],
    unlockDate: [this.getDefaultUnlockDate(), [Validators.required]],
    visibility: ['public', [Validators.required]]
  });

  constructor() {
    // Sync prefilled location from boardState when it changes
    effect(() => {
      const loc = this.boardState.selectedLocation();
      if (loc) {
        this.createForm.patchValue({
          country: loc.country,
          city: loc.city,
          district: loc.district
        });
      }
    });
  }

  letterCharCount(): number {
    return (this.createForm.get('letterText')?.value || '').length;
  }

  getDefaultUnlockDate(): string {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    return future.toISOString().slice(0, 16);
  }

  // --- LOCATION FILTER HANDLERS ---
  async onCountryFocus(): Promise<void> {
    const results = await this.geoService.search('country', this.boardState.filterCountry());
    this.countrySuggestions.set(results);
  }

  async onCountryInput(val: string): Promise<void> {
    this.boardState.filterCountry.set(val);
    const results = await this.geoService.search('country', val);
    this.countrySuggestions.set(results);
  }

  selectCountry(item: LocationPin): void {
    this.boardState.filterCountry.set(item.country);
    this.countrySuggestions.set([]);
    this.onCityFocus();
  }

  async onCityFocus(): Promise<void> {
    const results = await this.geoService.search(
      'city',
      this.boardState.filterCity(),
      this.boardState.filterCountry()
    );
    this.citySuggestions.set(results);
  }

  async onCityInput(val: string): Promise<void> {
    this.boardState.filterCity.set(val);
    const results = await this.geoService.search(
      'city',
      val,
      this.boardState.filterCountry()
    );
    this.citySuggestions.set(results);
  }

  selectCity(item: LocationPin): void {
    this.boardState.filterCity.set(item.city);
    if (item.country) {
      this.boardState.filterCountry.set(item.country);
    }
    this.citySuggestions.set([]);
    this.onDistrictFocus();
  }

  async onDistrictFocus(): Promise<void> {
    const results = await this.geoService.search(
      'district',
      this.boardState.filterDistrict(),
      this.boardState.filterCountry(),
      this.boardState.filterCity()
    );
    this.districtSuggestions.set(results);
  }

  async onDistrictInput(val: string): Promise<void> {
    this.boardState.filterDistrict.set(val);
    const results = await this.geoService.search(
      'district',
      val,
      this.boardState.filterCountry(),
      this.boardState.filterCity()
    );
    this.districtSuggestions.set(results);
  }

  onBlurField(field: 'country' | 'city' | 'district'): void {
    setTimeout(() => {
      if (field === 'country') this.countrySuggestions.set([]);
      if (field === 'city') this.citySuggestions.set([]);
      if (field === 'district') this.districtSuggestions.set([]);
    }, 200);
  }

  selectDistrict(item: LocationPin): void {
    this.boardState.setSelectedLocation(item);
    this.districtSuggestions.set([]);
    this.memoryService.loadCanvasMemories(item.id);
  }

  resetFilters(): void {
    this.boardState.clearLocation();
    this.countrySuggestions.set([]);
    this.citySuggestions.set([]);
    this.districtSuggestions.set([]);
    this.memoryService.loadCanvasMemories(null);
  }

  // --- CREATION MODAL HANDLERS ---
  onOpenCreateModal(type: MemoryType): void {
    if (!this.auth.isAuthenticated()) {
      this.authModal.openModal(`Sign in to contribute ${type === 'letter' ? 'a time-capsule letter' : 'memories'} to your neighborhood.`);
      return;
    }

    if (this.auth.needsEmailConfirmation()) {
      this.authModal.openModal('Please verify your email address before creating memories or sealing time capsules. Check your inbox for the confirmation link.');
      return;
    }

    this.modalType.set(type);
    this.selectedFile.set(null);
    this.previewUrl.set(null);
    this.fileValidationError.set(null);
    this.formGeneralError.set(null);

    // Set location from current board selection if available
    const curLoc = this.boardState.selectedLocation();
    this.createForm.patchValue({
      title: '',
      country: curLoc?.country || this.boardState.filterCountry() || 'United Kingdom',
      city: curLoc?.city || this.boardState.filterCity() || 'Brighton',
      district: curLoc?.district || this.boardState.filterDistrict() || 'Preston Park',
      letterText: '',
      unlockDate: this.getDefaultUnlockDate(),
      visibility: 'public'
    });

    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
    this.selectedFile.set(null);
    this.previewUrl.set(null);
    this.fileValidationError.set(null);
    this.formGeneralError.set(null);
    this.uploadService.resetState();
    if (this.photoGalleryInputRef) this.photoGalleryInputRef.nativeElement.value = '';
    if (this.photoCameraInputRef) this.photoCameraInputRef.nativeElement.value = '';
    if (this.videoGalleryInputRef) this.videoGalleryInputRef.nativeElement.value = '';
    if (this.videoCameraInputRef) this.videoCameraInputRef.nativeElement.value = '';
  }

  clearSelectedFile(): void {
    this.selectedFile.set(null);
    this.previewUrl.set(null);
    this.fileValidationError.set(null);
    this.uploadService.resetState();
    if (this.photoGalleryInputRef) this.photoGalleryInputRef.nativeElement.value = '';
    if (this.photoCameraInputRef) this.photoCameraInputRef.nativeElement.value = '';
    if (this.videoGalleryInputRef) this.videoGalleryInputRef.nativeElement.value = '';
    if (this.videoCameraInputRef) this.videoCameraInputRef.nativeElement.value = '';
  }

  triggerGalleryInput(): void {
    if (this.modalType() === 'photo') {
      this.photoGalleryInputRef?.nativeElement.click();
    } else if (this.modalType() === 'video') {
      this.videoGalleryInputRef?.nativeElement.click();
    }
  }

  triggerCameraInput(): void {
    if (this.modalType() === 'photo') {
      this.photoCameraInputRef?.nativeElement.click();
    } else if (this.modalType() === 'video') {
      this.videoCameraInputRef?.nativeElement.click();
    }
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.fileValidationError.set(null);

    try {
      if (this.modalType() === 'video') {
        await this.uploadService.validateVideo(file);
      } else {
        await this.uploadService.validateAndCompressPhoto(file);
      }

      this.selectedFile.set(file);
      this.previewUrl.set(URL.createObjectURL(file));
    } catch (err: unknown) {
      this.selectedFile.set(null);
      this.previewUrl.set(null);
      this.fileValidationError.set((err as Error).message || 'Invalid file');
    } finally {
      input.value = '';
    }
  }

  async submitMemory(): Promise<void> {
    if (this.createForm.invalid) return;

    if (this.auth.needsEmailConfirmation()) {
      this.formGeneralError.set('Please verify your email address before submitting memories.');
      return;
    }

    const type = this.modalType();
    const formVals = this.createForm.value;

    if (type !== 'letter' && !this.selectedFile()) {
      this.fileValidationError.set('Please select or capture a photo/video file');
      return;
    }

    if (type === 'letter' && !formVals.letterText?.trim()) {
      this.formGeneralError.set('Letter text is required');
      return;
    }

    this.isSubmitting.set(true);
    this.formGeneralError.set(null);

    try {
      let mediaUrl: string | null = null;

      // 1. Upload media if photo or video
      if (type !== 'letter' && this.selectedFile()) {
        const uploadRes = await this.uploadService.uploadMedia(this.selectedFile()!);
        mediaUrl = uploadRes.publicUrl;
      }

      // 2. Resolve true global coordinates for this district & city
      const targetCountry = formVals.country || 'United Kingdom';
      const targetCity = formVals.city || 'Brighton';
      const targetDistrict = formVals.district || 'Preston Park';

      const coords = await this.geoService.resolveCoordinates(
        targetCountry,
        targetCity,
        targetDistrict
      );

      const loc: LocationPin = {
        id: this.boardState.selectedLocation()?.id || `loc-${Date.now()}`,
        osm_id: this.boardState.selectedLocation()?.osm_id || Date.now(),
        country: targetCountry,
        city: targetCity,
        district: targetDistrict,
        lat: coords.lat,
        lng: coords.lng
      };

      // 3. Create memory in Supabase
      const res = await this.memoryService.createMemory({
        location: loc,
        type: type,
        title: formVals.title || '',
        mediaUrl: mediaUrl,
        letterText: formVals.letterText,
        isPrivate: formVals.visibility === 'private',
        unlockDate: type === 'letter' && formVals.unlockDate 
          ? new Date(formVals.unlockDate).toISOString() 
          : new Date().toISOString()
      });

      this.isSubmitting.set(false);

      if (res.success) {
        if (res.data && !res.data.is_private) {
          const item = res.data;
          this.boardState.canvasCards.update((current) => [
            item,
            ...current.filter((c) => c.id !== item.id)
          ].slice(0, 25));
        }

        // Align selected location with newly created memory's district if different
        const curLoc = this.boardState.selectedLocation();
        if (curLoc && curLoc.district.toLowerCase() !== loc.district.toLowerCase()) {
          this.boardState.setSelectedLocation(loc);
        }

        await this.boardState.refreshPlatformCounters();
        await this.boardState.refreshLockedLettersCount();
        this.boardState.triggerPinsRefresh();

        this.closeCreateModal();
      } else {
        this.formGeneralError.set(res.error || 'Failed to save memory');
      }
    } catch (err: unknown) {
      this.isSubmitting.set(false);
      this.formGeneralError.set((err as Error).message || 'Failed to complete submission');
    }
  }
}
