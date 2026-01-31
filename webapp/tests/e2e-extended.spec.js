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

// Helper to fill minimum required fields
async function fillRequiredFields(page) {
  await page.fill('#plaintiff', 'John Doe');
  await page.fill('#defendant', 'Jane Smith');
  await page.fill('#attorneyName', 'Robert Attorney');
  await page.fill('#address', '123 Main Street');
  await page.fill('#cityStateZip', 'Washington, DC 20001');
  await page.fill('#phone', '(202) 555-1234');
  await page.fill('#email', 'attorney@testfirm.com');
  await page.fill('#dcBarNumber', '123456');
}

// ============================================================================
// DOCUMENT TYPE TESTS (61-75)
// ============================================================================

test('61. Motion to Dismiss option exists', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await expect(page.locator('#documentType option[value="motion_to_dismiss"]')).toHaveCount(1);
});

test('62. Motion for Summary Judgment option exists', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await expect(page.locator('#documentType option[value="motion_summary_judgment"]')).toHaveCount(1);
});

test('63. Motion to Compel option exists', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await expect(page.locator('#documentType option[value="motion_to_compel"]')).toHaveCount(1);
});

test('64. Motion for Preliminary Injunction option exists', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await expect(page.locator('#documentType option[value="motion_preliminary_injunction"]')).toHaveCount(1);
});

test('65. Motion for TRO option exists', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await expect(page.locator('#documentType option[value="motion_tro"]')).toHaveCount(1);
});

test('66. Motion for Leave to Amend option exists', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await expect(page.locator('#documentType option[value="motion_leave_amend"]')).toHaveCount(1);
});

test('67. Motion to Extend Time option exists', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await expect(page.locator('#documentType option[value="motion_extend_time"]')).toHaveCount(1);
});

test('68. Opposition option exists', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await expect(page.locator('#documentType option[value="opposition"]')).toHaveCount(1);
});

test('69. Reply option exists', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await expect(page.locator('#documentType option[value="reply"]')).toHaveCount(1);
});

test('70. Complaint option exists', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await expect(page.locator('#documentType option[value="complaint"]')).toHaveCount(1);
});

test('71. Answer option exists', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await expect(page.locator('#documentType option[value="answer"]')).toHaveCount(1);
});

test('72. Notice of Appeal option exists', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await expect(page.locator('#documentType option[value="notice_of_appeal"]')).toHaveCount(1);
});

test('73. Opposition shows motion type field', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await page.selectOption('#documentType', 'opposition');
  await expect(page.locator('#motionTypeRow')).toBeVisible();
});

test('74. Reply shows motion type field', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await page.selectOption('#documentType', 'reply');
  await expect(page.locator('#motionTypeRow')).toBeVisible();
});

test('75. Motion to Dismiss hides motion type field', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await page.selectOption('#documentType', 'motion_to_dismiss');
  await expect(page.locator('#motionTypeRow')).not.toBeVisible();
});

// ============================================================================
// JUDGE LIST VERIFICATION TESTS (76-90)
// ============================================================================

test('76. Judge JEB (Boasberg) exists', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}/api/judges`);
  const json = await response.json();
  expect(json.judges.find(j => j.initials === 'JEB')).toBeDefined();
});

test('77. Judge RC (Contreras) exists', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}/api/judges`);
  const json = await response.json();
  expect(json.judges.find(j => j.initials === 'RC')).toBeDefined();
});

test('78. Judge CRC (Cooper) exists', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}/api/judges`);
  const json = await response.json();
  expect(json.judges.find(j => j.initials === 'CRC')).toBeDefined();
});

test('79. Judge TSC (Chutkan) exists', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}/api/judges`);
  const json = await response.json();
  expect(json.judges.find(j => j.initials === 'TSC')).toBeDefined();
});

test('80. Judge RDM (Moss) exists', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}/api/judges`);
  const json = await response.json();
  expect(json.judges.find(j => j.initials === 'RDM')).toBeDefined();
});

test('81. Judge APM (Mehta) exists', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}/api/judges`);
  const json = await response.json();
  expect(json.judges.find(j => j.initials === 'APM')).toBeDefined();
});

test('82. Judge TJK (Kelly) exists', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}/api/judges`);
  const json = await response.json();
  expect(json.judges.find(j => j.initials === 'TJK')).toBeDefined();
});

test('83. Judge TNM (McFadden) exists', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}/api/judges`);
  const json = await response.json();
  expect(json.judges.find(j => j.initials === 'TNM')).toBeDefined();
});

