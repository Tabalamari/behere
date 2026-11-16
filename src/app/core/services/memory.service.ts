import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { BoardStateService } from './board-state.service';
import { MemoryItem, LocationPin } from '../models/memory.model';

const DEMO_MEMORIES: MemoryItem[] = [
  {
    id: 'demo-1',
    user_id: 'u-1',
    location_id: 'loc-1',
    type: 'photo',
    title: 'Preston Manor & Ancient Walled Garden',
    media_url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
    letter_text: null,
    is_private: false,
    unlock_date: new Date(Date.now() - 86400000).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    author_nickname: 'BrightonHistorian',
    location: {
      id: 'loc-1',
      osm_id: 1001,
      country: 'United Kingdom',
      city: 'Brighton',
      district: 'Preston Park',
      lat: 50.8409,
      lng: -0.1472
    }
  },
  {
    id: 'demo-2',
    user_id: 'u-2',
    location_id: 'loc-2',
    type: 'photo',
    title: 'Vintage Record Stalls on Sydney Street',
    media_url: 'https://images.unsplash.com/photo-1524813686514-a57563d77d66?auto=format&fit=crop&w=800&q=80',
    letter_text: null,
    is_private: false,
    unlock_date: new Date(Date.now() - 86400000 * 4).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    author_nickname: 'VinylWanderer',
    location: {
      id: 'loc-2',
      osm_id: 1002,
      country: 'United Kingdom',
      city: 'Brighton',
      district: 'North Laine',
      lat: 50.8267,
      lng: -0.1388
    }
  },
  {
    id: 'demo-3',
    user_id: 'u-3',
    location_id: 'loc-1',
    type: 'letter',
    title: 'To Whoever Sits Under the Twin Elms in 2030',
    media_url: null,
    letter_text: 'I am sitting beneath the oldest elm trees in Europe as autumn leaves fall over Preston Park. The wind smells of sea salt and roasted chestnuts. I wonder if these ancient branches still shade dreamers like you in the future.',
    is_private: false,
    unlock_date: new Date(Date.now() - 3600000).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    author_nickname: 'ElenaR',
    location: {
      id: 'loc-1',
      osm_id: 1001,
      country: 'United Kingdom',
      city: 'Brighton',
      district: 'Preston Park',
      lat: 50.8409,
      lng: -0.1472
    }
  },
  {
    id: 'demo-4',
    user_id: 'u-4',
    location_id: 'loc-3',
    type: 'photo',
    title: 'Pastel Bathing Huts after the Morning Rain',
    media_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    letter_text: null,
    is_private: false,
    unlock_date: new Date(Date.now() - 86400000 * 2).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    author_nickname: 'SeafrontDrifter',
    location: {
      id: 'loc-3',
      osm_id: 1003,
      country: 'United Kingdom',
      city: 'Brighton',
      district: 'Hove Seafront',
      lat: 50.8286,
      lng: -0.1708
    }
  },
  {
    id: 'demo-5',
    user_id: 'u-5',
    location_id: 'loc-2',
    type: 'photo',
    title: 'Morning Espresso & Fresh Brioche at the Corner',
    media_url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80',
    letter_text: null,
    is_private: false,
    unlock_date: new Date(Date.now() - 86400000).toISOString(),
    created_at: new Date(Date.now() - 86400000).toISOString(),
    author_nickname: 'LocalRoaster',
    location: {
      id: 'loc-2',
      osm_id: 1002,
      country: 'United Kingdom',
      city: 'Brighton',
      district: 'North Laine',
      lat: 50.8267,
      lng: -0.1388
    }
  }
];

