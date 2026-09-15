import puppeteer from "puppeteer-core";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotsDir = path.resolve(__dirname, "../screenshots");
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Artifact directory to also save embedded screenshots
const artifactDir = "C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\6ce64375-5ab2-43bd-bb74-6d15f9649a7d";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function run() {
  console.log("Launching Chrome via puppeteer-core...");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1280,900"],
    defaultViewport: { width: 1280, height: 900 },
  });

  const page = await browser.newPage();

  // Helper to save screenshot to both screenshots dir and artifacts dir
  async function saveScreenshot(filename) {
    const p1 = path.join(screenshotsDir, filename);
    const p2 = path.join(artifactDir, filename);
    await page.screenshot({ path: p1, fullPage: false });
    fs.copyFileSync(p1, p2);
    console.log(`Saved screenshot: ${filename}`);
  }

  // 1. Feature 1: Multi-Format Archive Support (Upload Page)
  console.log("Capturing Feature 1: Multi-Format Archive Support...");
  await page.goto("http://localhost:3000/upload", { waitUntil: "networkidle0" });
  await page.waitForSelector("header");
  await saveScreenshot("feature1_multiformat_upload.png");

  // 2. Feature 3: Multiple Archive Upload & Batch Processing (Folder Page with Batch Mode)
  console.log("Capturing Feature 3: Multiple Archive Upload & Batch Processing...");
  await page.goto("http://localhost:3000/folder", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1000));
  await saveScreenshot("feature3_batch_folder_modes.png");

  // 3. Feature 4: Resume Interrupted Jobs (Unfinished Jobs banner & workflow)
  console.log("Capturing Feature 4: Resume Interrupted Jobs...");
  await page.goto("http://localhost:3000/upload", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 800));
  await saveScreenshot("feature4_resume_interrupted_jobs.png");

  // 4. Feature 5: In-Browser PDF Viewer & History (MongoDB Conversion History)
  console.log("Capturing Feature 5: In-Browser PDF Viewer & History...");
  await page.goto("http://localhost:3000/history", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1500));
  await saveScreenshot("feature5_history_and_pdf_viewer.png");

  // 5. Feature 2: Universal File Format Support & Organization (Summary Report)
  console.log("Capturing Feature 2: Universal File Format Support & Organization...");
  await page.goto("http://localhost:3000/summary", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1200));
  await saveScreenshot("feature2_universal_file_organization.png");

  await browser.close();
  console.log("All screenshots captured successfully!");
}

run().catch((err) => {
  console.error("Error capturing screenshots:", err);
  process.exit(1);
});
