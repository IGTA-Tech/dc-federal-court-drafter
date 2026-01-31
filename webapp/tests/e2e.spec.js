// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = 'https://dc-court-drafter-production.up.railway.app';

// Helper to bypass registration modal
async function bypassRegistration(page) {
  await page.evaluate(() => {
    localStorage.setItem('dcfedlit_user', JSON.stringify({
      name: 'Test User',
      email: 'test@example.com',
      organization: 'Test Firm',
      phone: '202-555-1234',
      registered_at: new Date().toISOString()
    }));
  });
  await page.reload();
}

// ============================================================================
// PAGE LOADING TESTS (1-10)
// ============================================================================

test('1. Homepage loads successfully', async ({ page }) => {
  const response = await page.goto(BASE_URL);
  expect(response.status()).toBe(200);
});

test('2. Generator page loads', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}/generator`);
  expect(response.status()).toBe(200);
});

test('3. Research page loads', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}/research`);
  expect(response.status()).toBe(200);
});

test('4. Health endpoint returns OK', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}/health`);
  const json = await response.json();
  expect(json.status).toBe('ok');
});

test('5. Page title is correct', async ({ page }) => {
  await page.goto(BASE_URL);
  await expect(page).toHaveTitle(/DC.*Court.*Drafter/i);
});

test('6. CSS stylesheet loads', async ({ page }) => {
  await page.goto(BASE_URL);
  const styles = await page.locator('link[href*="styles.css"]');
  await expect(styles).toHaveCount(1);
});

test('7. JavaScript loads', async ({ page }) => {
  await page.goto(BASE_URL);
  const scripts = await page.locator('script[src*="main.js"]');
  await expect(scripts).toHaveCount(1);
});

test('8. Bootstrap CSS loads', async ({ page }) => {
  await page.goto(BASE_URL);
  const bootstrap = await page.locator('link[href*="bootstrap.min.css"]');
  await expect(bootstrap).toHaveCount(1);
});

test('9. Bootstrap Icons load', async ({ page }) => {
  await page.goto(BASE_URL);
  const icons = await page.locator('link[href*="bootstrap-icons"]');
  await expect(icons).toHaveCount(1);
});

test('10. No console errors on page load', async ({ page }) => {
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await page.goto(BASE_URL);
  await page.waitForTimeout(2000);
  expect(errors.length).toBe(0);
});

// ============================================================================
// NAVIGATION TESTS (11-18)
// ============================================================================

test('11. Navbar is visible', async ({ page }) => {
  await page.goto(BASE_URL);
  await expect(page.locator('nav.navbar')).toBeVisible();
});

test('12. Brand logo/text is visible', async ({ page }) => {
  await page.goto(BASE_URL);
  await expect(page.locator('.navbar-brand')).toBeVisible();
});

test('13. Document Generator nav link works', async ({ page }) => {
  await page.goto(BASE_URL);
  await bypassRegistration(page);
  await page.click('a[href="/generator"]');
  await expect(page).toHaveURL(/generator/);
});

test('14. Court Research nav link works', async ({ page }) => {
  await page.goto(BASE_URL);
  await bypassRegistration(page);
  await page.click('a[href="/research"]');
  await expect(page).toHaveURL(/research/);
});

test('15. Help dropdown exists', async ({ page }) => {
  await page.goto(BASE_URL);
  await expect(page.locator('.dropdown-toggle:has-text("Help")')).toBeVisible();
});

test('16. Help dropdown opens on click', async ({ page }) => {
  await page.goto(BASE_URL);
  await bypassRegistration(page);
  await page.click('.dropdown-toggle:has-text("Help")');
  await page.waitForTimeout(500);
  await expect(page.locator('.dropdown-menu.show')).toBeVisible();
});

test('17. Footer is visible', async ({ page }) => {
  await page.goto(BASE_URL);
  await expect(page.locator('footer.footer')).toBeVisible();
});

test('18. Footer contains DC Federal Litigation link', async ({ page }) => {
  await page.goto(BASE_URL);
  await expect(page.locator('footer a[href="https://www.dcfederallitigation.com"]')).toBeVisible();
});

// ============================================================================
// REGISTRATION MODAL TESTS (19-26)
// ============================================================================

test('19. Registration modal appears for new users', async ({ page }) => {
  await page.goto(BASE_URL);
  await expect(page.locator('#registrationModal')).toBeVisible();
});

test('20. Registration modal has name field', async ({ page }) => {
  await page.goto(BASE_URL);
  await expect(page.locator('#regName')).toBeVisible();
});

test('21. Registration modal has email field', async ({ page }) => {
  await page.goto(BASE_URL);
  await expect(page.locator('#regEmail')).toBeVisible();
});

test('22. Registration modal has organization field', async ({ page }) => {
  await page.goto(BASE_URL);
  await expect(page.locator('#regOrganization')).toBeVisible();
});

test('23. Registration modal has phone field', async ({ page }) => {
  await page.goto(BASE_URL);
  await expect(page.locator('#regPhone')).toBeVisible();
});

test('24. Registration modal has submit button', async ({ page }) => {
  await page.goto(BASE_URL);
  await expect(page.locator('#registrationModal button[type="submit"]')).toBeVisible();
});

test('25. Registration modal cannot be closed without registering', async ({ page }) => {
  await page.goto(BASE_URL);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await expect(page.locator('#registrationModal')).toBeVisible();
});

test('26. Registration modal hides after registration', async ({ page }) => {
  await page.goto(BASE_URL);
  await bypassRegistration(page);
  await expect(page.locator('#registrationModal')).not.toBeVisible();
});

// ============================================================================
// FORM ELEMENTS TESTS (27-40)
// ============================================================================

test('27. Document type dropdown exists', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await expect(page.locator('#documentType')).toBeVisible();
});

test('28. Document type has Motion to Dismiss option', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await expect(page.locator('#documentType option[value="motion_to_dismiss"]')).toHaveCount(1);
});

test('29. Case number field exists', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await expect(page.locator('#caseNumber')).toBeVisible();
});

test('30. Case number field is NOT required', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  const required = await page.locator('#caseNumber').getAttribute('required');
  expect(required).toBeNull();
});

test('31. Plaintiff field exists', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await expect(page.locator('#plaintiff')).toBeVisible();
});

test('32. Defendant field exists', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await expect(page.locator('#defendant')).toBeVisible();
});

test('33. Judge dropdown exists', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await expect(page.locator('#judgeSelect')).toBeVisible();
});

test('34. Judge dropdown loads judges', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await page.waitForTimeout(2000);
  const options = await page.locator('#judgeSelect option').count();
  expect(options).toBeGreaterThan(10);
});

test('35. Attorney name field exists', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await expect(page.locator('#attorneyName')).toBeVisible();
});

test('36. Email field exists', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await expect(page.locator('#email')).toBeVisible();
});

test('37. DC Bar number field exists', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await expect(page.locator('#dcBarNumber')).toBeVisible();
});

test('38. Introduction textarea exists', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await expect(page.locator('#introduction')).toBeVisible();
});

test('39. Argument textarea exists', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await expect(page.locator('#argument')).toBeVisible();
});

test('40. Conclusion textarea exists', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await expect(page.locator('#conclusion')).toBeVisible();
});

// ============================================================================
// API ENDPOINT TESTS (41-50)
// ============================================================================

test('41. /api/judges returns judges list', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}/api/judges`);
  const json = await response.json();
  expect(json.judges).toBeDefined();
  expect(json.judges.length).toBeGreaterThan(0);
});

