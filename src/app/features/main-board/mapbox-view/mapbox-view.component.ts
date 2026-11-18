import {
  Component,
  ElementRef,
  Inject,
  NgZone,
  OnDestroy,
  OnInit,
  AfterViewInit,
  PLATFORM_ID,
  ViewChild,
  effect,
  inject,
  signal
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import * as maplibregl from 'maplibre-gl';
import { BoardStateService } from '../../../core/services/board-state.service';
import { SupabaseService } from '../../../core/services/supabase.service';
import { LocationPin } from '../../../core/models/memory.model';
import { KNOWN_DISTRICT_COORDINATES } from '../../../core/constants/geo-data';

// Warm, elegant CARTO Voyager tiles matching Be HERE terracotta aesthetic (100% free, zero tokens required)
const CARTO_VOYAGER_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'carto-voyager': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
        'https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png'
      ],
      tileSize: 256,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors, © <a href="https://carto.com/attributions" target="_blank">CARTO</a>'
    }
  },
  layers: [
    {
      id: 'carto-voyager-layer',
      type: 'raster',
      source: 'carto-voyager',
      minzoom: 0,
      maxzoom: 20
    }
  ]
};

// OpenStreetMap standard raster style fallback
const OSM_FALLBACK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: [
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
      ],
      tileSize: 256,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
    }
  },
  layers: [
    {
      id: 'osm-tiles-layer',
      type: 'raster',
      source: 'osm-tiles',
      minzoom: 0,
      maxzoom: 19
    }
  ]
};