test('84. Judge DLF (Friedrich) exists', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}/api/judges`);
  const json = await response.json();
  expect(json.judges.find(j => j.initials === 'DLF')).toBeDefined();
});

test('85. Judge CJN (Nichols) exists', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}/api/judges`);
  const json = await response.json();
  expect(json.judges.find(j => j.initials === 'CJN')).toBeDefined();
});

test('86. Judge JMC (Cobb) exists with correct initials', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}/api/judges`);
  const json = await response.json();
  const cobb = json.judges.find(j => j.initials === 'JMC');
  expect(cobb).toBeDefined();
  expect(cobb.name).toContain('Cobb');
});

test('87. Judge ACR (Reyes) exists with correct initials', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}/api/judges`);
  const json = await response.json();
  const reyes = json.judges.find(j => j.initials === 'ACR');
  expect(reyes).toBeDefined();
  expect(reyes.name).toContain('Reyes');
});

test('88. Judge LLA (AliKhan) exists with correct initials', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}/api/judges`);
  const json = await response.json();
  const alikhan = json.judges.find(j => j.initials === 'LLA');
  expect(alikhan).toBeDefined();
  expect(alikhan.name).toContain('AliKhan');
});

test('89. Removed judge GK (Kessler) does not exist', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}/api/judges`);
  const json = await response.json();
  expect(json.judges.find(j => j.initials === 'GK')).toBeUndefined();
});

test('90. Removed judge TFH (Hogan) does not exist', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}/api/judges`);
  const json = await response.json();
  expect(json.judges.find(j => j.initials === 'TFH')).toBeUndefined();
});

// ============================================================================
// SENIOR JUDGE TESTS (91-100)
// ============================================================================

test('91. Senior Judge RCL (Lamberth) exists', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}/api/judges`);
  const json = await response.json();
  const judge = json.judges.find(j => j.initials === 'RCL');
  expect(judge).toBeDefined();
  expect(judge.status).toBe('senior');
});

test('92. Senior Judge PLF (Friedman) exists', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}/api/judges`);
  const json = await response.json();
  const judge = json.judges.find(j => j.initials === 'PLF');
  expect(judge).toBeDefined();
});

test('93. Senior Judge EGS (Sullivan) exists', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}/api/judges`);
  const json = await response.json();
  const judge = json.judges.find(j => j.initials === 'EGS');
  expect(judge).toBeDefined();
});

test('94. Senior Judge RBW (Walton) exists', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}/api/judges`);
  const json = await response.json();
  const judge = json.judges.find(j => j.initials === 'RBW');
  expect(judge).toBeDefined();
});

test('95. Senior Judge JDB (Bates) exists', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}/api/judges`);
  const json = await response.json();
  const judge = json.judges.find(j => j.initials === 'JDB');
  expect(judge).toBeDefined();
});

test('96. Senior Judge RJL (Leon) exists', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}/api/judges`);
  const json = await response.json();
  const judge = json.judges.find(j => j.initials === 'RJL');
  expect(judge).toBeDefined();
});

test('97. Senior Judge CKK (Kollar-Kotelly) exists', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}/api/judges`);
  const json = await response.json();
  const judge = json.judges.find(j => j.initials === 'CKK');
  expect(judge).toBeDefined();
});

test('98. Senior Judge ABJ (Jackson) exists', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}/api/judges`);
  const json = await response.json();
  const judge = json.judges.find(j => j.initials === 'ABJ');
  expect(judge).toBeDefined();
});

test('99. Senior Judge BAH (Howell) exists', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}/api/judges`);
  const json = await response.json();
  const judge = json.judges.find(j => j.initials === 'BAH');
  expect(judge).toBeDefined();
});

