import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { BoardStateService } from './board-state.service';
import { MemoryItem, LocationPin, CommentItem } from '../models/memory.model';

const DEMO_LOCATIONS: Record<string, LocationPin> = {
  preston: {
    id: 'loc-1',
    osm_id: 1001,
    country: 'United Kingdom',
    city: 'Brighton',
    district: 'Preston Park',
    lat: 50.8409,
    lng: -0.1472
  },
  northLaine: {
    id: 'loc-2',
    osm_id: 1002,
    country: 'United Kingdom',
    city: 'Brighton',
    district: 'North Laine',
    lat: 50.8267,
    lng: -0.1388
  },
  hoveSeafront: {
    id: 'loc-3',
    osm_id: 1003,
    country: 'United Kingdom',
    city: 'Brighton',
    district: 'Hove Seafront',
    lat: 50.8286,
    lng: -0.1708
  }
};

const FULL_DEMO_25_MEMORIES: MemoryItem[] = [
  {
    id: 'demo-1',
    user_id: 'u-1',
    location_id: 'loc-1',
    type: 'photo',
    title: 'Morning Mist Over Preston Elm',
    media_url: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=600&q=80',
    letter_text: null,
    is_private: false,
    unlock_date: new Date(Date.now() - 86400000).toISOString(),
    created_at: '2026-11-12T08:15:00Z',
    author_nickname: 'olena_k',
    location: DEMO_LOCATIONS['preston']
  },
  {
    id: 'demo-2',
    user_id: 'u-2',
    location_id: 'loc-2',
    type: 'photo',
    title: 'Kensington Gardens Murals',
    media_url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80',
    letter_text: null,
    is_private: false,
    unlock_date: new Date(Date.now() - 86400000 * 2).toISOString(),
    created_at: '2026-11-11T14:30:00Z',
    author_nickname: 'marta_waves',
    location: DEMO_LOCATIONS['northLaine']
  },
  {
    id: 'demo-3',
    user_id: 'u-3',
    location_id: 'loc-3',
    type: 'video',
    title: 'Evening Waves at Hove Lawns (0:42)',
    media_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
    letter_text: null,
    is_private: false,
    unlock_date: new Date(Date.now() - 86400000 * 3).toISOString(),
    created_at: '2026-11-10T17:50:00Z',
    author_nickname: 'sam_laine',
    location: DEMO_LOCATIONS['hoveSeafront']
  },
  {
    id: 'demo-4',
    user_id: 'u-4',
    location_id: 'loc-1',
    type: 'letter',
    title: 'Unlocked: Autumn 2025 Bench Note',
    media_url: null,
    letter_text: 'If you are reading this in late 2026: stop rushing for two minutes. The rose garden behind the pavilion still smells incredible after rain.',
    is_private: false,
    unlock_date: new Date(Date.now() - 3600000).toISOString(),
    created_at: '2026-11-01T10:00:00Z',
    author_nickname: 'arthur_p',
    location: DEMO_LOCATIONS['preston']
  },
  {
    id: 'demo-5',
    user_id: 'u-5',
    location_id: 'loc-2',
    type: 'photo',
    title: 'Sunday Vintage Vinyl Stalls',
    media_url: 'https://images.unsplash.com/photo-1461784121038-f088ca1e7714?auto=format&fit=crop&w=600&q=80',
    letter_text: null,
    is_private: false,
    unlock_date: new Date(Date.now() - 86400000 * 4).toISOString(),
    created_at: '2026-11-09T11:20:00Z',
    author_nickname: 'dj_kieran',
    location: DEMO_LOCATIONS['northLaine']
  },
  {
    id: 'demo-6',
    user_id: 'u-6',
    location_id: 'loc-3',
    type: 'photo',
    title: 'Pastel Beach Huts Row in Sunlight',
    media_url: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=600&q=80',
    letter_text: null,
    is_private: false,
    unlock_date: new Date(Date.now() - 86400000 * 5).toISOString(),
    created_at: '2026-11-08T09:40:00Z',
    author_nickname: 'elena_v',
    location: DEMO_LOCATIONS['hoveSeafront']
  },
  {
    id: 'demo-7',
    user_id: 'u-7',
    location_id: 'loc-1',
    type: 'video',
    title: 'Velodrome Cyclists Warmup (0:55)',
    media_url: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=600&q=80',
    letter_text: null,
    is_private: false,
    unlock_date: new Date(Date.now() - 86400000 * 6).toISOString(),
    created_at: '2026-11-07T16:15:00Z',
    author_nickname: 'velo_ben',
    location: DEMO_LOCATIONS['preston']
  },
  {
    id: 'demo-8',
    user_id: 'u-8',
    location_id: 'loc-2',
    type: 'letter',
    title: 'Unlocked: Bakery Queue Friendship',
    media_url: null,
    letter_text: 'Met my closest friend while waiting for cardamom buns on Gardner Street. Saving this spot in history so we never forget.',
    is_private: false,
    unlock_date: new Date(Date.now() - 86400000 * 7).toISOString(),
    created_at: '2026-10-28T08:30:00Z',
    author_nickname: 'nina_c',
    location: DEMO_LOCATIONS['northLaine']
  },
  {
    id: 'demo-9',
    user_id: 'u-9',
    location_id: 'loc-1',
    type: 'photo',
    title: 'Clock Tower Rain Reflection',
    media_url: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=600&q=80',
    letter_text: null,
    is_private: false,
    unlock_date: new Date(Date.now() - 86400000 * 8).toISOString(),
    created_at: '2026-11-06T18:00:00Z',
    author_nickname: 'olena_k',
    location: DEMO_LOCATIONS['preston']
  },
  {
    id: 'demo-10',
    user_id: 'u-10',
    location_id: 'loc-3',
    type: 'photo',
    title: 'Regency Balcony Ironwork Detail',
    media_url: 'https://images.unsplash.com/photo-1513584684374-8bab748fbf90?auto=format&fit=crop&w=600&q=80',
    letter_text: null,
    is_private: false,
    unlock_date: new Date(Date.now() - 86400000 * 9).toISOString(),
    created_at: '2026-11-05T13:45:00Z',
    author_nickname: 'arch_tom',
    location: DEMO_LOCATIONS['hoveSeafront']
  },
  {
    id: 'demo-11',
    user_id: 'u-11',
    location_id: 'loc-2',
    type: 'photo',
    title: 'Espresso & Sketchbook at Trafalgar Corner',
    media_url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80',
    letter_text: null,
    is_private: false,
    unlock_date: new Date(Date.now() - 86400000 * 10).toISOString(),
    created_at: '2026-11-04T10:10:00Z',
    author_nickname: 'maya_art',
    location: DEMO_LOCATIONS['northLaine']
  },
  {
    id: 'demo-12',
    user_id: 'u-12',
    location_id: 'loc-1',
    type: 'photo',
    title: 'Rotunda Cafe Morning Tea',
    media_url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80',
    letter_text: null,
    is_private: false,
    unlock_date: new Date(Date.now() - 86400000 * 11).toISOString(),
    created_at: '2026-11-03T09:15:00Z',
    author_nickname: 'sara_j',
    location: DEMO_LOCATIONS['preston']
  },
  {
    id: 'demo-13',
    user_id: 'u-13',
    location_id: 'loc-2',
    type: 'video',
    title: 'Street Guitarist on Sydney St (0:38)',
    media_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
    letter_text: null,
    is_private: false,
    unlock_date: new Date(Date.now() - 86400000 * 12).toISOString(),
    created_at: '2026-11-02T15:00:00Z',
    author_nickname: 'folk_dan',
    location: DEMO_LOCATIONS['northLaine']
  },
  {
    id: 'demo-14',
    user_id: 'u-14',
    location_id: 'loc-3',
    type: 'letter',
    title: 'Unlocked: First Winter Swim',
    media_url: null,
    letter_text: 'Water was 11°C this morning off King Esplanade. Ten minutes in the sea resets everything.',
    is_private: false,
    unlock_date: new Date(Date.now() - 86400000 * 13).toISOString(),
    created_at: '2026-11-01T07:30:00Z',
    author_nickname: 'coldwater_jo',
    location: DEMO_LOCATIONS['hoveSeafront']
  },
  {
    id: 'demo-15',
    user_id: 'u-15',
    location_id: 'loc-1',
    type: 'photo',
    title: 'Golden Leaves on Ditchling Rd',
    media_url: 'https://images.unsplash.com/photo-1507783548227-544c3b8fc065?auto=format&fit=crop&w=600&q=80',
    letter_text: null,
    is_private: false,
    unlock_date: new Date(Date.now() - 86400000 * 14).toISOString(),
    created_at: '2026-10-30T16:40:00Z',
    author_nickname: 'kate_m',
    location: DEMO_LOCATIONS['preston']
  },
  {
    id: 'demo-16',
    user_id: 'u-16',
    location_id: 'loc-2',
    type: 'photo',
    title: 'Secondhand Bookshop Corner',
    media_url: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=600&q=80',
    letter_text: null,
    is_private: false,
    unlock_date: new Date(Date.now() - 86400000 * 15).toISOString(),
    created_at: '2026-10-29T12:00:00Z',
    author_nickname: 'reader_leo',
    location: DEMO_LOCATIONS['northLaine']
  },
  {
    id: 'demo-17',
    user_id: 'u-17',
    location_id: 'loc-3',
    type: 'photo',
    title: 'Sunset Behind West Pier Skeleton',
    media_url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=600&q=80',
    letter_text: null,
    is_private: false,
    unlock_date: new Date(Date.now() - 86400000 * 16).toISOString(),
    created_at: '2026-10-27T17:25:00Z',
    author_nickname: 'dusk_anna',
    location: DEMO_LOCATIONS['hoveSeafront']
  },
  {
    id: 'demo-18',
    user_id: 'u-18',
    location_id: 'loc-1',
    type: 'photo',
    title: 'Chalk Wall & Ivy on the Border',
    media_url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=600&q=80',
    letter_text: null,
    is_private: false,
    unlock_date: new Date(Date.now() - 86400000 * 17).toISOString(),
    created_at: '2026-10-26T14:10:00Z',
    author_nickname: 'botanic_r',
    location: DEMO_LOCATIONS['preston']
  },
  {
    id: 'demo-19',
    user_id: 'u-19',
    location_id: 'loc-2',
    type: 'photo',
    title: 'Lanterns Above Bond Street at Dusk',
    media_url: 'https://images.unsplash.com/photo-1514924013411-cbf25faa35bb?auto=format&fit=crop&w=600&q=80',
    letter_text: null,
    is_private: false,
    unlock_date: new Date(Date.now() - 86400000 * 18).toISOString(),
    created_at: '2026-10-25T19:00:00Z',
    author_nickname: 'night_owl',
    location: DEMO_LOCATIONS['northLaine']
  },
  {
    id: 'demo-20',
    user_id: 'u-20',
    location_id: 'loc-1',
    type: 'photo',
    title: 'Tennis Courts at Twilight',
    media_url: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=600&q=80',
    letter_text: null,
    is_private: false,
    unlock_date: new Date(Date.now() - 86400000 * 19).toISOString(),
    created_at: '2026-10-24T18:15:00Z',
    author_nickname: 'ace_mark',
    location: DEMO_LOCATIONS['preston']
  },
  {
    id: 'demo-21',
    user_id: 'u-21',
    location_id: 'loc-2',
    type: 'photo',
    title: 'Fresh Flower Cart by the Clock',
    media_url: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=600&q=80',
    letter_text: null,
    is_private: false,
    unlock_date: new Date(Date.now() - 86400000 * 20).toISOString(),
    created_at: '2026-10-23T11:45:00Z',
    author_nickname: 'flora_b',
    location: DEMO_LOCATIONS['northLaine']
  },
  {
    id: 'demo-22',
    user_id: 'u-22',
    location_id: 'loc-3',
    type: 'photo',
    title: 'Brunswick Square Gardens in Autumn',
    media_url: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=600&q=80',
    letter_text: null,
    is_private: false,
    unlock_date: new Date(Date.now() - 86400000 * 21).toISOString(),
    created_at: '2026-10-22T13:30:00Z',
    author_nickname: 'olena_k',
    location: DEMO_LOCATIONS['hoveSeafront']
  },
  {
    id: 'demo-23',
    user_id: 'u-23',
    location_id: 'loc-2',
    type: 'photo',
    title: 'Cobbled Alley After Afternoon Shower',
    media_url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=600&q=80',
    letter_text: null,
    is_private: false,
    unlock_date: new Date(Date.now() - 86400000 * 22).toISOString(),
    created_at: '2026-10-21T15:40:00Z',
    author_nickname: 'puddle_j',
    location: DEMO_LOCATIONS['northLaine']
  },
  {
    id: 'demo-24',
    user_id: 'u-24',
    location_id: 'loc-1',
    type: 'photo',
    title: 'Rockery Waterfall Stone Path',
    media_url: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=600&q=80',
    letter_text: null,
    is_private: false,
    unlock_date: new Date(Date.now() - 86400000 * 23).toISOString(),
    created_at: '2026-10-20T12:00:00Z',
    author_nickname: 'fern_g',
    location: DEMO_LOCATIONS['preston']
  },
  {
    id: 'demo-25',
    user_id: 'u-25',
    location_id: 'loc-2',
    type: 'letter',
    title: 'Unlocked: Note to Future Neighbors',
    media_url: null,
    letter_text: 'Keep supporting the independent ceramic shops and tiny cafes on Trafalgar Street—they are the heartbeat of this neighborhood.',
    is_private: false,
    unlock_date: new Date(Date.now() - 86400000 * 24).toISOString(),
    created_at: '2026-10-19T09:00:00Z',
    author_nickname: 'grace_t',
    location: DEMO_LOCATIONS['northLaine']
  }
];

