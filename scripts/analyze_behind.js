import fs from 'fs';
import Papa from 'papaparse';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, '../src/data/data.csv');

const analyzeBehindHome = () => {
    const csvFile = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = Papa.parse(csvFile, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
    });

    const data = parsed.data;
    const homeY = 165.22;

    // Filter for Hits behind home
    const hitsBehind = data.filter(r =>
        ['single', 'double', 'triple', 'home_run'].includes(r.events) &&
        r.hc_y != null &&
        r.hc_y > homeY
    );

    console.log(`Found ${hitsBehind.length} hits "behind" home (Y > ${homeY}).`);
    if (hitsBehind.length > 0) {
        console.log('Sample hits behind home:');
        hitsBehind.slice(0, 5).forEach(h => {
            console.log(`- ${h.events}: (${h.hc_x}, ${h.hc_y}), Dist: ${h.hit_distance_sc}`);
        });

        const maxY = Math.max(...hitsBehind.map(h => h.hc_y));
        console.log(`Max Y of hits: ${maxY}`);
    }

    // Check max Y of ALL valid data points (including outs)
    const allPoints = data.filter(r => r.hc_y != null);
    const globalMaxY = Math.max(...allPoints.map(r => r.hc_y));
    console.log(`Global Max Y in dataset: ${globalMaxY}`);

    // Maybe the "Home Plate" is actually at Y = 200 or something, and my "short hits" analysis was skewed?
    // If I have hits at Y=190, then Home must be >= 190.
    // Let's see the distribution of Y for "catcher" or "popup" events?
};

analyzeBehindHome();
