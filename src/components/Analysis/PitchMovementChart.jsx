import React, { useMemo } from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';
import { useSettings } from '../../context/SettingsContext';

// User defined colors
const COLOR_MAP = {
    "4-Seam Fastball": "red",
    "Slider": "goldenrod",
    "Curveball": "cyan",
    "CH": "green",        // User key for Changeup
    "Cutter": "brown",
    "Sinker": "orange",
    "Splitter": "blue",   // User key for Split-Finger
    "Sweeper": "peru",
    "EP": "black",        // User key for Eephus
    "FA": "yellow",       // User key for Other
    "Knuckle Curve": "darkblue"
};

// Map internal English names to User Color Keys
const TYPE_TO_COLOR_KEY = {
    '4-Seam Fastball': '4-Seam Fastball',
    'Slider': 'Slider',
    'Curveball': 'Curveball',
    'Changeup': 'CH',
    'Cutter': 'Cutter',
    'Sinker': 'Sinker',
    'Split-Finger': 'Splitter',
    'Sweeper': 'Sweeper',
    'Eephus': 'EP',
    'Other': 'FA',
    'Knuckle Curve': 'Knuckle Curve',
    // Fallbacks
    'Knuckleball': 'FA',
    'Pitch Out': 'FA',
    'Screwball': 'FA',
    'Forkball': 'Splitter', // Maybe?
    'Slow Curve': 'Curveball',
    'Slurve': 'Slider'
};

const JP_TO_EN_MAP = {
    'ストレート': '4-Seam Fastball',
    'カッター': 'Cutter',
    'チェンジアップ': 'Changeup',
    'カーブ': 'Curveball',
    'スライダー': 'Slider',
    'シンカー': 'Sinker',
    'スプリット': 'Split-Finger',
    'イーファスピッチ': 'Eephus',
    'その他': 'Other',
    'スイーパー': 'Sweeper',
    'スラーブ': 'Slurve',
    'ナックルカーブ': 'Knuckle Curve',
    'ウェスト': 'Pitch Out',
    'ナックル': 'Knuckleball',
    'スクリュー': 'Screwball',
    'フォーク': 'Forkball',
    'スローカーブ': 'Slow Curve'
};

// Japanese Raw Map (needed if raw type is Japanese logic dependent)
const PITCH_MAP = {
    'FF': 'ストレート', '4-Seam Fastball': 'ストレート',
    'FC': 'カッター', 'Cutter': 'カッター',
    'CH': 'チェンジアップ', 'Changeup': 'チェンジアップ',
    'CU': 'カーブ', 'Curveball': 'カーブ',
    'SL': 'スライダー', 'Slider': 'スライダー',
    'SI': 'シンカー', 'Sinker': 'シンカー',
    'FS': 'スプリット', 'Split-Finger': 'スプリット',
    'EP': 'イーファスピッチ', 'Eephus': 'イーファスピッチ',
    'FA': 'その他',
    'ST': 'スイーパー', 'Sweeper': 'スイーパー',
    'SV': 'スラーブ', 'Slurve': 'スラーブ',
    'KC': 'ナックルカーブ', 'Knuckle Curve': 'ナックルカーブ',
    'PO': 'ウェスト', 'Pitch Out': 'ウェスト',
    'KN': 'ナックル', 'Knuckleball': 'ナックル',
    'SC': 'スクリュー', 'Screwball': 'スクリュー',
    'FO': 'フォーク', 'Forkball': 'フォーク',
    'CS': 'スローカーブ'
};


