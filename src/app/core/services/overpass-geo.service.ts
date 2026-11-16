import { Injectable, inject } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import { LocationPin } from '../models/memory.model';

export type GeoLevel = 'country' | 'city' | 'district';

@Injectable({
  providedIn: 'root'
})
export class OverpassGeoService {
  private supabase = inject(SupabaseService);

  /**
   * Search locations with hybrid caching:
   * 1. Query Supabase cached locations table via ILIKE
   * 2. If < 5 matches found, query Overpass API Edge Function to enrich cache
   */
  async search(
    level: GeoLevel,
    query: string,
    parentCountry?: string,
    parentCity?: string
  ): Promise<LocationPin[]> {
    const cleanQuery = query.trim();
    if (cleanQuery.length < 2) {
      return [];
    }

    try {
      // Step 1: Query local Supabase cache
      let dbQuery = this.supabase.client.from('locations').select('*');

      if (level === 'country') {
        dbQuery = dbQuery.ilike('country', `${cleanQuery}%`);
      } else if (level === 'city') {
        dbQuery = dbQuery.ilike('city', `${cleanQuery}%`);
        if (parentCountry) {
          dbQuery = dbQuery.eq('country', parentCountry);
        }
      } else {
        dbQuery = dbQuery.ilike('district', `${cleanQuery}%`);
        if (parentCity) {
          dbQuery = dbQuery.eq('city', parentCity);
        }
        if (parentCountry) {
          dbQuery = dbQuery.eq('country', parentCountry);
        }
      }

      const { data: cachedData, error: dbError } = await dbQuery.limit(10);
      const cached = (cachedData || []) as LocationPin[];

      // If we have at least 5 cached results, return immediately
      if (!dbError && cached.length >= 5) {
        return cached;
      }

      // Step 2: Call fetch-overpass-locations Edge Function
      const { data: edgeData, error: edgeError } = await this.supabase.client.functions.invoke(
        'fetch-overpass-locations',
        {
          body: {
            level,
            query: cleanQuery,
            parentCountry,
            parentCity
          }
        }
      );

      if (!edgeError && edgeData?.locations) {
        const fetched = edgeData.locations as LocationPin[];
        
        // Merge cached and fetched results by osm_id / district name
        const seenOsm = new Set(cached.map(c => c.osm_id).filter(Boolean));
        const merged = [...cached];

        for (const loc of fetched) {
          if (!loc.osm_id || !seenOsm.has(loc.osm_id)) {
            merged.push(loc);
            if (loc.osm_id) seenOsm.add(loc.osm_id);
          }
        }

        return merged.slice(0, 15);
      }

      return cached;
    } catch {
      return [];
    }
  }

  /**
   * Helper to pipe input query stream into debounced geo search
   */
  createSearchStream(
    query$: Observable<string>,
    level: GeoLevel,
    parentCountry?: string,
    parentCity?: string
  ): Observable<LocationPin[]> {
    return query$.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      switchMap(query => from(this.search(level, query, parentCountry, parentCity)))
    );
  }
}
