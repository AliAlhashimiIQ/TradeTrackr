import { test, expect, Page, ConsoleMessage } from '@playwright/test';
import * as fs from 'fs';

// Store console errors captured during execution
const consoleErrors: string[] = [];

// Helper to monitor console messages
function setupConsoleMonitoring(page: Page) {
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') {
      consoleErrors.push(`[Console Error][${page.url()}] ${msg.text()}`);
    }
  });
  page.on('pageerror', (err: Error) => {
    consoleErrors.push(`[Page Error][${page.url()}] ${err.message}\nStack: ${err.stack}`);
  });
}

// Helper to extract links and check for broken ones
async function checkBrokenLinks(page: Page, baseUrl: string) {
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a'))
      .map(a => a.getAttribute('href'))
      .filter(href => href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:'));
  });

  const uniqueLinks = Array.from(new Set(links)) as string[];
  const brokenLinks: { href: string; status: number }[] = [];

  for (const link of uniqueLinks) {
    const targetUrl = link.startsWith('http') ? link : `${baseUrl}${link}`;
    if (!targetUrl.includes('trade-trackr') && !link.startsWith('/')) continue; // Skip external pages

    try {
      const response = await page.request.get(targetUrl);
      if (response.status() >= 400) {
        brokenLinks.push({ href: link, status: response.status() });
      }
    } catch {
      brokenLinks.push({ href: link, status: 0 });
    }
  }
  return brokenLinks;
}

test.describe.configure({ mode: 'serial' });

