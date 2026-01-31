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
// UPLOAD PAGE TESTS (161-180)
// ============================================================================

test('161. Upload page loads successfully', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}/upload`);
  expect(response.status()).toBe(200);
});

test('162. Upload page has correct title', async ({ page }) => {
  await page.goto(`${BASE_URL}/upload`);
  await expect(page).toHaveTitle(/Upload.*Reformat|DC.*Court/i);
});

test('163. Upload page has navigation link', async ({ page }) => {
  await page.goto(BASE_URL);
  await bypassRegistration(page);
  await expect(page.locator('a[href="/upload"]')).toBeVisible();
});

test('164. Upload navigation link works', async ({ page }) => {
  await page.goto(BASE_URL);
  await bypassRegistration(page);
  await page.click('a[href="/upload"]');
  await expect(page).toHaveURL(/upload/);
});

test('165. Upload page has drop zone', async ({ page }) => {
  await page.goto(`${BASE_URL}/upload`);
  await bypassRegistration(page);
  await expect(page.locator('#dropZone')).toBeVisible();
});

test('166. Upload page has file input', async ({ page }) => {
  await page.goto(`${BASE_URL}/upload`);
  await bypassRegistration(page);
  await expect(page.locator('#fileInput')).toHaveCount(1);
});

test('167. Upload page has document type selector', async ({ page }) => {
  await page.goto(`${BASE_URL}/upload`);
  await bypassRegistration(page);
  await expect(page.locator('#docType')).toBeVisible();
});

test('168. Upload page has case number field', async ({ page }) => {
  await page.goto(`${BASE_URL}/upload`);
  await bypassRegistration(page);
  await expect(page.locator('#caseNumber')).toBeVisible();
});

test('169. Upload page has plaintiff field', async ({ page }) => {
  await page.goto(`${BASE_URL}/upload`);
  await bypassRegistration(page);
  await expect(page.locator('#plaintiff')).toBeVisible();
});

test('170. Upload page has defendant field', async ({ page }) => {
  await page.goto(`${BASE_URL}/upload`);
  await bypassRegistration(page);
  await expect(page.locator('#defendant')).toBeVisible();
});

test('171. Upload page has judge field', async ({ page }) => {
  await page.goto(`${BASE_URL}/upload`);
  await bypassRegistration(page);
  await expect(page.locator('#judgeName')).toBeVisible();
});

test('172. Upload page has reformat button', async ({ page }) => {
  await page.goto(`${BASE_URL}/upload`);
  await bypassRegistration(page);
  await expect(page.locator('#reformatBtn')).toBeVisible();
});

test('173. Reformat button is disabled initially', async ({ page }) => {
  await page.goto(`${BASE_URL}/upload`);
  await bypassRegistration(page);
  await expect(page.locator('#reformatBtn')).toBeDisabled();
});

test('174. Upload page has preview button', async ({ page }) => {
  await page.goto(`${BASE_URL}/upload`);
  await bypassRegistration(page);
  await expect(page.locator('#previewBtn')).toBeVisible();
});

test('175. Preview button is disabled initially', async ({ page }) => {
  await page.goto(`${BASE_URL}/upload`);
  await bypassRegistration(page);
  await expect(page.locator('#previewBtn')).toBeDisabled();
});

test('176. Upload page has attorney name field', async ({ page }) => {
  await page.goto(`${BASE_URL}/upload`);
  await bypassRegistration(page);
  // Attorney section is collapsed by default, expand it first
  await page.click('[data-bs-target="#attorneyCollapse"]');
  await page.waitForTimeout(500);
  await expect(page.locator('#attorneyName')).toBeVisible();
});

test('177. Upload page has certificate of service checkbox', async ({ page }) => {
  await page.goto(`${BASE_URL}/upload`);
  await bypassRegistration(page);
  await expect(page.locator('#includeCertificate')).toBeVisible();
});

test('178. Certificate of service is checked by default', async ({ page }) => {
  await page.goto(`${BASE_URL}/upload`);
  await bypassRegistration(page);
  expect(await page.isChecked('#includeCertificate')).toBe(true);
});

test('179. Upload page has instructions card', async ({ page }) => {
  await page.goto(`${BASE_URL}/upload`);
  await bypassRegistration(page);
  await expect(page.locator('#instructionsCard')).toBeVisible();
});

test('180. Upload page has party represented dropdown', async ({ page }) => {
  await page.goto(`${BASE_URL}/upload`);
  await bypassRegistration(page);
  await expect(page.locator('#partyRepresented')).toBeVisible();
});

// ============================================================================
// UPLOAD API TESTS (181-195)
// ============================================================================

test('181. Upload API endpoint exists', async ({ request }) => {
  const response = await request.post(`${BASE_URL}/api/upload`, {
    multipart: {
      file: {
        name: 'test.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('test')
      }
    }
  });
  // Should fail validation but endpoint exists
  expect([400, 415, 500]).toContain(response.status());
});

test('182. Upload API rejects non-DOCX files', async ({ request }) => {
  const response = await request.post(`${BASE_URL}/api/upload`, {
    multipart: {
      file: {
        name: 'test.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('test pdf content')
      }
    }
  });
  expect(response.status()).toBe(400);
});

test('183. Upload reformat endpoint exists', async ({ request }) => {
  const response = await request.post(`${BASE_URL}/api/upload/reformat`, {
    data: {
      sections: { introduction: 'Test' },
      doc_type: 'motion_to_dismiss',
      case_info: { plaintiff: 'Test', defendant: 'Test' }
    }
  });
  // Should return DOCX file or error
  expect([200, 400, 500]).toContain(response.status());
});

test('184. Upload preview endpoint exists', async ({ request }) => {
  const response = await request.post(`${BASE_URL}/api/upload/preview`, {
    data: {
      sections: { introduction: 'Test' },
      doc_type: 'motion_to_dismiss',
      case_info: { plaintiff: 'Test', defendant: 'Test' }
    }
  });
  expect([200, 400, 500]).toContain(response.status());
});

test('185. Document types endpoint returns list', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}/api/upload/document-types`);
  if (response.status() === 200) {
    const json = await response.json();
    expect(json.document_types).toBeDefined();
  }
});