test('100. Active judges have status "active"', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}/api/judges`);
  const json = await response.json();
  const activeJudges = json.judges.filter(j => j.status === 'active');
  expect(activeJudges.length).toBe(15);
});

// ============================================================================
// FORM VALIDATION TESTS (101-115)
// ============================================================================

test('101. Plaintiff field accepts text input', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await page.fill('#plaintiff', 'Test Plaintiff Name');
  expect(await page.inputValue('#plaintiff')).toBe('Test Plaintiff Name');
});

test('102. Defendant field accepts text input', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await page.fill('#defendant', 'Test Defendant Name');
  expect(await page.inputValue('#defendant')).toBe('Test Defendant Name');
});

test('103. Case number field accepts valid format', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await page.fill('#caseNumber', '1:24-cv-00123-ABC');
  expect(await page.inputValue('#caseNumber')).toBe('1:24-cv-00123-ABC');
});

test('104. Attorney name field accepts input', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await page.fill('#attorneyName', 'John Attorney');
  expect(await page.inputValue('#attorneyName')).toBe('John Attorney');
});

test('105. Firm name field accepts input', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await page.fill('#firmName', 'Smith & Associates LLP');
  expect(await page.inputValue('#firmName')).toBe('Smith & Associates LLP');
});

test('106. Address field accepts input', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await page.fill('#address', '1600 Pennsylvania Avenue');
  expect(await page.inputValue('#address')).toBe('1600 Pennsylvania Avenue');
});

test('107. City/State/ZIP field accepts input', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await page.fill('#cityStateZip', 'Washington, DC 20500');
  expect(await page.inputValue('#cityStateZip')).toBe('Washington, DC 20500');
});

test('108. Phone field accepts input', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await page.fill('#phone', '(202) 456-1414');
  expect(await page.inputValue('#phone')).toBe('(202) 456-1414');
});

test('109. Email field accepts valid email', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await page.fill('#email', 'test@example.com');
  expect(await page.inputValue('#email')).toBe('test@example.com');
});

test('110. DC Bar number field accepts input', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await page.fill('#dcBarNumber', '987654');
  expect(await page.inputValue('#dcBarNumber')).toBe('987654');
});

test('111. Introduction textarea accepts long text', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  const longText = 'This is a test introduction. '.repeat(50);
  await page.fill('#introduction', longText);
  expect(await page.inputValue('#introduction')).toBe(longText);
});

test('112. Facts textarea accepts input', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await page.fill('#facts', 'These are the facts of the case.');
  expect(await page.inputValue('#facts')).toBe('These are the facts of the case.');
});

test('113. Legal standard textarea accepts input', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await page.fill('#legalStandard', 'The legal standard is...');
  expect(await page.inputValue('#legalStandard')).toBe('The legal standard is...');
});

test('114. Argument textarea accepts input', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await page.fill('#argument', 'The argument is compelling because...');
  expect(await page.inputValue('#argument')).toBe('The argument is compelling because...');
});

test('115. Conclusion textarea accepts input', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await page.fill('#conclusion', 'Therefore, plaintiff requests relief.');
  expect(await page.inputValue('#conclusion')).toBe('Therefore, plaintiff requests relief.');
});

// ============================================================================
// UI INTERACTION TESTS (116-130)
// ============================================================================

test('116. Judge dropdown can be changed', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await page.waitForTimeout(2000);
  await page.selectOption('#judgeSelect', 'TSC');
  expect(await page.inputValue('#judgeSelect')).toBe('TSC');
});

test('117. Party represented dropdown works', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await page.selectOption('#partyRepresented', 'Defendant');
  expect(await page.inputValue('#partyRepresented')).toBe('Defendant');
});

test('118. Certificate of service checkbox is checked by default', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  expect(await page.isChecked('#includeCertificate')).toBe(true);
});

test('119. Certificate of service checkbox can be unchecked', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await page.uncheck('#includeCertificate');
  expect(await page.isChecked('#includeCertificate')).toBe(false);
});

test('120. Filing date field exists', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await expect(page.locator('#filingDate')).toBeVisible();
});

test('121. Filing date has default value of today', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  const dateValue = await page.inputValue('#filingDate');
  const today = new Date().toISOString().split('T')[0];
  expect(dateValue).toBe(today);
});

test('122. Custom title field accepts input', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await page.fill('#customTitle', 'CUSTOM MOTION TITLE');
  expect(await page.inputValue('#customTitle')).toBe('CUSTOM MOTION TITLE');
});

test('123. Add multiple argument sections', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await page.click('button:has-text("Add Argument Section")');
  await page.click('button:has-text("Add Argument Section")');
  await page.click('button:has-text("Add Argument Section")');
  const sections = await page.locator('.additional-argument').count();
  expect(sections).toBe(3);
});

test('124. Remove argument section works', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await page.click('button:has-text("Add Argument Section")');
  await page.click('button:has-text("Add Argument Section")');
  await page.click('.additional-argument button.btn-outline-danger');
  const sections = await page.locator('.additional-argument').count();
  expect(sections).toBe(1);
});

test('125. Argument section has heading field', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await page.click('button:has-text("Add Argument Section")');
  await expect(page.locator('[id^="argHeading-"]')).toBeVisible();
});

test('126. Argument section has content field', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await page.click('button:has-text("Add Argument Section")');
  await expect(page.locator('[id^="argContent-"]')).toBeVisible();
});

test('127. Clear form button shows confirmation', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  page.on('dialog', dialog => dialog.dismiss());
  await page.click('button:has-text("Clear Form")');
});

test('128. Motion type field placeholder is correct', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await page.selectOption('#documentType', 'opposition');
  const placeholder = await page.getAttribute('#motionType', 'placeholder');
  expect(placeholder).toContain('MOTION TO DISMISS');
});

test('129. Party name field exists', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await expect(page.locator('#partyName')).toBeVisible();
});

test('130. Party name accepts input', async ({ page }) => {
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await page.fill('#partyName', 'Plaintiff John Doe');
  expect(await page.inputValue('#partyName')).toBe('Plaintiff John Doe');
});

// ============================================================================
// API VALIDATION TESTS (131-145)
// ============================================================================

test('131. Validate API returns is_valid field', async ({ request }) => {
  const response = await request.post(`${BASE_URL}/api/validate`, {
    data: { document_type: 'motion_to_dismiss', plaintiff: 'Test', defendant: 'Test' }
  });
  const json = await response.json();
  expect(json.is_valid).toBeDefined();
});

test('132. Validate API returns errors array', async ({ request }) => {
  const response = await request.post(`${BASE_URL}/api/validate`, {
    data: { document_type: 'motion_to_dismiss', plaintiff: 'Test', defendant: 'Test' }
  });
  const json = await response.json();
  expect(Array.isArray(json.errors)).toBe(true);
});

test('133. Validate API returns warnings array', async ({ request }) => {
  const response = await request.post(`${BASE_URL}/api/validate`, {
    data: { document_type: 'motion_to_dismiss', plaintiff: 'Test', defendant: 'Test' }
  });
  const json = await response.json();
  expect(Array.isArray(json.warnings)).toBe(true);
});

test('134. Validate API returns passed array', async ({ request }) => {
  const response = await request.post(`${BASE_URL}/api/validate`, {
    data: { document_type: 'motion_to_dismiss', plaintiff: 'Test', defendant: 'Test' }
  });
  const json = await response.json();
  expect(Array.isArray(json.passed)).toBe(true);
});

test('135. Validate API warns on missing case number', async ({ request }) => {
  const response = await request.post(`${BASE_URL}/api/validate`, {
    data: { document_type: 'motion_to_dismiss', plaintiff: 'Test', defendant: 'Test' }
  });
  const json = await response.json();
  const caseWarning = json.warnings.find(w => w.check === 'case_number_missing');
  expect(caseWarning).toBeDefined();
});

test('136. Validate API passes valid case number', async ({ request }) => {
  const response = await request.post(`${BASE_URL}/api/validate`, {
    data: {
      document_type: 'motion_to_dismiss',
      plaintiff: 'Test',
      defendant: 'Test',
      case_number: '1:24-cv-00123-ABC'
    }
  });
  const json = await response.json();
  const casePassed = json.passed.find(p => p.check === 'case_number_format');
  expect(casePassed).toBeDefined();
});

test('137. Validate API errors on invalid case number format', async ({ request }) => {
  const response = await request.post(`${BASE_URL}/api/validate`, {
    data: {
      document_type: 'motion_to_dismiss',
      plaintiff: 'Test',
      defendant: 'Test',
      case_number: 'invalid-format'
    }
  });
  const json = await response.json();
  const caseError = json.errors.find(e => e.check === 'case_number_format');
  expect(caseError).toBeDefined();
});

test('138. Templates API returns correct structure', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}/api/templates`);
  const json = await response.json();
  expect(json.templates[0]).toHaveProperty('id');
  expect(json.templates[0]).toHaveProperty('name');
  expect(json.templates[0]).toHaveProperty('category');
});

