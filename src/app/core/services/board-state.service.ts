import { Injectable, signal, computed, inject } from '@angular/core';
import { LocationPin, MemoryItem } from '../models/memory.model';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class BoardStateService {
  private supabase = inject(SupabaseService);

  // Selected Location (District Pin on map / dropdown filter)
  readonly selectedLocation = signal<LocationPin | null>(null);

  // Text inputs for cascading filters
  readonly filterCountry = signal<string>('');
  readonly filterCity = signal<string>('');
  readonly filterDistrict = signal<string>('');

  // Live platform counters (with sensible demo fallbacks when offline or unseeded)
  readonly totalUsersCount = signal<number>(1284);
  readonly lockedLettersCount = signal<number>(14);

  // Visible Canvas Cards (up to 25 items)
  readonly canvasCards = signal<MemoryItem[]>([]);
  readonly isLoadingCards = signal<boolean>(false);

  // Trigger to reload map pins whenever a new memory/location is created
  readonly districtPinsRefreshTrigger = signal<number>(0);

  triggerPinsRefresh(): void {
    this.districtPinsRefreshTrigger.update((n) => n + 1);
  }

  // Computed helper
  readonly hasActiveLocation = computed(() => !!this.selectedLocation());

  constructor() {
    this.refreshPlatformCounters();
  }

  setSelectedLocation(pin: LocationPin | null): void {
    this.selectedLocation.set(pin);
    if (pin) {
      this.filterCountry.set(pin.country);
      this.filterCity.set(pin.city);
      this.filterDistrict.set(pin.district);
    }
    this.refreshLockedLettersCount();
  }

  clearLocation(): void {
    this.selectedLocation.set(null);
    this.filterCountry.set('');
    this.filterCity.set('');
    this.filterDistrict.set('');
    this.refreshLockedLettersCount();
  }

  async refreshPlatformCounters(): Promise<void> {
    try {
      const { data, error } = await this.supabase.client.rpc('get_total_users_count');
      if (!error && typeof data === 'number' && data > 0) {
        this.totalUsersCount.set(data);
      }
    } catch {
      // Keep initial/fallback
    }
    await this.refreshLockedLettersCount();
  }

  async refreshLockedLettersCount(): Promise<void> {
    try {
      const locId = this.selectedLocation()?.id || null;
      const { data, error } = await this.supabase.client.rpc('get_locked_letters_count', {
        loc_id: locId
      });
      if (!error && typeof data === 'number') {
        this.lockedLettersCount.set(data);
      } else {
        // Dynamic demo adjustment based on district selection
        this.lockedLettersCount.set(locId ? 6 : 14);
      }
    } catch {
      const locId = this.selectedLocation()?.id || null;
      this.lockedLettersCount.set(locId ? 6 : 14);
    }
  }
}