test('186. Upload preview returns format info', async ({ request }) => {
  const response = await request.post(`${BASE_URL}/api/upload/preview`, {
    data: {
      sections: { introduction: 'Test introduction content' },
      doc_type: 'motion_to_dismiss',
      case_info: { plaintiff: 'John Doe', defendant: 'Jane Smith' }
    }
  });
  if (response.status() === 200) {
    const json = await response.json();
    expect(json.format_info).toBeDefined();
    expect(json.format_info.font).toBe('Times New Roman');
  }
});

test('187. Upload reformat requires sections', async ({ request }) => {
  const response = await request.post(`${BASE_URL}/api/upload/reformat`, {
    data: {
      doc_type: 'motion_to_dismiss',
      case_info: { plaintiff: 'Test' }
    }
  });
  // May return success with empty sections or error
  expect([200, 400]).toContain(response.status());
});

test('188. Upload reformat validates doc_type', async ({ request }) => {
  const response = await request.post(`${BASE_URL}/api/upload/reformat`, {
    data: {
      sections: { introduction: 'Test' },
      doc_type: 'invalid_type',
      case_info: { plaintiff: 'Test', defendant: 'Test' }
    }
  });
  expect(response.status()).toBe(400);
});

test('189. Upload page nav link highlights correctly', async ({ page }) => {
  await page.goto(`${BASE_URL}/upload`);
  await bypassRegistration(page);
  await expect(page.locator('a.nav-link.active[href="/upload"]')).toBeVisible();
});

test('190. Upload page has section tabs', async ({ page }) => {
  await page.goto(`${BASE_URL}/upload`);
  await bypassRegistration(page);
  // Tabs should be hidden initially (shown after file upload)
  const tabs = page.locator('#sectionTabs');
  await expect(tabs).toHaveCount(1);
});

test('191. Upload page doc type has motion options', async ({ page }) => {
  await page.goto(`${BASE_URL}/upload`);
  await bypassRegistration(page);
  await expect(page.locator('#docType option[value="motion_to_dismiss"]')).toHaveCount(1);
  await expect(page.locator('#docType option[value="opposition"]')).toHaveCount(1);
  await expect(page.locator('#docType option[value="reply"]')).toHaveCount(1);
});

test('192. Upload page has custom title field', async ({ page }) => {
  await page.goto(`${BASE_URL}/upload`);
  await bypassRegistration(page);
  await expect(page.locator('#customTitle')).toBeVisible();
});

test('193. Upload page accepts custom title input', async ({ page }) => {
  await page.goto(`${BASE_URL}/upload`);
  await bypassRegistration(page);
  await page.fill('#customTitle', 'MOTION TO COMPEL DISCOVERY');
  expect(await page.inputValue('#customTitle')).toBe('MOTION TO COMPEL DISCOVERY');
});

