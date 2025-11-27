import fs from 'fs';
import Papa from 'papaparse';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, '../src/data/data.csv');

const analyzeHomeRuns = () => {
    const csvFile = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = Papa.parse(csvFile, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
    });

    const data = parsed.data;
    const homeX = 125.42;
    const homeY = 198.27;

    // Filter for Home Runs
    const hrs = data.filter(r => r.events === 'home_run' && r.hc_x != null && r.hc_y != null && r.hit_distance_sc != null);

    console.log(`Analyzing ${hrs.length} Home Runs...`);

    let totalRatio = 0;
    let count = 0;
    let minHcY = 250;
    let maxDist = 0;

    hrs.forEach(h => {
        const dx = h.hc_x - homeX;
        const dy = h.hc_y - homeY;
        const distHc = Math.sqrt(dx * dx + dy * dy);

        if (distHc > 0) {
            const ratio = h.hit_distance_sc / distHc;
            totalRatio += ratio;
            count++;
        }

        if (h.hc_y < minHcY) minHcY = h.hc_y;
        if (h.hit_distance_sc > maxDist) maxDist = h.hit_distance_sc;
    });

    const avgRatio = totalRatio / count;
    console.log(`HR Scale (Feet per HC Unit): ${avgRatio.toFixed(4)}`);
    console.log(`Max HR Distance: ${maxDist}`);
    console.log(`Furthest HR Y: ${minHcY}`);

    // Calculate implied fence distance (e.g. 400ft)
    const fenceDistHc = 400 / avgRatio;
    console.log(`400ft in HC units (based on HRs): ${fenceDistHc.toFixed(2)}`);
    console.log(`Fence Y (198.27 - dist): ${(198.27 - fenceDistHc).toFixed(2)}`);

    // Analyze Foul Lines (Angle of hits)
    // Calculate angle for every hit (not just HRs) to see the spread
    const allHits = data.filter(r => r.hc_x != null && r.hc_y != null);
    let minAngle = 90;
    let maxAngle = -90;

    allHits.forEach(h => {
        const dx = h.hc_x - homeX;
        const dy = homeY - h.hc_y; // Positive Y is "up" field
        // Angle from center line (Y axis)
        // atan2(x, y) gives angle from Y axis? No, atan2(y, x) gives from X.
        // Let's use standard atan2(dy, dx) where dx is x-axis, dy is y-axis.
        // 0 deg is Right. 90 is Up. 180 is Left.
        // Center field is 90 deg.
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;

        if (angle > maxAngle) maxAngle = angle;
        if (angle < minAngle) minAngle = angle;
    });

    console.log(`Hit Angle Range: ${minAngle.toFixed(2)} to ${maxAngle.toFixed(2)} degrees`);
    console.log(`Expected Fair Zone: 45 to 135 degrees?`);
};

analyzeHomeRuns();
