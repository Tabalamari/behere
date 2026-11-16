import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private _client: SupabaseClient;

  constructor() {
    const url = environment.supabaseUrl || 'https://placeholder.supabase.co';
    const key = environment.supabaseAnonKey || 'placeholder-anon-key';
    this._client = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }

  get client(): SupabaseClient {
    return this._client;
  }

  get auth() {
    return this._client.auth;
  }
}