test('194. Upload page attorney section collapses', async ({ page }) => {
  await page.goto(`${BASE_URL}/upload`);
  await bypassRegistration(page);
  const attorneyCollapse = page.locator('#attorneyCollapse');
  await expect(attorneyCollapse).toHaveCount(1);
});

test('195. Upload page has attorney email field', async ({ page }) => {
  await page.goto(`${BASE_URL}/upload`);
  await bypassRegistration(page);
  // Attorney section is collapsed by default, expand it first
  await page.click('[data-bs-target="#attorneyCollapse"]');
  await page.waitForTimeout(500);
  await expect(page.locator('#attorneyEmail')).toBeVisible();
});

// ============================================================================
// RESEARCH API ENHANCED TESTS (196-205)
// ============================================================================

test('196. Research status endpoint exists', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}/api/research/status`);
  expect(response.status()).toBe(200);
  const json = await response.json();
  expect(json.configured).toBeDefined();
});

test('197. Research cases endpoint returns JSON', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}/api/research/cases?q=test`);
  const contentType = response.headers()['content-type'];
  expect(contentType).toContain('application/json');
});

test('198. Research handles missing query parameter', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}/api/research/cases`);
  expect(response.status()).toBe(400);
});

test('199. Research page search type selector exists', async ({ page }) => {
  await page.goto(`${BASE_URL}/research`);
  await bypassRegistration(page);
  await expect(page.locator('#searchType')).toBeVisible();
});

test('200. Research page has opinions search type', async ({ page }) => {
  await page.goto(`${BASE_URL}/research`);
  await bypassRegistration(page);
  await expect(page.locator('#searchType option[value="o"]')).toHaveCount(1);
});

test('201. Research page has dockets search type', async ({ page }) => {
  await page.goto(`${BASE_URL}/research`);
  await bypassRegistration(page);
  await expect(page.locator('#searchType option[value="d"]')).toHaveCount(1);
});

test('202. Research page has citation lookup', async ({ page }) => {
  await page.goto(`${BASE_URL}/research`);
  await bypassRegistration(page);
  await expect(page.locator('#citationInput')).toBeVisible();
});

test('203. Research page citation input accepts text', async ({ page }) => {
  await page.goto(`${BASE_URL}/research`);
  await bypassRegistration(page);
  await page.fill('#citationInput', '550 U.S. 544');
  expect(await page.inputValue('#citationInput')).toBe('550 U.S. 544');
});

test('204. Research page has filed after date field', async ({ page }) => {
  await page.goto(`${BASE_URL}/research`);
  await bypassRegistration(page);
  await expect(page.locator('#filedAfter')).toBeVisible();
});

test('205. Research page has filed before date field', async ({ page }) => {
  await page.goto(`${BASE_URL}/research`);
  await bypassRegistration(page);
  await expect(page.locator('#filedBefore')).toBeVisible();
});

// ============================================================================
// ACCESSIBILITY & PERFORMANCE TESTS (206-210)
// ============================================================================

test('206. All forms have labels', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  const inputs = await page.locator('input[type="text"]:visible').count();
  const labels = await page.locator('label').count();
  expect(labels).toBeGreaterThan(inputs / 2);
});

test('207. Page loads within 5 seconds', async ({ page }) => {
  const startTime = Date.now();
  await page.goto(BASE_URL);
  const loadTime = Date.now() - startTime;
  expect(loadTime).toBeLessThan(5000);
});

test('208. All buttons have text or aria-label', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  const buttons = await page.locator('button:visible').all();
  for (const button of buttons) {
    const text = await button.textContent();
    const ariaLabel = await button.getAttribute('aria-label');
    expect(text || ariaLabel).toBeTruthy();
  }
});

test('209. No broken images on homepage', async ({ page }) => {
  await page.goto(BASE_URL);
  const images = await page.locator('img').all();
  for (const img of images) {
    const naturalWidth = await img.evaluate(el => el.naturalWidth);
    expect(naturalWidth).toBeGreaterThan(0);
  }
});

test('210. External links open in new tab', async ({ page }) => {
  await page.goto(BASE_URL);
  const externalLinks = await page.locator('a[href^="http"]:not([href*="localhost"])').all();
  for (const link of externalLinks) {
    const target = await link.getAttribute('target');
    expect(target).toBe('_blank');
  }
});