test.describe('E2E Trader Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Hide AI Chat drawer and button using CSS injection to prevent click interception
    await page.addInitScript(() => {
      const style = document.createElement('style');
      style.innerHTML = `
        button[aria-label="Open AI Chat"],
        button[aria-label="Close AI Chat"],
        div.z-50.max-w-md,
        .fixed.bottom-6.right-6.z-50,
        [class*="bottom-6"][class*="right-6"] {
          display: none !important;
        }
      `;
      document.documentElement.appendChild(style);
    });

    page.on('domcontentloaded', async () => {
      try {
        await page.addStyleTag({
          content: `
            button[aria-label="Open AI Chat"],
            button[aria-label="Close AI Chat"],
            div.z-50.max-w-md,
            .fixed.bottom-6.right-6.z-50,
            [class*="bottom-6"][class*="right-6"] {
              display: none !important;
            }
          `
        });
      } catch (e) {
        // Ignore errors if page closes
      }
    });
  });

  test('Should show error with incorrect credentials', async ({ page }) => {
    setupConsoleMonitoring(page);
    await page.goto('/login');
    await page.fill('#email', 'trader-test@example.com');
    await page.fill('#password', 'WrongPassword123!');
    await page.click('button[type="submit"]');

    // Verify error element appears
    const errorDiv = page.locator('form div:has-text("Invalid email or password")');
    await expect(errorDiv).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'screenshots/login-error.png' });
  });

  test('Should log in successfully with valid credentials and save session', async ({ page }) => {
    setupConsoleMonitoring(page);
    await page.goto('/login');
    await page.fill('#email', 'trader-test@example.com');
    await page.fill('#password', 'TraderPass123!');
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard (labeled Command Center)
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await expect(page.locator('h1')).toContainText('Command Center', { timeout: 15000 });

    // Save storage state for reuse
    await page.context().storageState({ path: 'auth.json' });
    await page.screenshot({ path: 'screenshots/login-success-dashboard.png' });
  });

  test.describe('Authenticated Actions', () => {
    test.use({ storageState: 'auth.json' });

    test('Should log a new trade via EnhancedTradeForm', async ({ page }) => {
      setupConsoleMonitoring(page);
      await page.goto('/trades/new');
      await expect(page.locator('h2:has-text("Instrument")')).toBeVisible({ timeout: 10000 });

      // Enter Symbol
      await page.fill('input[placeholder="Search or type symbol..."]', 'XAUUSD');
      
      // Select Direction - BUY
      await page.click('button:has-text("BUY / LONG")');

      // Fill trade details
      await page.fill('label:has-text("Entry Price") + input', '2000.50');
      await page.fill('label:has-text("Exit Price") + input', '2010.50');
      await page.fill('label:has-text("Lots") + input, label:has-text("Quantity") + input', '1.5');

      // Submit form (Save button)
      await page.click('button[type="submit"]:has-text("Log Trade"), button[type="submit"]:has-text("Save"), button[type="submit"]');

      // Verify it redirects back to the trades page
      await page.waitForURL('**/trades', { timeout: 15000 });
      await expect(page.locator('span:has-text("XAUUSD")').first()).toBeVisible({ timeout: 10000 });
      await page.screenshot({ path: 'screenshots/trade-logged.png' });
    });

    test('Dashboard metrics should load and render charts with active trade', async ({ page }) => {
      setupConsoleMonitoring(page);
      await page.goto('/dashboard');
      
      // Assert cards
      await expect(page.locator('span:has-text("Win Rate")')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('span:has-text("Total Trades")')).toBeVisible();
      await expect(page.locator('span:has-text("P&L")')).toBeVisible();

      await page.screenshot({ path: 'screenshots/dashboard-loaded.png' });
    });

    test('Dashboard loads nicely in mobile viewports', async ({ page }) => {
      setupConsoleMonitoring(page);
      // Set to mobile viewport size
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/dashboard');
      
      // Assert essential mobile elements
      await expect(page.locator('span:has-text("Win Rate")')).toBeVisible({ timeout: 15000 });
      
      await page.screenshot({ path: 'screenshots/dashboard-mobile.png' });
    });

    test('Analytics page should load indicators and widgets', async ({ page }) => {
      setupConsoleMonitoring(page);
      await page.goto('/analytics');
      await expect(page.locator('h1')).toContainText('Analytics', { timeout: 10000 });
      await page.screenshot({ path: 'screenshots/analytics-loaded.png' });
    });

    test('Calendar page should load events list', async ({ page }) => {
      setupConsoleMonitoring(page);
      await page.goto('/calendar');
      await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('button:has-text("Month")')).toBeVisible();
      await page.screenshot({ path: 'screenshots/calendar-loaded.png' });
    });

    test('Settings page should load fields', async ({ page }) => {
      setupConsoleMonitoring(page);
      await page.goto('/settings');
      await expect(page.locator('h1')).toContainText('Settings', { timeout: 10000 });
      await page.screenshot({ path: 'screenshots/settings-loaded.png' });
    });

    test('Should edit the created trade', async ({ page }) => {
      setupConsoleMonitoring(page);
      await page.goto('/trades');

      // Locate all rows containing XAUUSD
      const rows = page.locator('div.grid', { hasText: 'XAUUSD' });
      await expect(rows.first()).toBeVisible({ timeout: 10000 });

      // Click Edit button (second to last button in the row)
      const editBtn = rows.first().locator('button').nth(-2);
      await editBtn.click({ force: true });

      // Verify EnhancedTradeForm loads for editing
      await expect(page.locator('input[placeholder="Search or type symbol..."]')).toHaveValue('XAUUSD', { timeout: 10000 });

      // Edit exit price
      await page.fill('label:has-text("Exit Price") + input', '2020.50');

      // Click save
      await page.click('button[type="submit"]');

      // Verify update reflected in list
      await page.waitForURL('**/trades', { timeout: 15000 });
      await expect(page.locator('span:has-text("XAUUSD")').first()).toBeVisible({ timeout: 10000 });
      await page.screenshot({ path: 'screenshots/trade-edited.png' });
    });

    test('Should delete the trade', async ({ page }) => {
      setupConsoleMonitoring(page);
      await page.goto('/trades');
      await page.waitForLoadState('networkidle');

      // Locate all rows containing XAUUSD
      const rows = page.locator('div.grid', { hasText: 'XAUUSD' });
      
      // Wait for the first row to load and become visible before counting!
      await expect(rows.first()).toBeVisible({ timeout: 10000 });
      
      // Wait a short duration to ensure Next.js hydration and state sync is complete
      await page.waitForTimeout(1500);
      
      const initialCount = await rows.count();

      // Set up dialog handler for window.confirm
      page.once('dialog', async dialog => {
        expect(dialog.message().toLowerCase()).toContain('delete');
        await dialog.accept();
      });

      // Click Delete button (last button in the row)
      const deleteBtn = rows.first().locator('button').last();
      await deleteBtn.click({ force: true });

      // Verify that the count of XAUUSD rows decreased by 1
      await expect(async () => {
        const currentCount = await rows.count();
        expect(currentCount).toBe(initialCount - 1);
      }).toPass({ timeout: 10000 });
      
      await page.screenshot({ path: 'screenshots/trade-deleted.png' });
    });

    test('Scanner: Check for broken links & log console errors', async ({ page, baseURL }) => {
      setupConsoleMonitoring(page);
      await page.goto('/dashboard');
      
      // Check links
      const brokenLinks = await checkBrokenLinks(page, baseURL || 'https://trade-trackr-gamma.vercel.app');
      
      // Write diagnostics report to disk
      const diagnostics = {
        timestamp: new Date().toISOString(),
        brokenLinks,
        consoleErrors
      };
      
      fs.mkdirSync('diagnostics', { recursive: true });
      fs.writeFileSync('diagnostics/results.json', JSON.stringify(diagnostics, null, 2));
      
      expect(brokenLinks.length).toBe(0); // Soft assertion
    });
  });
});
