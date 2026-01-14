import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ES Module dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CONFIG
const BASE_URL = 'http://localhost:5173'; // Or 'https://baseball-savant.vercel.app'
const UPLOAD_CSV_PATH = process.argv[2]; // Pass CSV path as argument

if (!UPLOAD_CSV_PATH) {
    console.error('Usage: node scripts/generate_pitcher_reports.js <path_to_csv>');
    console.error('Example: node scripts/generate_pitcher_reports.js ./data/pitching_data.csv');
    process.exit(1);
}

const ABSOLUTE_CSV_PATH = path.resolve(process.cwd(), UPLOAD_CSV_PATH);

if (!fs.existsSync(ABSOLUTE_CSV_PATH)) {
    console.error(`Error: File not found at ${ABSOLUTE_CSV_PATH}`);
    process.exit(1);
}

(async () => {
    console.log('--- Pitcher Feedback PDF Generator ---');
    console.log(`Target CSV: ${ABSOLUTE_CSV_PATH}`);

    const browser = await chromium.launch({ headless: false }); // false to see it working
    const context = await browser.newContext();

    // 1. Bypass Login
    await context.addInitScript(() => {
        window.sessionStorage.setItem('authenticated', 'true');
    });

    const page = await context.newPage();

    try {
        // 2. Go to Feedback Page
        console.log(`Navigating to ${BASE_URL}/feedback...`);
        await page.goto(`${BASE_URL}/feedback`, { waitUntil: 'networkidle' });

        // 3. Upload File
        console.log('Uploading file...');
        // The input is hidden, so we target it directly or use setInputFiles on the label's associated input
        const fileInput = page.locator('input#feedback-upload');
        await fileInput.setInputFiles(ABSOLUTE_CSV_PATH);

        // Wait for processing (look for the "X rows" text to verify or wait for select to be enabled)
        // We can wait for the select to have options other than "Select..."
        console.log('Waiting for data parsing...');
        const playerSelect = page.locator('select').first(); // The first select is the player selector in individual mode

        // Wait until we have more than 1 option (the default is "Select...")
        await page.waitForFunction(() => {
            const select = document.querySelector('select');
            return select && select.options.length > 1;
        }, { timeout: 10000 });

        // 4. Get Player List
        const options = await playerSelect.locator('option').all();
        const playerNames = [];

        for (const option of options) {
            const val = await option.getAttribute('value');
            const text = await option.textContent();
            if (val && val !== '') {
                playerNames.push({ value: val, name: text });
            }
        }

        console.log(`Found ${playerNames.length} players.`);

        // Create output directory
        const outputDir = path.resolve(process.cwd(), 'feedback_reports');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }

        // 5. Generate PDFs
        for (let i = 0; i < playerNames.length; i++) {
            const player = playerNames[i];
            console.log(`[${i + 1}/${playerNames.length}] Generating report for: ${player.name}`);

            // Select Player
            await playerSelect.selectOption(player.value);

            // Wait for render (adjust timeout as needed for charts)
            await page.waitForTimeout(2000);

            // Save PDF
            const safeName = player.name.replace(/[^a-z0-9\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf]/gi, '_');
            const pdfPath = path.join(outputDir, `${safeName}_report.pdf`);

            await page.pdf({
                path: pdfPath,
                format: 'A4',
                printBackground: true,
                scale: 0.8, // Adjust scale if needed to fit content
                margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }
            });
        }

        console.log('--- Completed! ---');
        console.log(`Reports saved in: ${outputDir}`);

    } catch (e) {
        console.error('Error during automation:', e);
    } finally {
        await browser.close();
    }
})();
