import fs from 'fs';
import Papa from 'papaparse';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, '../src/data/data.csv');

const analyzeOrigin = () => {
    const csvFile = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = Papa.parse(csvFile, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
    });

    const data = parsed.data;

    // 1. Find Home Plate Origin
    // Look for hits with very small distance
    const shortHits = data.filter(r => r.hit_distance_sc != null && r.hit_distance_sc < 10 && r.hc_x != null && r.hc_y != null);

    console.log(`Found ${shortHits.length} hits within 10ft of home.`);

    if (shortHits.length > 0) {
        const avgX = shortHits.reduce((sum, r) => sum + r.hc_x, 0) / shortHits.length;
        const avgY = shortHits.reduce((sum, r) => sum + r.hc_y, 0) / shortHits.length;
        console.log(`Empirical Home Plate (from <10ft hits): (${avgX.toFixed(2)}, ${avgY.toFixed(2)})`);
    } else {
        // Try < 20ft
        const shortHits20 = data.filter(r => r.hit_distance_sc != null && r.hit_distance_sc < 20 && r.hc_x != null && r.hc_y != null);
        console.log(`Found ${shortHits20.length} hits within 20ft of home.`);
        if (shortHits20.length > 0) {
            const avgX = shortHits20.reduce((sum, r) => sum + r.hc_x, 0) / shortHits20.length;
            const avgY = shortHits20.reduce((sum, r) => sum + r.hc_y, 0) / shortHits20.length;
            console.log(`Empirical Home Plate (from <20ft hits): (${avgX.toFixed(2)}, ${avgY.toFixed(2)})`);
        }
    }

    // 2. Check Center Line
    // Average X of all hits? Might be skewed if more pull hitters.
    // Let's look at hits "up the middle" (bearing ~0).
    // Or just assume symmetry.

    // 3. Re-calculate Scale with new Origin
    // Let's assume the origin found above is correct.
    // Let's use (125.42, 198.27) as reference vs empirical.
};

analyzeOrigin();