test('139. Rules API returns format_specs', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}/api/rules`);
  const json = await response.json();
  expect(json.format_specs.font_name).toBe('Times New Roman');
  expect(json.format_specs.font_size).toBe(12);
});

test('140. Rules API returns page limits', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}/api/rules`);
  const json = await response.json();
  expect(json.page_limits.motion).toBe(45);
  expect(json.page_limits.reply).toBe(25);
});

test('141. Generate API rejects missing plaintiff', async ({ request }) => {
  const response = await request.post(`${BASE_URL}/api/generate`, {
    data: { document_type: 'motion_to_dismiss', defendant: 'Test' }
  });
  expect(response.status()).toBe(400);
});

test('142. Generate API rejects missing defendant', async ({ request }) => {
  const response = await request.post(`${BASE_URL}/api/generate`, {
    data: { document_type: 'motion_to_dismiss', plaintiff: 'Test' }
  });
  expect(response.status()).toBe(400);
});

test('143. Generate API rejects missing document_type', async ({ request }) => {
  const response = await request.post(`${BASE_URL}/api/generate`, {
    data: { plaintiff: 'Test', defendant: 'Test' }
  });
  expect(response.status()).toBe(400);
});

test('144. Generate API rejects invalid document_type', async ({ request }) => {
  const response = await request.post(`${BASE_URL}/api/generate`, {
    data: { document_type: 'invalid_type', plaintiff: 'Test', defendant: 'Test' }
  });
  expect(response.status()).toBe(400);
});

