import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WishesPanelComponent } from './wishes-panel/wishes-panel.component';
import { ControlsFilterBarComponent } from './controls-filter-bar/controls-filter-bar.component';
import { CollageCanvasComponent } from './collage-canvas/collage-canvas.component';
import { AudioStoryBarComponent } from './audio-story-bar/audio-story-bar.component';
import { MapboxViewComponent } from './mapbox-view/mapbox-view.component';

@Component({
  selector: 'app-main-board',
  standalone: true,
  imports: [
    CommonModule,
    WishesPanelComponent,
    ControlsFilterBarComponent,
    CollageCanvasComponent,
    AudioStoryBarComponent,
    MapboxViewComponent
  ],
  template: `
    <div class="flex flex-col gap-6">
      <!-- ROW 1: Global Wishes Panel (FR-2) -->
      <app-wishes-panel />

      <!-- ROW 2: Creation Action Buttons & Location Autocomplete Filters (FR-3, FR-4) -->
      <app-controls-filter-bar />

      <!-- ROW 3: Central 25-Card Stratified Collage Canvas & Expanded Modal (FR-5) -->
      <app-collage-canvas />

      <!-- ROW 4: AI Historical Spoken Audio Story Player Bar (FR-6) -->
      <app-audio-story-bar />

      <!-- Bottom: Interactive Mapbox District Map (FR-4) -->
      <div class="w-full">
        <app-mapbox-view />
      </div>
    </div>
  `
})
export class MainBoardComponent {}
