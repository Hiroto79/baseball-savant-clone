
// Official MLB Savant Pitch Colors
export const PITCH_COLORS = {
    // Fastballs
    '4-Seam Fastball': '#D22D49', // Red
    'Fastball': '#D22D49',
    'Sinker': '#FE9D00',          // Orange
    'Cutter': '#933F2C',          // Maroon/Dark Red

    // Breaking
    'Slider': '#EEE716',          // Yellow
    'Sweeper': '#E6C220',         // Gold/Dark Yellow
    'Curveball': '#00D1ED',       // Light Blue/Cyan
    'Knuckle Curve': '#335585',   // Dark Blue
    'Slow Curve': '#335585',
    'Slurve': '#00D1ED',          // Treat as curve/slider mix (often Blueish)

    // Offspeed
    'Changeup': '#1DB055',        // Green
    'Split-Finger': '#34D2D8',    // Teal
    'Splitter': '#34D2D8',
    'Forkball': '#34D2D8',        // Similar to splitter
    'Screwball': '#62C555',       // Yellow-Green
    'Ephus': '#636363',
    'Knuckleball': '#888888',     // Gray

    // Generic/Unknown
    'Unknown': '#9CA3AF'
};

export const getPitchTypeColor = (pitchType) => {
    // Exact match first
    if (PITCH_COLORS[pitchType]) return PITCH_COLORS[pitchType];

    // Case-insensitive match
    const lowerType = pitchType.toLowerCase();
    const key = Object.keys(PITCH_COLORS).find(k => k.toLowerCase() === lowerType);
    if (key) return PITCH_COLORS[key];

    // Partial match heuristics if not exact
    if (lowerType.includes('fastball')) return PITCH_COLORS['4-Seam Fastball'];
    if (lowerType.includes('sinker')) return PITCH_COLORS['Sinker'];
    if (lowerType.includes('slider')) return PITCH_COLORS['Slider'];
    if (lowerType.includes('curve')) return PITCH_COLORS['Curveball'];
    if (lowerType.includes('change')) return PITCH_COLORS['Changeup'];
    if (lowerType.includes('split')) return PITCH_COLORS['Split-Finger'];

    return PITCH_COLORS['Unknown'];
};
