 
### General Execution Protocol for the AI Agent (System Execution Rules)

Before executing any task, the AI developer must follow this workflow:

1. **Git Workflow (Isolation & Merging):**
* Sync the main development branch: `git checkout develop && git pull origin develop` (in Phase 0, initialize `develop` from `main`).
* Create a dedicated feature branch using the naming pattern: `git checkout -b feat/task-XX-<short-name>`.
* Commit all changes exclusively to this task branch.
* After passing all **Verification Criteria**, run a production build check (`ng build --configuration production`), merge the branch into `develop` (`git checkout develop && git merge --no-ff feat/task-XX-<short-name>`), delete the temporary feature branch, and log task completion.


2. **Idempotency & Restartability:**
* All SQL migrations must use idempotent statements (`CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, `DROP POLICY IF EXISTS ... CREATE POLICY`) so that re-running scripts never throws errors.
* All Angular components must be built as **Standalone Components**, using **Angular Signals** (`signal`, `computed`, `effect`) and strict TypeScript typing (`strict: true` in `tsconfig.json`), with zero usage of `any`.
* Secret API keys (`GEMINI_API_KEY`, `ELEVENLABS_API_KEY`, `R2_SECRET_ACCESS_KEY`) must never appear in client-side Angular code—they must live exclusively inside **Supabase Edge Functions** secrets.





---

### Phase 0: Project Initialization & Infrastructure Scaffolding

#### Task 0.1: Initialize Angular 19 + Tailwind CSS + PWA and Environments

* **Branch:** `feat/task-01-project-scaffold`
* **Instructions for AI:**
1. Generate a new Angular 19 project (`ng new be-here --standalone --routing --style=css --strict`).
2. Install and configure Tailwind CSS (`tailwindcss`, `postcss`, `autoprefixer`) and add PWA support (`ng add @angular/pwa`).


3. Scaffold the folder structure according to the ARD: `src/app/core/{models,services,guards}` and `src/app/features/{main-board,user-cabinet}`.


4. Create typed environment files `src/environments/environment.ts` and `src/environments/environment.development.ts` containing: `supabaseUrl`, `supabaseAnonKey`, `mapboxAccessToken`, and `r2PublicBaseUrl`.
5. Define domain interfaces in `src/app/core/models/memory.model.ts`: `UserProfile`, `LocationPin`, `MemoryItem` (`photo | video | letter`), `CommentItem`, `WishItem`, and `AudioStory`.




* **Verification:**
* Run `ng lint` (if configured) and `ng build --configuration production`; both must exit with code `0` and zero TypeScript errors.
* Confirm `manifest.webmanifest` exists in the build output directory (`dist/`).



---

### Phase 1: Database, Authentication & Security Policies (Supabase)

#### Task 1.1: PostgreSQL Schema, RLS Policies & Time-Capsule RPC Functions

* **Branch:** `feat/task-02-supabase-schema-rls`
* **Instructions for AI:**
1. Create an idempotent migration file `supabase/migrations/20260101000000_init_schema.sql`.


2. Create tables: `profiles`, `locations` (with composite index `idx_locations_hierarchy` on `country, city, district`), `memories` (with constraint `CHECK (char_length(letter_text) <= 500)`), `comments`, `wishes`, and `audio_stories`.


3. Set up the `on_auth_user_created` database trigger to automatically create a row in `public.profiles` upon user registration.
4. Enable Row Level Security (RLS) on all tables. For `memories`, enforce:


* Public read access: `is_private = false AND unlock_date <= now()`.


* Author read access to their own unlocked private letters: `auth.uid() = user_id AND unlock_date <= now()`.


* Strict denial of direct `SELECT` queries on sealed letters (`unlock_date > now()`).


5. Create `SECURITY DEFINER` RPC functions: `get_locked_letters_count(loc_id UUID DEFAULT NULL)`, `get_total_users_count()`, and `get_my_locked_letters()` (returns metadata for countdown timers without exposing `letter_text`).




* **Verification:**
* Run `supabase db reset` twice consecutively—the migration must complete cleanly on re-execution.
* Execute a test SQL query as an anonymous role (`SET ROLE anon`): attempting to read records where `unlock_date > now()` or `is_private = true` returns `0` rows, while calling `get_locked_letters_count()` returns the accurate count.



#### Task 1.2: Client Auth Services & Guest Interception Guard

* **Branch:** `feat/task-03-auth-service-guard`
* **Instructions for AI:**
1. Install `@supabase/supabase-js` and create `SupabaseService` (`providedIn: 'root'`) holding a singleton client instance.


2. Implement `AuthService` with Signals `currentUser = signal<UserProfile null |>(null)` and `isAuthenticated = computed(() => !!this.currentUser())`, plus methods `signUp(email, password, nickname)`, `signIn(email, password)`, `signOut()`, and `updateNickname(newNickname)`.


3. Create `AuthModalService` and helper/guard `requireAuth(actionCallback: () => void)`: when triggered by a Guest (`!isAuthenticated()`), intercept the action and open the Sign-In/Sign-Up modal.


4. Build `AuthModalComponent` with a toggle between Sign In and Sign Up (including Nickname input).


* **Verification:**
* Register a new user via the UI, verify the profile row is created in `profiles`, reload the browser, and confirm session persistence.
* Trigger a protected action while logged out as a Guest and verify `AuthModalComponent` opens.



---

### Phase 2: Geo-Directory (Overpass API) & Interactive Map (Mapbox GL JS)

#### Task 2.1: Overpass API Caching Proxy Edge Function & Geo Service

* **Branch:** `feat/task-04-overpass-geo-search`
* **Instructions for AI:**
1. Create Supabase Edge Function `supabase/functions/fetch-overpass-locations/index.ts`. Accept `{ level: 'country' | 'city' | 'district', query: string, parentCountry?: string, parentCity?: string }`, query `[https://overpass-api.de/api/interpreter](https://overpass-api.de/api/interpreter)` using Overpass QL, extract administrative boundaries with center coordinates (`lat`, `lng`), upsert into `locations` (`ON CONFLICT (osm_id) DO NOTHING`), and return the JSON list.


2. Create `OverpassGeoService` in Angular using RxJS (`debounceTime(350)`, `distinctUntilChanged()`, `switchMap()`): first query prefix matches (`ILIKE 'query%'`) in Supabase `locations`, and if fewer than 5 records match, invoke the `fetch-overpass-locations` Edge Function.


3. Create global state service `BoardStateService` exposing `selectedLocation = signal<LocationPin null |>(null)`.




* **Verification:**
* Test the Edge Function via `curl` with a sample district query (e.g., `"Preston"`): the first request fetches from `overpass-api.de` and populates `locations`, while the second request returns cached results immediately from Supabase.



#### Task 2.2: Interactive Mapbox GL JS District Map at Bottom of Screen

* **Branch:** `feat/task-05-mapbox-district-map`
* **Instructions for AI:**
1. Install `mapbox-gl` and `@types/mapbox-gl`.
2. Build `MapboxViewComponent` positioned at the bottom of the main screen.


3. Initialize `mapboxgl.Map` inside `this.ngZone.runOutsideAngular(() => { ... })` to maintain 60 FPS during panning and zooming.


4. Render map pins only for districts (`District`) that have at least one visible memory (`1 pin = 1 District` (`LocationPin`)).


5. Wire bidirectional reactive synchronization via `effect()`:
* Clicking a district pin re-enters Angular zone (`ngZone.run()`) and updates `boardState.selectedLocation.set(pin)`.


* Selecting a district from the dropdown filters smoothly flies the camera to that location (`map.flyTo({ center: [pin.lng, pin.lat], zoom: 13 })`).






* **Verification:**
* Seed 2 test locations in `locations` with attached photos: 2 pins appear on the map. Clicking a pin updates `selectedLocation()`, and programmatically updating `selectedLocation()` centers the map on the target district.



---

### Phase 3: Main Screen Header, Live Counters & Global Wishes Module

#### Task 3.1: Top Header, Live Counters & Global Wishes Panel

* **Branch:** `feat/task-06-header-counters-wishes`
* **Instructions for AI:**
1. Build `TopHeaderComponent` containing: Logo, **Be HERE** title, **About** button (opens modal explaining platform vision and time-capsule rules), and **SignIn** button (switches to `/cabinet` link displaying user nickname when authenticated).


2. Add two live counters in the header:


* **Hand icon:** calls `get_total_users_count()` and displays total registered users.


* **Padlock icon:** reacts to `selectedLocation()` changes via `effect()` and calls `get_locked_letters_count(locationId)`.




3. Build `WishesPanelComponent` (global, not tied to geolocation):


* **Wish for me** button (available to both Guests and Users): fetches a random wish from `wishes` and pins it on screen until clicked again.


* **Add Wish** button (wrapped in `requireAuth`): opens a wish composer (max 500 characters) and inserts into `wishes`.




4. Ensure responsive mobile layout (`360px–430px` viewport width) with zero horizontal overflow or overlapping UI controls.




* **Verification:**
* Test as a Guest: `Wish for me` displays a wish and persists across map filter changes; `Add Wish` triggers the Sign-In modal.


* Inspect at `390px` width in Mobile DevTools: all header counters and wish buttons render cleanly without overlap.





---

### Phase 4: Direct Media Uploads (Cloudflare R2), Memory Creation & Collage Canvas

#### Task 4.1: Cloudflare R2 Edge Functions & Upload Service with Mobile Camera Capture

* **Branch:** `feat/task-07-cloudflare-r2-upload`
* **Instructions for AI:**
1. Create Edge Function `supabase/functions/get-r2-upload-url/index.ts` that validates the user's JWT, verifies `contentType` (`image/*` or `video/*`), and generates a one-time S3-compatible **Presigned PUT URL** for Cloudflare R2.


2. Create Edge Function `supabase/functions/delete-r2-object/index.ts` to securely delete objects from Cloudflare R2 when a user deletes their media.
3. Build Angular `R2UploadService` with strict client-side pre-upload validation:


* Photos: enforce `file.size <= 5 * 1024 * 1024` (5 MB) and optionally compress to WebP via HTML5 `<canvas>`.


* Videos: inspect metadata via an off-DOM `<video preload="metadata">` element and reject files with `duration > 60` seconds.


* Upload directly to the Presigned URL via `HttpClient.put()` with upload progress tracking.






* **Verification:**
* Attempt to upload a `65-second` video or `6 MB` photo—the service immediately rejects the file client-side before making any network request.


* Upload a valid photo (`< 5 MB`)—verify the object appears in the Cloudflare R2 bucket and loads via its public URL.



#### Task 4.2: Action Bar, Location Filters & Creation Modals (Add Photo / Video / Letter)

* **Branch:** `feat/task-08-creation-modals-filters`
* **Instructions for AI:**
1. Build `ControlsFilterBarComponent` with distinct stacked rows on mobile viewports (top row: **Add Photo**, **Add Video**, **Add Letter** buttons; bottom row: **Country**, **City**, **District** autocomplete inputs).


2. Configure media file inputs with `<input type="file" accept="image/*" capture="environment">` and `<input type="file" accept="video/*" capture="environment">` to trigger native smartphone camera capture.


3. Build creation modals using `ReactiveFormsModule`:
* Mandatory location selection (`Country / City / District`).


* For **Add Letter**: textarea with live character counter (`0 / 500`), future `unlock_date` picker, and visibility toggle (`Public` vs `Private "For Myself"`).




4. Automatically refresh the Canvas and the header padlock counter upon saving a new record to `memories`.




* **Verification:**
* Create a public letter set to unlock 1 minute in the future: the padlock counter increments by `+1`, the letter stays hidden on the Canvas before the timestamp, and after reloading once 1 minute passes, the letter appears on the Canvas while the padlock counter decrements by `-1`.





#### Task 4.3: Stylized 25-Card Collage Canvas & Expanded Card View with Comments

* **Branch:** `feat/task-09-collage-canvas-comments`
* **Instructions for AI:**
1. Implement data fetching in `BoardStateService`: when `selectedLocation() === null`, load the **latest 25** unlocked public memories platform-wide; when a district is selected, load up to **25 unlocked public memories** for that district.


2. Build `CollageCanvasComponent` using a **Stratified Jittered Grid (5×5)**:
* Divide the board into 25 slots; assign each card a deterministic offset (`±12%`) and tilt (`-4°` to `+4°`) derived from a hash of its `id`.


* Disable drag-and-drop; ensure geometric overlap between adjacent cards never exceeds **25% of card area**.


* Smoothly scale up and elevate `z-index` on desktop `hover` (or first tap on mobile).




3. Implement the full-Canvas **Expanded View** modal on click, displaying full media/text, title, location, timestamp, author nickname, and live `comments` thread with a comment submission form (protected via `requireAuth`).




* **Verification:**
* Populate a district with 25 test memories: verify balanced layout on both desktop and mobile viewports, overlap ≤ 25%, smooth card expansion, and comment creation.





---

### Phase 5: User Personal Cabinet

#### Task 5.1: Profile Settings, Unlocked Private Letters, Countdown Timers & Media Management

* **Branch:** `feat/task-10-user-cabinet`
* **Instructions for AI:**
1. Create protected route `/cabinet` (accessible only to authenticated users; redirects Guests to the home route and opens the Sign-In modal).


2. Build `UserCabinetComponent` with 4 sections per FR-7:


* **Profile Settings:** form to update `nickname` with uniqueness validation.


* **My Unlocked Private Letters ("For Myself"):** query `is_private = true AND unlock_date <= now()`, displaying full letter text visible solely to the author.


* **My Sealed Time Capsules:** call `get_my_locked_letters()` and render live countdown timers (`Days : Hours : Minutes`) until unlock (with `letter_text` hidden).


* **My Uploaded Photos & Videos:** media gallery with a **Delete** button (deletes the row in Supabase and calls `delete-r2-object` to purge the file from Cloudflare R2).






* **Verification:**
* Log in as User A, create one private letter ("For Myself") unlocking tomorrow and one dated in the past: the past letter is readable in `/cabinet`, while the future letter shows a countdown timer with no text.


* Log in as User B—verify User A's private letters are completely inaccessible on the Canvas and via Supabase API queries.





---

### Phase 6: AI Historical Audio Stories (Gemini 2.5 Flash + ElevenLabs)

#### Task 6.1: Historical Synthesis & TTS Edge Function with Hash Caching

* **Branch:** `feat/task-11-ai-historical-audio-backend`
* **Instructions for AI:**
1. Create Supabase Edge Function `supabase/functions/generate-audio-story/index.ts`.


2. Accept `location_id` (or `null` for global view), validate user JWT, and compute a deterministic SHA-256 `content_hash` over the sorted list of `id`s of all currently visible Canvas memories.


3. If `audio_stories` already contains a record matching `content_hash`, immediately return the cached `audio_url` without invoking external AI APIs.


4. If `content_hash` differs:


* Gather visible media files (from R2), unlocked letter texts, and exact geo-metadata (`Country, City, District, lat, lng`).


* Call **Google Gemini 2.5 Flash API** with `temperature: 0.2` and a strict historian system prompt (synthesize a narration up to 900 characters grounded **exclusively in verified historical facts** about the depicted landmarks and neighborhood, strictly prohibiting fabricated events or dates).


* Send the generated script to **ElevenLabs API** (`eleven_multilingual_v2`), upload the resulting `.mp3` to Cloudflare R2, and `UPSERT` the record in `audio_stories` by `location_id`.






* **Verification:**
* Invoke the function for a district with 2 photos: verify an `.mp3` is uploaded to Cloudflare R2 and saved in `audio_stories`.
* Invoke the function again without altering district content: verify the cached `audio_url` is returned in `< 300 ms` with zero Gemini/ElevenLabs token usage.





#### Task 6.2: Audio Story Player Bar & Guest vs. User Access Controls

* **Branch:** `feat/task-12-audio-player-ui`
* **Instructions for AI:**
1. Build `AudioStoryBarComponent` positioned directly beneath `CollageCanvasComponent`.


2. Whenever `canvasCards()` updates, `AiAudioService` computes the current `content_hash` and checks `audio_stories`:


* **Cache Valid State:** Play button is enabled for **everyone** (including unauthenticated Guests) and plays the cached historical narration.


* **Cache Outdated / Missing State:** if a **Guest** clicks Play/Generate, open the Sign-In modal explaining that registration is required to generate new AI histories; if an **Authenticated User** clicks, display a loading state (*"Researching district history..."*), invoke `generate-audio-story`, and auto-play the resulting audio.






* **Verification:**
* Walk through the end-to-end flow: Guest plays cached district audio -> Authenticated user uploads a new photo to that district -> Guest is prompted to sign in when clicking the outdated audio bar -> Authenticated user triggers regeneration -> Once complete, the updated audio story plays for all Guests.





---

### Phase 7: End-to-End Verification & Deployment Readiness

#### Task 7.1: Automated E2E Test Suite (Desktop & Mobile) & Secret Audit

* **Branch:** `feat/task-13-e2e-verification-polish`
* **Instructions for AI:**
1. Write Playwright E2E tests covering 4 core user journeys:
* Guest exploration, `Wish for me`, bottom map district filtering, and cached AI audio playback.


* Guest interception modals when clicking `Add Photo`, `Add Wish`, or submitting a comment.


* Creating public and private time-capsule letters, verifying padlock counter updates, and inspecting `/cabinet`.


* Mobile viewport (`390×844`): verifying zero overlapping elements, stratified collage rendering, and `capture="environment"` input attributes.




2. Audit the production bundle to guarantee zero server secret leaks (`grep -rn "ELEVENLABS\|GEMINI\|R2_SECRET" dist/`).


* **Verification:**
* All Playwright E2E suites pass, `grep` across `dist/` returns zero matches, and the final feature branch is merged into `develop` ready for release to `main`.



---