@Injectable({
  providedIn: 'root'
})
export class MemoryService {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);
  private boardState = inject(BoardStateService);

  readonly isLoading = signal<boolean>(false);
  readonly memories = signal<MemoryItem[]>(DEMO_MEMORIES);

  constructor() {
    this.loadCanvasMemories();
  }

  async loadCanvasMemories(locationId?: string | null): Promise<MemoryItem[]> {
    this.isLoading.set(true);
    try {
      let query = this.supabase.client
        .from('memories')
        .select(`
          id,
          user_id,
          location_id,
          type,
          title,
          media_url,
          letter_text,
          is_private,
          unlock_date,
          created_at,
          profiles(nickname),
          locations(*)
        `)
        .order('created_at', { ascending: false })
        .limit(25);

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        const mapped: MemoryItem[] = data.map((row: any) => ({
          id: row.id,
          user_id: row.user_id,
          location_id: row.location_id,
          type: row.type,
          title: row.title,
          media_url: row.media_url,
          letter_text: row.letter_text,
          is_private: row.is_private,
          unlock_date: row.unlock_date,
          created_at: row.created_at,
          author_nickname: row.profiles?.nickname || 'Anonymous Neighbor',
          location: row.locations
        }));

        this.memories.set(mapped);
        this.boardState.canvasCards.set(mapped);
        this.isLoading.set(false);
        return mapped;
      }
    } catch {
      // Fallback
    }

    // Filter fallback demo memories if locationId specified
    let fallback = DEMO_MEMORIES;
    if (locationId) {
      fallback = DEMO_MEMORIES.filter((m) => m.location_id === locationId);
      if (fallback.length === 0) fallback = DEMO_MEMORIES;
    }
    this.memories.set(fallback);
    this.boardState.canvasCards.set(fallback);
    this.isLoading.set(false);
    return fallback;
  }

  async createMemory(params: {
    location: LocationPin;
    type: 'photo' | 'video' | 'letter';
    title: string;
    mediaUrl?: string | null;
    letterText?: string | null;
    isPrivate?: boolean;
    unlockDate?: string;
  }): Promise<{ success: boolean; data?: MemoryItem; error?: string }> {
    if (!this.auth.isAuthenticated()) {
      return { success: false, error: 'User must be authenticated' };
    }

    const user = this.auth.currentUser();
    if (!user) return { success: false, error: 'User session not found' };

    try {
      // Ensure location exists in database
      let locId = params.location.id;
      if (!locId || locId.startsWith('temp-') || locId.startsWith('osm-')) {
        const { data: locData, error: locError } = await this.supabase.client
          .from('locations')
          .upsert(
            {
              osm_id: params.location.osm_id ? parseInt(String(params.location.osm_id).replace(/\D/g, '') || '0', 10) : null,
              country: params.location.country,
              city: params.location.city,
              district: params.location.district,
              lat: params.location.lat,
              lng: params.location.lng
            },
            { onConflict: 'osm_id' }
          )
          .select()
          .single();

        if (!locError && locData?.id) {
          locId = locData.id;
        }
      }

      const unlockDate = params.unlockDate || new Date().toISOString();
      const isLocked = new Date(unlockDate).getTime() > Date.now();

      const insertPayload = {
        user_id: user.id,
        location_id: locId,
        type: params.type,
        title: params.title.trim(),
        media_url: params.mediaUrl ?? null,
        letter_text: params.letterText ? params.letterText.trim() : null,
        is_private: !!params.isPrivate,
        unlock_date: unlockDate
      };

      const { data, error } = await this.supabase.client
        .from('memories')
        .insert(insertPayload)
        .select(`
          id,
          user_id,
          location_id,
          type,
          title,
          media_url,
          letter_text,
          is_private,
          unlock_date,
          created_at
        `)
        .single();

      if (error) {
        throw error;
      }

      const newItem: MemoryItem = {
        id: data.id,
        user_id: data.user_id,
        location_id: data.location_id,
        type: data.type,
        title: data.title,
        media_url: data.media_url,
        letter_text: data.letter_text,
        is_private: data.is_private,
        unlock_date: data.unlock_date,
        created_at: data.created_at,
        author_nickname: user.nickname,
        location: params.location
      };

      // If unlocked and public, prepend to active memories list
      if (!isLocked && !newItem.is_private) {
        this.memories.update((current) => [newItem, ...current]);
        this.boardState.canvasCards.update((current) => [newItem, ...current]);
      }

      // Refresh platform counters
      await this.boardState.refreshPlatformCounters();
      await this.boardState.refreshLockedLettersCount();

      return { success: true, data: newItem };
    } catch (err: unknown) {
      // Local optimistic fallback if offline/mock
      const isLocked = new Date(params.unlockDate || '').getTime() > Date.now();
      const mockItem: MemoryItem = {
        id: 'local-' + Date.now(),
        user_id: user.id,
        location_id: params.location.id,
        type: params.type,
        title: params.title,
        media_url: params.mediaUrl,
        letter_text: params.letterText,
        is_private: !!params.isPrivate,
        unlock_date: params.unlockDate || new Date().toISOString(),
        created_at: new Date().toISOString(),
        author_nickname: user.nickname,
        location: params.location
      };

      if (!isLocked && !mockItem.is_private) {
        this.memories.update((current) => [mockItem, ...current]);
        this.boardState.canvasCards.update((current) => [mockItem, ...current]);
      }

      await this.boardState.refreshPlatformCounters();

      return { success: true, data: mockItem };
    }
  }
}
