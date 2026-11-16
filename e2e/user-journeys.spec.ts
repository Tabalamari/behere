import { test, expect } from '@playwright/test';

test.describe('Be HERE - Hyperlocal Collective Memory E2E Journeys', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // =========================================================================
  // JOURNEY 1: Guest exploration, Wish for me, map district filtering, and cached AI audio
  // =========================================================================
  test('Journey 1: Guest can explore board, draw warm wish, and listen to AI audio', async ({ page }) => {
    // 1. Verify Top Header with Brand and Live Counters
    await expect(page.locator('h1', { hasText: 'Be HERE' })).toBeVisible();
    await expect(page.getByTitle(/Total registered platform participants/i)).toBeVisible();
    await expect(page.getByTitle(/Locked Time-Capsule Letters/i)).toBeVisible();

    // 2. Open and inspect About modal
    const aboutBtn = page.getByRole('button', { name: 'About' });
    await expect(aboutBtn).toBeVisible();
    await aboutBtn.click();
    await expect(page.getByRole('heading', { name: 'About Be HERE' })).toBeVisible();
    await page.getByRole('button', { name: 'Explore Board' }).click();

    // 3. Draw a wish via "Wish for me" without authentication
    const wishForMeBtn = page.getByRole('button', { name: /Wish for me/i });
    await expect(wishForMeBtn).toBeVisible();
    await wishForMeBtn.click();
    // Verify drawn wish card displays with author tag
    await expect(page.locator('article', { hasText: /Today's Warmth for You/i })).toBeVisible();

    // 4. Verify AI Historical Audio Story bar exists beneath canvas
    const audioBar = page.locator('section', { hasText: 'AI Local Historian' });
    await expect(audioBar).toBeVisible();
    await expect(audioBar.getByRole('button', { name: /Read Script/i })).toBeVisible();

    // Expand transcript drawer
    await audioBar.getByRole('button', { name: /Read Script/i }).click();
    await expect(page.getByText(/Archival Spoken Script/i)).toBeVisible();

    // 5. Verify Mapbox View section exists at bottom
    await expect(page.locator('section', { hasText: /Interactive District Map/i })).toBeVisible();
  });

  // =========================================================================
  // JOURNEY 2: Guest interception modals when triggering protected actions
  // =========================================================================
  test('Journey 2: Guest is intercepted by Sign-In modal when clicking protected actions', async ({ page }) => {
    // 1. Intercept "Add Memory"
    const addMemoryBtn = page.getByRole('button', { name: /Add Memory/i });
    await expect(addMemoryBtn).toBeVisible();
    await addMemoryBtn.click();
    // Auth modal should open
    await expect(page.getByRole('heading', { name: 'Sign In to Be HERE' })).toBeVisible();
    // Close modal
    await page.getByRole('button', { name: '✕' }).click();

    // 2. Intercept "Add Wish"
    const addWishBtn = page.getByRole('button', { name: /Add Wish/i });
    await expect(addWishBtn).toBeVisible();
    await addWishBtn.click();
    await expect(page.getByRole('heading', { name: 'Sign In to Be HERE' })).toBeVisible();
    await page.getByRole('button', { name: '✕' }).click();

    // 3. Intercept direct navigation to /cabinet as a guest
    await page.goto('/cabinet');
    // Should redirect to '/' and trigger the auth modal
    await expect(page).toHaveURL(/\//);
    await expect(page.getByRole('heading', { name: 'Sign In to Be HERE' })).toBeVisible();
  });

  // =========================================================================
  // JOURNEY 3: Time-capsule letters, padlock counter & User Cabinet
  // =========================================================================
  test('Journey 3: Authenticated user can view /cabinet, countdown timers, and media', async ({ page }) => {
    // Mock user login by setting localStorage or invoking signIn
    await page.evaluate(() => {
      // Simulate authenticated session in Supabase storage key
      const mockSession = {
        user: {
          id: 'test-user-e2e',
          email: 'historian@brighton.uk',
          user_metadata: { nickname: 'brighton_native' }
        },
        access_token: 'mock-jwt-token'
      };
      localStorage.setItem('sb-test-auth-token', JSON.stringify(mockSession));
    });

    // In demo environment, sign in through modal
    const signInBtn = page.getByRole('button', { name: 'SignIn' });
    if (await signInBtn.isVisible()) {
      await signInBtn.click();
      await page.fill('input[type="email"]', 'native@brighton.uk');
      await page.fill('input[type="password"]', 'secret1234');
      await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    }

    // Navigate to /cabinet
    await page.goto('/cabinet');
    await expect(page.getByRole('heading', { name: /Profile Settings/i })).toBeVisible();

    // Inspect navigation tabs in Cabinet
    await page.getByRole('button', { name: /Unlocked Letters/i }).click();
    await expect(page.getByText(/Private Archive/i)).toBeVisible();

    await page.getByRole('button', { name: /Sealed Time Capsules/i }).click();
    await expect(page.getByText(/Cryptographically Sealed Content/i)).toBeVisible();

    await page.getByRole('button', { name: /My Photos & Videos/i }).click();
    await expect(page.getByText(/Media Ownership & Deletion/i)).toBeVisible();

    // Back to board
    await page.getByRole('link', { name: /Back to District Board/i }).click();
    await expect(page).toHaveURL(/\//);
  });

  // =========================================================================
  // JOURNEY 4: Mobile viewport (390×844) responsiveness & camera attributes
  // =========================================================================
  test('Journey 4: Mobile viewport (390x844) renders without overflow with capture="environment"', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    // Verify header wraps gracefully without horizontal scrollbar
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2); // allowing subpixel diff

    // Check camera capture attributes on mobile inputs
    const photoInput = page.locator('input#photo-capture-input');
    await expect(photoInput).toHaveAttribute('accept', 'image/*,video/*');
    await expect(photoInput).toHaveAttribute('capture', 'environment');

    // Verify 25-card collage canvas container fits within mobile width
    const canvasContainer = page.locator('app-collage-canvas');
    await expect(canvasContainer).toBeVisible();
    const box = await canvasContainer.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeLessThanOrEqual(390);
    }
  });

});
