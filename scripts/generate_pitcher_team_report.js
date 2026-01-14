import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5173';
const UPLOAD_CSV_PATH = process.argv[2];

if (!UPLOAD_CSV_PATH) {
    console.error('Usage: node scripts/generate_pitcher_team_report.js <path_to_csv>');
    process.exit(1);
}

const ABSOLUTE_CSV_PATH = path.resolve(process.cwd(), UPLOAD_CSV_PATH);

if (!fs.existsSync(ABSOLUTE_CSV_PATH)) {
    console.error(`Error: File not found at ${ABSOLUTE_CSV_PATH}`);
    process.exit(1);
}

(async () => {
    console.log('--- Pitcher Team Feedback PDF Generator ---');
    console.log(`Target CSV: ${ABSOLUTE_CSV_PATH}`);

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();

    await context.addInitScript(() => {
        window.sessionStorage.setItem('authenticated', 'true');
    });

    const page = await context.newPage();

    try {
        console.log(`Navigating to ${BASE_URL}/feedback...`);
        await page.goto(`${BASE_URL}/feedback`);

        // Switch to Team View
        console.log('Switching to Team View...');
        await page.getByText('チーム一覧').click();

        // Upload
        console.log('Uploading file...');
        const fileInput = page.locator('input#feedback-upload');
        await fileInput.setInputFiles(ABSOLUTE_CSV_PATH);

        console.log('Waiting for data parsing...');
        // Wait for table rows or summary data
        // Check for specific team view element, e.g., "Team Average" row or similar
        await page.waitForTimeout(3000);

        const outputDir = path.resolve(process.cwd(), 'feedback_reports');
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

        console.log('Generating Team Report PDF...');
        const pdfPath = path.join(outputDir, `Team_Report.pdf`);

        await page.pdf({
            path: pdfPath,
            format: 'A4',
            printBackground: true,
            landscape: true, // Team view might look better in landscape
            scale: 0.8,
            margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }
        });

        console.log('--- Completed! ---');
        console.log(`Saved to: ${pdfPath}`);

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await browser.close();
    }
})();
