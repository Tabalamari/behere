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

  // Live platform counters
  readonly totalUsersCount = signal<number>(0);
  readonly lockedLettersCount = signal<number>(0);

  // Visible Canvas Cards (up to 25 items)
  readonly canvasCards = signal<MemoryItem[]>([]);
  readonly isLoadingCards = signal<boolean>(false);

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
      if (!error && typeof data === 'number') {
        this.totalUsersCount.set(data);
      }
    } catch {
      // Fallback
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
      }
    } catch {
      // Fallback
    }
  }
}