const PitchMovementChart = ({ data, selectedPlayers }) => {
    const { language, units } = useSettings();

    const chartData = useMemo(() => {
        if (!data || data.length === 0 || selectedPlayers.length === 0) return [];

        const filtered = data.filter(d =>
            d.player_name && selectedPlayers.includes(d.player_name) && (d.pitch_type || d.pitch_name)
        );

        const processed = [];

        filtered.forEach(d => {
            // 1. Calculate iVB / HB in Inches (Savant standard calc)
            // pfx_x/z are usually in feet in raw Savant CSVs (sometimes inches depending on source, but code assumed feet * 12)
            // If pfx is null, skip
            if (d.pfx_x === null || d.pfx_x === undefined || d.pfx_z === null || d.pfx_z === undefined) return;

            const pfx_x = Number(d.pfx_x);
            const pfx_z = Number(d.pfx_z);
            if (isNaN(pfx_x) || isNaN(pfx_z)) return;

            // In inches
            let hb = -pfx_x * 12;
            let ivb = pfx_z * 12;

            // 2. Convert to Metric if needed
            if (units === 'metric') {
                hb = hb * 2.54;
                ivb = ivb * 2.54;
            }

            // 3. Determine Color Key
            const rawType = d.pitch_type || d.pitch_name || d.type || 'Unknown';
            const jpType = PITCH_MAP[rawType] || PITCH_MAP[d.pitch_name] || rawType; // Normalize to Japanese first
            const enType = JP_TO_EN_MAP[jpType] || jpType; // Convert to English Standard
            const colorKey = TYPE_TO_COLOR_KEY[enType] || 'Other';
            const color = COLOR_MAP[colorKey] || 'gray';

            processed.push({
                x: Number(hb.toFixed(1)),
                y: Number(ivb.toFixed(1)),
                pitchType: language === 'en' ? enType : jpType, // Display name
                color: color
            });
        });

        return processed;
    }, [data, selectedPlayers, units, language]);

    // Domain settings
    const domain = units === 'metric' ? [-60, 60] : [-30, 30];
    const ticks = units === 'metric'
        ? [-60, -45, -30, -15, 0, 15, 30, 45, 60]
        : [-30, -20, -10, 0, 10, 20, 30];

    // Group by color for Recharts Series
    // Recharts Scatter needs separate Scatter components for different colors if we want legend?
    // Or we can pass cell color.
    // User wants "Plot available data".
    // If we want a Legend, we should group by Pitch Type.

    // Let's group by Pitch Type (Display Name) so we can assign specific color and show legend.
    const series = useMemo(() => {
        const groups = {};
        chartData.forEach(p => {
            if (!groups[p.pitchType]) {
                groups[p.pitchType] = { name: p.pitchType, color: p.color, data: [] };
            }
            groups[p.pitchType].data.push(p);
        });
        return Object.values(groups);
    }, [chartData]);


    if (chartData.length === 0) return null;

    return (
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm w-full overflow-hidden h-96 flex flex-col">
            <h3 className="text-lg font-bold mb-4">
                {language === 'ja' ? '変化量 (Pitch Movement)' : 'Pitch Movement'}
                <span className="text-sm font-normal text-muted-foreground ml-2">
                    {language === 'ja'
                        ? `(縦: iVB, 横: HB) [${units === 'metric' ? 'cm' : 'inch'}]`
                        : `(Y: iVB, X: HB) [${units === 'metric' ? 'cm' : 'inch'}]`
                    }
                </span>
            </h3>
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis
                            type="number"
                            dataKey="x"
                            name="HB"
                            domain={domain}
                            ticks={ticks}
                            label={{ value: 'Horizontal Break', position: 'bottom', offset: 0 }}
                        />
                        <YAxis
                            type="number"
                            dataKey="y"
                            name="iVB"
                            domain={domain}
                            ticks={ticks}
                            label={{ value: 'Induced Vertical Break', angle: -90, position: 'insideLeft' }}
                        />
                        <ReferenceLine x={0} stroke="#666" strokeOpacity={0.5} />
                        <ReferenceLine y={0} stroke="#666" strokeOpacity={0.5} />
                        <Tooltip
                            cursor={{ strokeDasharray: '3 3' }}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const d = payload[0].payload;
                                    return (
                                        <div className="bg-popover border border-border p-2 rounded shadow text-xs">
                                            <p className="font-bold">{d.pitchType}</p>
                                            <p>HB: {d.x}</p>
                                            <p>iVB: {d.y}</p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                        {series.map(s => (
                            <Scatter
                                key={s.name}
                                name={s.name}
                                data={s.data}
                                fill={s.color}
                                shape="circle"
                            />
                        ))}
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default PitchMovementChart;