test('42. /api/judges contains Chief Judge Boasberg', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}/api/judges`);
  const json = await response.json();
  const boasberg = json.judges.find(j => j.initials === 'JEB');
  expect(boasberg).toBeDefined();
});

test('43. /api/judges contains new judge Amir Ali', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}/api/judges`);
  const json = await response.json();
  const ali = json.judges.find(j => j.initials === 'AHA');
  expect(ali).toBeDefined();
});

test('44. /api/judges contains new judge Sparkle Sooknanan', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}/api/judges`);
  const json = await response.json();
  const sooknanan = json.judges.find(j => j.initials === 'SLS');
  expect(sooknanan).toBeDefined();
});

test('45. /api/judges has 24 judges total', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}/api/judges`);
  const json = await response.json();
  expect(json.judges.length).toBe(24);
});

test('46. /api/templates returns document types', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}/api/templates`);
  const json = await response.json();
  expect(json.templates).toBeDefined();
  expect(json.templates.length).toBeGreaterThan(0);
});

test('47. /api/rules returns formatting rules', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}/api/rules`);
  const json = await response.json();
  expect(json.format_specs).toBeDefined();
  expect(json.rules).toBeDefined();
});

test('48. /api/drafts returns drafts list', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}/api/drafts`);
  const json = await response.json();
  expect(json.drafts).toBeDefined();
});

test('49. /api/validate endpoint exists', async ({ request }) => {
  const response = await request.post(`${BASE_URL}/api/validate`, {
    data: { document_type: 'motion_to_dismiss', plaintiff: 'Test', defendant: 'Test' }
  });
  expect(response.status()).toBe(200);
});

test('50. /api/users endpoint exists', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}/api/users`);
  const json = await response.json();
  expect(json.users).toBeDefined();
});

// ============================================================================
// BUTTON TESTS (51-56)
// ============================================================================

test('51. Generate DOCX button exists', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await expect(page.locator('button:has-text("Generate DOCX")')).toBeVisible();
});

test('52. Generate PDF button exists', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await expect(page.locator('button:has-text("Generate PDF")')).toBeVisible();
});

test('53. Validate button exists', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await expect(page.locator('button:has-text("Validate")')).toBeVisible();
});

test('54. Clear Form button exists', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await expect(page.locator('button:has-text("Clear Form")')).toBeVisible();
});

test('55. Save Draft button exists', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await expect(page.locator('button:has-text("Save Draft")')).toBeVisible();
});

test('56. Load Draft button exists', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await expect(page.locator('button:has-text("Load Draft")')).toBeVisible();
});

// ============================================================================
// VALIDATION TESTS (57-60)
// ============================================================================

test('57. Validation shows results when clicked', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await page.fill('#plaintiff', 'John Doe');
  await page.fill('#defendant', 'Jane Smith');
  await page.click('button:has-text("Validate")');
  await page.waitForTimeout(2000);
  const results = page.locator('#validationResults');
  const text = await results.textContent();
  expect(text.length).toBeGreaterThan(50);
});

test('58. Validation warns about missing case number', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await page.fill('#plaintiff', 'John Doe');
  await page.fill('#defendant', 'Jane Smith');
  await page.click('button:has-text("Validate")');
  await page.waitForTimeout(2000);
  await expect(page.locator('#validationResults')).toContainText(/case number|warning/i);
});

test('59. Add Argument Section button works', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await page.click('button:has-text("Add Argument Section")');
  await expect(page.locator('.additional-argument')).toBeVisible();
});

test('60. Rules modal opens', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await page.click('.dropdown-toggle:has-text("Help")');
  await page.click('a:has-text("Formatting Rules")');
  await expect(page.locator('#rulesModal')).toBeVisible();
});