const INITIAL_DEMO_COMMENTS: Record<string, CommentItem[]> = {
  'demo-1': [
    {
      id: 'c-1',
      memory_id: 'demo-1',
      user_id: 'u-comm-1',
      author_nickname: 'liam_uk',
      content: 'The early morning light through the ancient elms here at 8 AM is completely unmatched.',
      created_at: '2026-11-12T09:30:00Z'
    }
  ],
  'demo-3': [
    {
      id: 'c-2',
      memory_id: 'demo-3',
      user_id: 'u-comm-2',
      author_nickname: 'claire_h',
      content: 'I can almost hear the pebbles rolling on the shore from this video!',
      created_at: '2026-11-10T19:00:00Z'
    }
  ]
};

@Injectable({
  providedIn: 'root'
})
export class MemoryService {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);
  private boardState = inject(BoardStateService);

  readonly isLoading = signal<boolean>(false);
  readonly memories = signal<MemoryItem[]>(FULL_DEMO_25_MEMORIES);
  private demoComments: Record<string, CommentItem[]> = { ...INITIAL_DEMO_COMMENTS };

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
      // Offline fallback
    }

    // Filter fallback demo memories
    let fallback = FULL_DEMO_25_MEMORIES;
    if (locationId) {
      fallback = FULL_DEMO_25_MEMORIES.filter((m) => m.location_id === locationId);
      if (fallback.length === 0) fallback = FULL_DEMO_25_MEMORIES;
    }
    this.memories.set(fallback);
    this.boardState.canvasCards.set(fallback);
    this.isLoading.set(false);
    return fallback;
  }

  async fetchComments(memoryId: string): Promise<CommentItem[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('comments')
        .select(`
          id,
          memory_id,
          user_id,
          content,
          created_at,
          profiles(nickname)
        `)
        .eq('memory_id', memoryId)
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map((c: any) => ({
          id: c.id,
          memory_id: c.memory_id,
          user_id: c.user_id,
          content: c.content,
          created_at: c.created_at,
          author_nickname: c.profiles?.nickname || 'Neighbor'
        }));
      }
    } catch {
      // Fallback
    }

    return this.demoComments[memoryId] || [];
  }

  async addComment(memoryId: string, content: string): Promise<{ success: boolean; comment?: CommentItem; error?: string }> {
    if (!this.auth.isAuthenticated()) {
      return { success: false, error: 'User must be authenticated' };
    }
    const user = this.auth.currentUser();
    if (!user) return { success: false, error: 'User session not found' };

    const trimmed = content.trim();
    if (!trimmed) return { success: false, error: 'Comment cannot be empty' };

    try {
      const { data, error } = await this.supabase.client
        .from('comments')
        .insert({
          memory_id: memoryId,
          user_id: user.id,
          content: trimmed
        })
        .select('id, memory_id, user_id, content, created_at')
        .single();

      if (!error && data) {
        const item: CommentItem = {
          id: data.id,
          memory_id: data.memory_id,
          user_id: data.user_id,
          content: data.content,
          created_at: data.created_at,
          author_nickname: user.nickname
        };
        return { success: true, comment: item };
      }
    } catch {
      // Fallback
    }

    const mockComment: CommentItem = {
      id: 'c-' + Date.now(),
      memory_id: memoryId,
      user_id: user.id,
      content: trimmed,
      created_at: new Date().toISOString(),
      author_nickname: user.nickname
    };

    if (!this.demoComments[memoryId]) {
      this.demoComments[memoryId] = [];
    }
    this.demoComments[memoryId].push(mockComment);
    return { success: true, comment: mockComment };
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

      if (!isLocked && !newItem.is_private) {
        this.memories.update((current) => [newItem, ...current]);
        this.boardState.canvasCards.update((current) => [newItem, ...current]);
      }

      await this.boardState.refreshPlatformCounters();
      await this.boardState.refreshLockedLettersCount();

      return { success: true, data: newItem };
    } catch (err: unknown) {
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
