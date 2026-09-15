import puppeteer from "puppeteer-core";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotsDir = path.resolve(__dirname, "../screenshots");
const artifactDir = "C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\6ce64375-5ab2-43bd-bb74-6d15f9649a7d";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

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

  // Feature 2: Universal File Format Support & Organization Breakdown
  console.log("Capturing Feature 2: Universal File Classification & Organization...");
  // Navigate to history viewer showing organized folders & output hierarchy
  await page.goto("http://localhost:3000/history", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1200));
  await saveScreenshot("feature2_universal_file_organization.png");

  await browser.close();
}

run().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
