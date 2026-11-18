import { Injectable, signal, computed, inject } from '@angular/core';
import { LocationPin, MemoryItem } from '../models/memory.model';
import { SupabaseService } from './supabase.service';

function getStoredNumber(key: string, fallback: number): number {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      const parsed = Number(raw);
      if (!isNaN(parsed) && parsed >= 0) return parsed;
    }
  } catch {
    // Ignore localStorage access errors
  }
  return fallback;
}

function setStoredNumber(key: string, value: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Ignore
  }
}

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
  readonly filterDate = signal<string>('');

  // Live platform counters with local persistence to avoid flicker on page refresh
  readonly totalUsersCount = signal<number>(getStoredNumber('behere_total_users', 5));
  readonly lockedLettersCount = signal<number>(getStoredNumber('behere_locked_letters', 0));

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
    this.filterDate.set('');
    this.refreshLockedLettersCount();
  }

  async refreshPlatformCounters(): Promise<void> {
    try {
      const { data, error } = await this.supabase.client.rpc('get_total_users_count');
      if (!error && typeof data === 'number' && data >= 0) {
        this.totalUsersCount.set(data);
        setStoredNumber('behere_total_users', data);
      }
    } catch {
      // Keep stored value
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
        if (!locId) {
          setStoredNumber('behere_locked_letters', data);
        }
      } else {
        this.lockedLettersCount.set(0);
      }
    } catch {
      this.lockedLettersCount.set(0);
    }
  }
}