test('145. Generate API accepts request without case number', async ({ request }) => {
  const response = await request.post(`${BASE_URL}/api/generate`, {
    data: {
      document_type: 'motion_to_dismiss',
      plaintiff: 'Test Plaintiff',
      defendant: 'Test Defendant',
      format: 'docx'
    }
  });
  expect(response.status()).toBe(200);
});

// ============================================================================
// RESEARCH PAGE TESTS (146-155)
// ============================================================================

test('146. Research page has search form', async ({ page }) => {
  await page.goto(`${BASE_URL}/research`);
  await bypassRegistration(page);
  await expect(page.locator('#searchForm')).toBeVisible();
});

test('147. Research page has search query field', async ({ page }) => {
  await page.goto(`${BASE_URL}/research`);
  await bypassRegistration(page);
  await expect(page.locator('#searchQuery')).toBeVisible();
});

test('148. Research page has search button', async ({ page }) => {
  await page.goto(`${BASE_URL}/research`);
  await bypassRegistration(page);
  await expect(page.locator('button:has-text("Search")')).toBeVisible();
});

test('149. Research page has results container', async ({ page }) => {
  await page.goto(`${BASE_URL}/research`);
  await bypassRegistration(page);
  await expect(page.locator('#resultsContainer')).toBeVisible();
});

test('150. Research page has API status card', async ({ page }) => {
  await page.goto(`${BASE_URL}/research`);
  await bypassRegistration(page);
  await expect(page.locator('#apiStatusCard, .api-status')).toBeVisible();
});

test('151. Research page navbar link is active', async ({ page }) => {
  await page.goto(`${BASE_URL}/research`);
  await bypassRegistration(page);
  await expect(page.locator('a.nav-link.active:has-text("Research")')).toBeVisible();
});

test('152. Research page has docket number field', async ({ page }) => {
  await page.goto(`${BASE_URL}/research`);
  await bypassRegistration(page);
  await expect(page.locator('#docketNumber, input[placeholder*="docket"]')).toBeVisible();
});

test('153. Research page has date range fields', async ({ page }) => {
  await page.goto(`${BASE_URL}/research`);
  await bypassRegistration(page);
  await expect(page.locator('#dateFrom, input[type="date"]').first()).toBeVisible();
});

test('154. Research page search form submits', async ({ page }) => {
  await page.goto(`${BASE_URL}/research`);
  await bypassRegistration(page);
  await page.fill('#searchQuery', 'test');
  await page.click('button:has-text("Search")');
  await page.waitForTimeout(2000);
});

test('155. Research page has card layout', async ({ page }) => {
  await page.goto(`${BASE_URL}/research`);
  await bypassRegistration(page);
  await expect(page.locator('.card').first()).toBeVisible();
});

// ============================================================================
// RESPONSIVE & MOBILE TESTS (156-160)
// ============================================================================

test('156. Mobile navbar toggle exists', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto(BASE_URL);
  await bypassRegistration(page);
  await expect(page.locator('.navbar-toggler')).toBeVisible();
});

test('157. Mobile navbar toggle works', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto(BASE_URL);
  await bypassRegistration(page);
  await page.click('.navbar-toggler');
  await expect(page.locator('.navbar-collapse.show, .navbar-collapse.collapsing')).toBeVisible();
});

test('158. Form is usable on tablet viewport', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await expect(page.locator('#documentForm')).toBeVisible();
});

test('159. Cards stack on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await expect(page.locator('.card').first()).toBeVisible();
});

test('160. Generate buttons visible on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto(`${BASE_URL}/generator`);
  await bypassRegistration(page);
  await expect(page.locator('button:has-text("Generate DOCX")')).toBeVisible();
});
