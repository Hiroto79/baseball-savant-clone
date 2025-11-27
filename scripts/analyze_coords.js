import fs from 'fs';
import Papa from 'papaparse';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, '../src/data/data.csv');

const analyzeData = () => {
    const csvFile = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = Papa.parse(csvFile, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
    });

    const data = parsed.data;

    // Filter for hits with distance and coordinates
    const hits = data.filter(r => r.hc_x != null && r.hc_y != null && r.hit_distance_sc != null);

    console.log(`Analyzing ${hits.length} hits...`);

    // Calculate distance from home (125.42, 198.27) in hc units
    const homeX = 125.42;
    const homeY = 198.27;

    let totalRatio = 0;
    let count = 0;

    let maxDist = 0;
    let minHcY = 250;

    hits.forEach(h => {
        const dx = h.hc_x - homeX;
        const dy = h.hc_y - homeY; // Note: hc_y decreases as you go far
        const distHc = Math.sqrt(dx * dx + dy * dy);

        if (distHc > 0) {
            const ratio = h.hit_distance_sc / distHc;
            totalRatio += ratio;
            count++;

            // Check for outliers
            if (h.hit_distance_sc > 300 && h.events === 'single') {
                // console.log(`Long Single: ${h.hit_distance_sc}ft, hc_y: ${h.hc_y}`);
            }
        }

        if (h.hit_distance_sc > maxDist) maxDist = h.hit_distance_sc;
        if (h.hc_y < minHcY) minHcY = h.hc_y;
    });

    const avgRatio = totalRatio / count;
    console.log(`Average Feet per HC Unit: ${avgRatio.toFixed(4)}`);
    console.log(`Max Hit Distance: ${maxDist}`);
    console.log(`Min HC_Y (furthest point): ${minHcY}`);

    // Calculate Fence Position
    // If fence is 400ft
    const fenceDistHc = 400 / avgRatio;
    console.log(`400ft in HC units: ${fenceDistHc.toFixed(2)}`);
    console.log(`Fence Y coordinate (198.27 - dist): ${(198.27 - fenceDistHc).toFixed(2)}`);

};

analyzeData();
