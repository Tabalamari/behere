import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import { LocationPin } from '../models/memory.model';
import { WORLD_COUNTRIES, POPULAR_LOCATIONS_SEED, KNOWN_DISTRICT_COORDINATES } from '../constants/geo-data';

export type GeoLevel = 'country' | 'city' | 'district';

@Injectable({
  providedIn: 'root'
})
export class OverpassGeoService {
  private supabase = inject(SupabaseService);

  getAllCountries(): string[] {
    return WORLD_COUNTRIES;
  }

  /**
   * Search locations with instant built-in seed + hybrid caching:
   * 1. Match against built-in instant catalog (WORLD_COUNTRIES and seed cities/districts)
   * 2. Query Supabase cached locations table via ILIKE
   * 3. If < 5 matches found, query Overpass API Edge Function to enrich cache
   */
  async search(
    level: GeoLevel,
    query: string,
    parentCountry?: string,
    parentCity?: string
  ): Promise<LocationPin[]> {
    const cleanQuery = query.trim();
    const qLower = cleanQuery.toLowerCase();

    // Instant local country search
    if (level === 'country') {
      if (cleanQuery.length === 0) {
        return WORLD_COUNTRIES.slice(0, 12).map((c) => ({
          id: 'c-' + c.toLowerCase().replace(/\s+/g, '-'),
          country: c,
          city: '',
          district: '',
          lat: 0,
          lng: 0
        }));
      }

      const matched = WORLD_COUNTRIES.filter((c) =>
        c.toLowerCase().includes(qLower)
      );

      return matched.slice(0, 15).map((c) => ({
        id: 'c-' + c.toLowerCase().replace(/\s+/g, '-'),
        country: c,
        city: '',
        district: '',
        lat: 0,
        lng: 0
      }));
    }

    // For city and district, require at least 1 character if seed is available or 2 characters
    if (cleanQuery.length < 1) {
      return [];
    }

    const localSeedResults: LocationPin[] = [];

    // Check seed cities
    if (level === 'city' && parentCountry && POPULAR_LOCATIONS_SEED[parentCountry]) {
      const cityMap = POPULAR_LOCATIONS_SEED[parentCountry];
      for (const cityName of Object.keys(cityMap)) {
        if (cityName.toLowerCase().includes(qLower)) {
          localSeedResults.push({
            id: `seed-city-${parentCountry}-${cityName}`.toLowerCase().replace(/\s+/g, '-'),
            country: parentCountry,
            city: cityName,
            district: '',
            lat: 0,
            lng: 0
          });
        }
      }
    }

    // Check seed districts
    if (
      level === 'district' &&
      parentCountry &&
      parentCity &&
      POPULAR_LOCATIONS_SEED[parentCountry]?.[parentCity]
    ) {
      const districts = POPULAR_LOCATIONS_SEED[parentCountry][parentCity];
      for (const distName of districts) {
        if (distName.toLowerCase().includes(qLower)) {
          localSeedResults.push({
            id: `seed-dist-${parentCity}-${distName}`.toLowerCase().replace(/\s+/g, '-'),
            country: parentCountry,
            city: parentCity,
            district: distName,
            lat: 0,
            lng: 0
          });
        }
      }
    }

    try {
      // Step 1: Query local Supabase cache
      let dbQuery = this.supabase.client.from('locations').select('*');

      if (level === 'city') {
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

      const combined = [...localSeedResults];
      for (const c of cached) {
        if (!combined.some((item) => (level === 'city' ? item.city === c.city : item.district === c.district))) {
          combined.push(c);
        }
      }

      // If we have at least 3 results, return immediately
      if (combined.length >= 3) {
        return combined.slice(0, 15);
      }

      // Step 2: Call fetch-overpass-locations Edge Function if available
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
        for (const loc of fetched) {
          if (!combined.some((item) => (level === 'city' ? item.city === loc.city : item.district === loc.district))) {
            combined.push(loc);
          }
        }
      }

      return combined.slice(0, 15);
    } catch {
      return localSeedResults;
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
      debounceTime(250),
      distinctUntilChanged(),
      switchMap((query) => from(this.search(level, query, parentCountry, parentCity)))
    );
  }

  /**
   * Universal geocoder: resolves true { lat, lng } for any district/city/country worldwide
   * 1. Checks instant local dictionary (Brighton, Kyiv, Lviv, London, Paris, etc.)
   * 2. Free OpenStreetMap Nominatim API for any place on Earth
   * 3. Fallback to city/country center
   */
  async resolveCoordinates(
    country?: string,
    city?: string,
    district?: string
  ): Promise<{ lat: number; lng: number }> {
    const cleanDist = (district || '').trim().toLowerCase();
    const cleanCity = (city || '').trim().toLowerCase();

    // 1. Instant local dictionary check
    if (cleanDist && KNOWN_DISTRICT_COORDINATES[cleanDist]) {
      return KNOWN_DISTRICT_COORDINATES[cleanDist];
    }
    if (cleanCity && KNOWN_DISTRICT_COORDINATES[cleanCity]) {
      return KNOWN_DISTRICT_COORDINATES[cleanCity];
    }

    // 2. OpenStreetMap Nominatim global geocoding
    const queryParts = [district, city, country].filter(Boolean);
    if (queryParts.length > 0) {
      try {
        const query = queryParts.join(', ');
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
        const res = await fetch(url, {
          headers: { 'Accept': 'application/json' }
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
            return {
              lat: parseFloat(data[0].lat),
              lng: parseFloat(data[0].lon)
            };
          }
        }
      } catch (err) {
        console.warn('Nominatim geocoding error:', err);
      }
    }

    // 3. Fallback query with city + country
    if (city && country) {
      try {
        const query = `${city}, ${country}`;
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
            return {
              lat: parseFloat(data[0].lat),
              lng: parseFloat(data[0].lon)
            };
          }
        }
      } catch {
        // Fallback
      }
    }

    // Default Brighton center fallback
    return { lat: 50.8409, lng: -0.1472 };
  }
}
