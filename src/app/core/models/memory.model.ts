export type MemoryType = 'photo' | 'video' | 'letter';

export interface UserProfile {
  id: string;
  nickname: string;
  created_at: string;
}

export interface LocationPin {
  id: string;
  osm_id?: number | null;
  country: string;
  city: string;
  district: string;
  lat: number;
  lng: number;
  created_at?: string;
  memories_count?: number;
}

export interface MemoryItem {
  id: string;
  user_id: string;
  location_id: string;
  type: MemoryType;
  title: string;
  media_url?: string | null;
  letter_text?: string | null;
  is_private: boolean;
  unlock_date: string;
  created_at: string;
  // Joined presentation fields
  author_nickname?: string;
  location?: LocationPin;
}

export interface CommentItem {
  id: string;
  memory_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_nickname?: string;
}

export interface WishItem {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_nickname?: string;
}

export interface AudioStory {
  id: string;
  location_id: string | null;
  content_hash: string;
  audio_url: string;
  transcript: string;
  updated_at: string;
}
