import puppeteer from "puppeteer-core";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotsDir = path.resolve(__dirname, "../screenshots");
const artifactDir = "C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\6ce64375-5ab2-43bd-bb74-6d15f9649a7d";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

// Create sample test files for upload
const tempDir = path.resolve(__dirname, "temp_test_files");
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

const testZip1 = path.join(tempDir, "batch_archive1.zip");
const testZip2 = path.join(tempDir, "documents.7z");
const testZip3 = path.join(tempDir, "project_data.tar.gz");

fs.writeFileSync(testZip1, "PK\x05\x06" + "\x00".repeat(18));
fs.writeFileSync(testZip2, "7z\xBC\xAF\x27\x1C" + "\x00".repeat(26));
fs.writeFileSync(testZip3, "\x1F\x8B\x08" + "\x00".repeat(20));

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1280,950"],
    defaultViewport: { width: 1280, height: 950 },
  });

  const page = await browser.newPage();

  async function saveScreenshot(filename) {
    const p1 = path.join(screenshotsDir, filename);
    const p2 = path.join(artifactDir, filename);
    await page.screenshot({ path: p1, fullPage: false });
    fs.copyFileSync(p1, p2);
    console.log(`Saved screenshot: ${filename}`);
  }

  // 1. Feature 1: Multi-Format Archive Upload with multiple files selected
  console.log("1. Capturing Feature 1: Multi-Format Archive Support...");
  await page.goto("http://localhost:3000/upload", { waitUntil: "networkidle0" });
  await page.waitForSelector('input[type="file"]');
  
  const inputElement = await page.$('input[type="file"]');
  await inputElement.uploadFile(testZip1, testZip2, testZip3);
  await new Promise((r) => setTimeout(r, 600));
  await saveScreenshot("feature1_multiformat_upload.png");

  // 2. Feature 3: Multiple Archive Upload & Batch Processing (Folder Page with Same/Different Mode Selector)
  console.log("2. Capturing Feature 3: Batch Parent Folder Assignment...");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const btn = btns.find((b) => b.textContent.includes("Continue to Folder Assignment"));
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 1000));
  await saveScreenshot("feature3_batch_processing_modes.png");

  // 3. Feature 4: Resume Interrupted Jobs (Leave Workflow Guard Modal & Unfinished Jobs Banner)
  console.log("3. Capturing Feature 4: Resume Interrupted Jobs & Leave Guard Modal...");
  await page.evaluate(() => {
    const headerLogo = document.querySelector("header div.cursor-pointer");
    if (headerLogo) headerLogo.click();
  });
  await new Promise((r) => setTimeout(r, 600));
  await saveScreenshot("feature4_resume_and_leave_guard.png");

  // Dismiss modal
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const cancelBtn = btns.find((b) => b.textContent.trim() === "Cancel");
    if (cancelBtn) cancelBtn.click();
  });
  await new Promise((r) => setTimeout(r, 400));

  // 4. Feature 5: In-Browser PDF Viewer & History Viewer with Preview Modal
  console.log("4. Capturing Feature 5: PDF Viewer & MongoDB History...");
  await page.goto("http://localhost:3000/history", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1200));
  // Click on the first PDF eye preview icon to open the PDF Viewer Modal
  await page.evaluate(() => {
    const eyeBtn = document.querySelector("button:has(svg), td button");
    const previewIcons = Array.from(document.querySelectorAll("button"));
    const viewBtn = previewIcons.find((el) => el.querySelector("svg") && el.closest("td"));
    if (viewBtn) viewBtn.click();
  });
  await new Promise((r) => setTimeout(r, 1000));
  await saveScreenshot("feature5_pdf_viewer_and_history.png");

  // 5. Feature 2: Universal File Format Support & Organization
  console.log("5. Capturing Feature 2: Universal File Format Organization...");
  await page.goto("http://localhost:3000/history", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1000));
  await saveScreenshot("feature2_universal_file_organization.png");

  await browser.close();
  console.log("All 5 feature workflow screenshots captured successfully!");
}

run().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