@Component({
  selector: 'app-mapbox-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="w-full bg-white border border-[#E5DDD3] rounded-2xl shadow-sm overflow-hidden flex flex-col">
      <!-- Section Header -->
      <div class="px-4 py-3 bg-[#FAF7F2] border-b border-[#E5DDD3] flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-base">🗺️</span>
          <h3 class="font-serif-display font-bold text-sm text-[#231F20]">
            District Memories Map (1 pin = 1 district)
          </h3>
        </div>
        <div class="flex items-center gap-2 text-xs text-[#6E665F]">
          @if (boardState.selectedLocation(); as loc) {
            <span class="bg-[#F7E6DF] text-[#C85A32] px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-[#C85A32] animate-ping"></span>
              {{ loc.district }}, {{ loc.city }}
            </span>
            <button 
              type="button"
              (click)="resetSelection()"
              class="hover:text-[#C85A32] underline text-[11px] cursor-pointer"
            >
              Reset selection
            </button>
          } @else {
            <span class="text-[#6E665F]">Select a pin on the map or from the list below</span>
          }
        </div>
      </div>

      <!-- Map Container -->
      <div class="relative w-full h-[360px] sm:h-[420px] bg-[#FAF7F2]">
        <!-- WebGL Map container -->
        <div #mapContainer class="w-full h-full min-h-[360px]"></div>

        <!-- Available Districts Quick Bar underneath header -->
        <div class="absolute bottom-2 left-2 z-10 flex flex-wrap items-center gap-1.5 max-w-[calc(100%-120px)] pointer-events-auto">
          @for (pin of activePins(); track pin.id) {
            <button
              type="button"
              (click)="onPinClick(pin)"
              class="px-2.5 py-1 rounded-full text-[11px] font-semibold transition flex items-center gap-1 shadow-sm border backdrop-blur-md cursor-pointer"
              [ngClass]="boardState.selectedLocation()?.id === pin.id 
                ? 'bg-[#C85A32] text-white ring-2 ring-[#C85A32] border-[#C85A32]' 
                : 'bg-white/95 text-[#231F20] hover:border-[#C85A32] border-[#E5DDD3] hover:bg-white'"
            >
              <span>📍</span>
              <span>{{ pin.district }}</span>
            </button>
          }
        </div>
      </div>
    </section>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
    .maplibregl-map, .mapboxgl-map {
      width: 100% !important;
      height: 100% !important;
      min-height: 360px !important;
    }
  `]
})
export class MapboxViewComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef<HTMLDivElement>;

  readonly boardState = inject(BoardStateService);
  private supabase = inject(SupabaseService);
  private ngZone = inject(NgZone);

  private map: maplibregl.Map | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private markersMap = new Map<string, maplibregl.Marker>();
  readonly activePins = signal<LocationPin[]>([]);

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    // Bidirectional reactive camera flyTo synchronization
    effect(() => {
      const selected = this.boardState.selectedLocation();
      if (selected && this.map && selected.lat && selected.lng && (selected.lat !== 0 || selected.lng !== 0)) {
        this.map.flyTo({
          center: [selected.lng, selected.lat],
          zoom: 13.5,
          speed: 1.2,
          curve: 1.42,
          essential: true
        });
      }
    });

    // Reactive pin refresh when new memories/locations are added
    effect(() => {
      this.boardState.districtPinsRefreshTrigger();
      if (isPlatformBrowser(this.platformId)) {
        this.loadDistrictPins();
      }
    });
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadDistrictPins();
    }
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initResilientMap();
    }
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  /**
   * Initializes MapLibre GL map with free CARTO Voyager raster layer and OSM fallback
   */
  private initResilientMap(): void {
    this.ngZone.runOutsideAngular(() => {
      try {
        const defaultCenter: [number, number] = [-0.142, 50.835]; // Brighton center

        const mapInstance = new maplibregl.Map({
          container: this.mapContainer.nativeElement,
          style: CARTO_VOYAGER_STYLE,
          center: defaultCenter,
          zoom: 12
        });

        this.map = mapInstance;

        mapInstance.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

        let fallbackTriggered = false;
        mapInstance.on('error', () => {
          if (!fallbackTriggered) {
            fallbackTriggered = true;
            try {
              mapInstance.setStyle(OSM_FALLBACK_STYLE);
            } catch (err) {
              console.warn('Map fallback error:', err);
            }
          }
        });

        mapInstance.on('load', () => {
          mapInstance.resize();
          this.renderMapboxMarkers();
        });

        // Ensure canvas recalculates size after layout settling
        setTimeout(() => mapInstance.resize(), 300);
        setTimeout(() => mapInstance.resize(), 800);

        if (typeof ResizeObserver !== 'undefined' && this.mapContainer?.nativeElement) {
          this.resizeObserver = new ResizeObserver(() => {
            mapInstance.resize();
          });
          this.resizeObserver.observe(this.mapContainer.nativeElement);
        }
      } catch (err) {
        console.warn('MapLibre initialization error:', err);
      }
    });
  }

  /**
   * Fetches district locations that have at least one memory and resolves true global coordinates
   */
  async loadDistrictPins(): Promise<void> {
    try {
      const { data, error } = await this.supabase.client
        .from('locations')
        .select('*');

      let rawPins: LocationPin[] = [];

      if (!error && data && data.length > 0) {
        rawPins = data as LocationPin[];
      } else {
        // Fallback seed pins (Brighton archive)
        rawPins = [
          {
            id: 'loc-1',
            osm_id: 1001,
            country: 'United Kingdom',
            city: 'Brighton',
            district: 'Preston Park',
            lat: 50.8409,
            lng: -0.1472,
            memories_count: 8
          },
          {
            id: 'loc-2',
            osm_id: 1002,
            country: 'United Kingdom',
            city: 'Brighton',
            district: 'North Laine',
            lat: 50.8267,
            lng: -0.1388,
            memories_count: 5
          }
        ];
      }

      // Deduplicate by district + city and ensure true global coordinates
      const seen = new Set<string>();
      const resolvedPins: LocationPin[] = [];

      for (const pin of rawPins) {
        const cleanCountry = (pin.country || '').trim().toLowerCase();
        const cleanCity = (pin.city || '').trim().toLowerCase();
        const cleanDist = (pin.district || '').trim().toLowerCase();
        const key = `${cleanCountry}_${cleanCity}_${cleanDist}`;
        if (seen.has(key)) continue;
        seen.add(key);

        let lat = pin.lat;
        let lng = pin.lng;

        // Check if known district coordinates can correct overlapping Preston Park defaults or (0,0)
        if (KNOWN_DISTRICT_COORDINATES[cleanDist]) {
          const known = KNOWN_DISTRICT_COORDINATES[cleanDist];
          const isAtDefaultPreston = Math.abs(lat - 50.8409) < 0.001 && Math.abs(lng - (-0.1472)) < 0.001;
          const isAtZero = Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001;
          if ((isAtDefaultPreston && cleanDist !== 'preston park') || isAtZero) {
            lat = known.lat;
            lng = known.lng;
          }
        }

        resolvedPins.push({
          ...pin,
          lat,
          lng
        });
      }

      this.activePins.set(resolvedPins);

      if (this.map) {
        this.renderMapboxMarkers();
      }
    } catch {
      // Offline fallback
    }
  }

  private renderMapboxMarkers(): void {
    const currentMap = this.map;
    if (!currentMap) return;

    // Clear existing
    this.markersMap.forEach((m) => m.remove());
    this.markersMap.clear();

    const pins = this.activePins();

    this.ngZone.runOutsideAngular(() => {
      for (const pin of pins) {
        // Custom DOM element for marker
        const el = document.createElement('div');
        el.className = 'bh-custom-map-pin';
        el.style.width = '36px';
        el.style.height = '36px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = '#C85A32';
        el.style.border = '2px solid #FFFFFF';
        el.style.boxShadow = '0 4px 14px rgba(200, 90, 50, 0.45)';
        el.style.cursor = 'pointer';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.color = '#FFFFFF';
        el.style.fontSize = '15px';
        el.style.zIndex = '15';
        el.innerText = '📍';

        // Marker click returns to Angular zone
        el.addEventListener('click', () => {
          this.ngZone.run(() => {
            this.onPinClick(pin);
          });
        });

        const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
          <div style="font-family: 'Plus Jakarta Sans', sans-serif; padding: 6px;">
            <strong style="font-size: 13px; color: #231F20; display: block; margin-bottom: 2px;">${pin.district}</strong>
            <div style="font-size: 11px; color: #6E665F;">${pin.city}, ${pin.country}</div>
          </div>
        `);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([pin.lng, pin.lat])
          .setPopup(popup)
          .addTo(currentMap);

        this.markersMap.set(pin.id, marker);
      }

      // If multiple pins exist, fit bounds to display all
      if (pins.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        pins.forEach((p) => bounds.extend([p.lng, p.lat]));
        currentMap.fitBounds(bounds, { padding: 60, maxZoom: 13 });
      }
    });
  }

  onPinClick(pin: LocationPin): void {
    this.boardState.setSelectedLocation(pin);
    if (this.map && pin.lat && pin.lng && (pin.lat !== 0 || pin.lng !== 0)) {
      this.map.flyTo({
        center: [pin.lng, pin.lat],
        zoom: 13.5,
        essential: true,
        duration: 1000
      });
    }
  }

  resetSelection(): void {
    this.boardState.clearLocation();
    if (this.map && this.activePins().length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      this.activePins().forEach((p) => bounds.extend([p.lng, p.lat]));
      this.map.fitBounds(bounds, { padding: 60, maxZoom: 13 });
    }
  }
}
