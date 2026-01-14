import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5173';
const UPLOAD_CSV_PATH = process.argv[2];

if (!UPLOAD_CSV_PATH) {
    console.error('Usage: node scripts/generate_hitter_reports.js <path_to_csv>');
    process.exit(1);
}

const ABSOLUTE_CSV_PATH = path.resolve(process.cwd(), UPLOAD_CSV_PATH);

if (!fs.existsSync(ABSOLUTE_CSV_PATH)) {
    console.error(`Error: File not found at ${ABSOLUTE_CSV_PATH}`);
    process.exit(1);
}

(async () => {
    console.log('--- Hitter Feedback PDF Generator ---');
    console.log(`Target CSV: ${ABSOLUTE_CSV_PATH}`);

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();

    // Bypass Login
    await context.addInitScript(() => {
        window.sessionStorage.setItem('authenticated', 'true');
    });

    const page = await context.newPage();

    try {
        console.log(`Navigating to ${BASE_URL}/hitter-feedback...`);
        await page.goto(`${BASE_URL}/hitter-feedback`);

        // Upload
        console.log('Uploading file...');
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(ABSOLUTE_CSV_PATH);

        console.log('Waiting for data parsing...');
        // Wait for player select to populate
        // In HitterFeedback, the player select is the second one?
        // Let's find the select that contains player names.
        // Or wait for the "rows" text to appear.

        await page.waitForTimeout(2000); // Initial wait

        // Find the player select. It usually defaults to "" or the first player.
        // Based on grep, there is a reportType select then a player select.
        // We target the one that is NOT reportType.
        // reportType values are 'detail', 'team'. Player values are names.

        const selects = page.locator('select');
        const count = await selects.count();
        let playerSelect;

        for (let i = 0; i < count; i++) {
            const loc = selects.nth(i);
            const val = await loc.inputValue();
            // Assuming 'detail' is report type.
            if (val !== 'detail' && val !== 'team') {
                // This might be the player select
                playerSelect = loc;
                // Double check if it has multiple options
                const opts = await loc.locator('option').count();
                if (opts > 1) break;
            }
        }

        if (!playerSelect) {
            // Fallback: assume the second one or the one with empty default
            playerSelect = selects.last();
        }

        // Wait for options
        await page.waitForFunction((el) => el.options.length > 1, await playerSelect.elementHandle());

        const options = await playerSelect.locator('option').all();
        const playerNames = [];

        for (const option of options) {
            const val = await option.getAttribute('value');
            const text = await option.textContent();
            if (val && val !== '') {
                playerNames.push({ value: val, name: text });
            }
        }

        console.log(`Found ${playerNames.length} hitters.`);

        const outputDir = path.resolve(process.cwd(), 'hitter_reports');
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

        for (let i = 0; i < playerNames.length; i++) {
            const player = playerNames[i];
            console.log(`[${i + 1}/${playerNames.length}] Generating report for: ${player.name}`);

            await playerSelect.selectOption(player.value);
            await page.waitForTimeout(2000); // Wait for charts

            const safeName = player.name.replace(/[^a-z0-9\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf]/gi, '_');
            const pdfPath = path.join(outputDir, `${safeName}_report.pdf`);

            await page.pdf({
                path: pdfPath,
                format: 'A4',
                printBackground: true,
                scale: 0.8,
                margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }
            });
        }

        console.log('--- Completed! ---');

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await browser.close();
    }
})();
