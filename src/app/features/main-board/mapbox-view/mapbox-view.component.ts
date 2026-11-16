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
import mapboxgl from 'mapbox-gl';
import { BoardStateService } from '../../../core/services/board-state.service';
import { SupabaseService } from '../../../core/services/supabase.service';
import { LocationPin } from '../../../core/models/memory.model';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-mapbox-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="w-full bg-white border border-border-custom rounded-2xl shadow-sm overflow-hidden flex flex-col">
      <!-- Section Header -->
      <div class="px-4 py-3 bg-bg-paper border-b border-border-custom flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-base">🗺️</span>
          <h3 class="font-serif font-bold text-sm text-ink">
            District Memories Map (1 pin = 1 district)
          </h3>
        </div>
        <div class="flex items-center gap-2 text-xs text-muted">
          @if (boardState.selectedLocation(); as loc) {
            <span class="bg-accent-soft text-accent px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-accent animate-ping"></span>
              {{ loc.district }}, {{ loc.city }}
            </span>
            <button 
              type="button"
              (click)="resetSelection()"
              class="hover:text-accent underline text-[11px]"
            >
              Reset selection
            </button>
          } @else {
            <span class="text-muted">Select a pin on the map or from the list below</span>
          }
        </div>
      </div>

      <!-- Map Container -->
      <div class="relative w-full h-[360px] sm:h-[420px] bg-neutral-100">
        <!-- WebGL Map container -->
        <div #mapContainer class="w-full h-full min-h-[360px]"></div>

        <!-- Fallback Interactive Preview if Mapbox token is missing/invalid -->
        @if (!hasValidMapboxToken) {
          <div class="absolute inset-0 bg-[#E8E2D9] flex flex-col items-center justify-center p-4 z-10">
            <div class="w-full max-w-lg bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-md border border-border-custom text-center">
              <div class="text-2xl mb-1">📍</div>
              <h4 class="font-serif font-bold text-sm text-ink mb-1">
                Interactive District Map (Mapbox Preview Mode)
              </h4>
              <p class="text-xs text-muted mb-3">
                To connect the full 3D layer, configure <code class="bg-bg-paper px-1 py-0.5 rounded font-mono text-accent">mapboxAccessToken</code> in <code class="font-mono text-xs">environment.ts</code>.
              </p>
              
              <!-- Interactive fallback pins -->
              <div class="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-border-custom">
                <span class="text-xs font-semibold text-ink">Available Districts:</span>
                @for (pin of activePins(); track pin.id) {
                  <button
                    type="button"
                    (click)="onPinClick(pin)"
                    class="px-3 py-1.5 rounded-full text-xs font-semibold transition flex items-center gap-1.5 shadow-sm border"
                    [ngClass]="boardState.selectedLocation()?.id === pin.id 
                      ? 'bg-accent text-white ring-2 border-accent' 
                      : 'bg-white text-ink hover:border-accent border-border-custom'"
                  >
                    <span>📍</span>
                    <span>{{ pin.district }} ({{ pin.city }})</span>
                  </button>
                }
              </div>
            </div>
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
    .mapboxgl-map {
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

  private map: mapboxgl.Map | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private markersMap = new Map<string, mapboxgl.Marker>();
  readonly activePins = signal<LocationPin[]>([]);

  hasValidMapboxToken = false;

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    // Bidirectional reactive camera flyTo synchronization
    effect(() => {
      const selected = this.boardState.selectedLocation();
      if (selected && this.map) {
        this.map.flyTo({
          center: [selected.lng, selected.lat],
          zoom: 13,
          speed: 1.2,
          curve: 1.42,
          essential: true
        });
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
      this.checkMapboxToken();
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

  private checkMapboxToken(): void {
    const token = environment.mapboxAccessToken;
    if (token && token.trim().length > 10 && !token.includes('placeholder')) {
      mapboxgl.accessToken = token;
      this.hasValidMapboxToken = true;
      this.initMapboxMap();
    } else {
      this.hasValidMapboxToken = false;
    }
  }

  /**
   * Initializes Mapbox GL JS map strictly OUTSIDE Angular zone
   * to ensure 60 FPS performance without triggering Angular change detection
   */
  private initMapboxMap(): void {
    this.ngZone.runOutsideAngular(() => {
      try {
        const defaultCenter: [number, number] = [-0.142, 50.835]; // Brighton center default

        this.map = new mapboxgl.Map({
          container: this.mapContainer.nativeElement,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: defaultCenter,
          zoom: 12
        });

        this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');

        this.map.on('load', () => {
          this.map?.resize();
          this.renderMapboxMarkers();
        });

        // Ensure canvas recalculates size after layout settling
        setTimeout(() => {
          this.map?.resize();
        }, 300);

        if (typeof ResizeObserver !== 'undefined' && this.mapContainer?.nativeElement) {
          this.resizeObserver = new ResizeObserver(() => {
            this.map?.resize();
          });
          this.resizeObserver.observe(this.mapContainer.nativeElement);
        }
      } catch (err) {
        console.warn('Mapbox initialization fallback:', err);
        this.ngZone.run(() => {
          this.hasValidMapboxToken = false;
        });
      }
    });
  }

  /**
   * Fetches district locations that have at least one memory
   */
  async loadDistrictPins(): Promise<void> {
    try {
      const { data, error } = await this.supabase.client
        .from('locations')
        .select('*');

      let pins: LocationPin[] = [];

      if (!error && data && data.length > 0) {
        pins = data as LocationPin[];
      } else {
        // Fallback seed pins (Brighton archive)
        pins = [
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

      this.activePins.set(pins);

      if (this.map && this.hasValidMapboxToken) {
        this.renderMapboxMarkers();
      }
    } catch {
      // Offline fallback
    }
  }

  private renderMapboxMarkers(): void {
    if (!this.map) return;

    // Clear existing
    this.markersMap.forEach((m) => m.remove());
    this.markersMap.clear();

    const pins = this.activePins();

    this.ngZone.runOutsideAngular(() => {
      for (const pin of pins) {
        // Custom DOM element for marker
        const el = document.createElement('div');
        el.className = 'bh-custom-map-pin';
        el.style.width = '34px';
        el.style.height = '34px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = '#C85A32';
        el.style.border = '2px solid #FFFFFF';
        el.style.boxShadow = '0 4px 12px rgba(200, 90, 50, 0.4)';
        el.style.cursor = 'pointer';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.color = '#FFFFFF';
        el.style.fontSize = '14px';
        el.innerText = '📍';

        // Marker click returns to Angular zone
        el.addEventListener('click', () => {
          this.ngZone.run(() => {
            this.onPinClick(pin);
          });
        });

        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="font-family: 'Plus Jakarta Sans', sans-serif; padding: 4px;">
            <strong style="font-size: 13px; color: #231F20;">${pin.district}</strong>
            <div style="font-size: 11px; color: #6E665F;">${pin.city}, ${pin.country}</div>
          </div>
        `);

        const marker = new mapboxgl.Marker(el)
          .setLngLat([pin.lng, pin.lat])
          .setPopup(popup)
          .addTo(this.map!);

        this.markersMap.set(pin.id, marker);
      }

      // If multiple pins exist, fit bounds to display all
      if (pins.length > 0 && this.map) {
        const bounds = new mapboxgl.LngLatBounds();
        pins.forEach((p) => bounds.extend([p.lng, p.lat]));
        this.map.fitBounds(bounds, { padding: 60, maxZoom: 13 });
      }
    });
  }

  onPinClick(pin: LocationPin): void {
    this.boardState.setSelectedLocation(pin);
  }

  resetSelection(): void {
    this.boardState.clearLocation();
    if (this.map && this.activePins().length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      this.activePins().forEach((p) => bounds.extend([p.lng, p.lat]));
      this.map.fitBounds(bounds, { padding: 60, maxZoom: 13 });
    }
  }
}
