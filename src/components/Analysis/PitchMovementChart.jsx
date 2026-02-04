import React, { useMemo } from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell } from 'recharts';
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
    'Forkball': 'Splitter',
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
            if (d.pfx_x === null || d.pfx_x === undefined || d.pfx_z === null || d.pfx_z === undefined) return;

            const pfx_x = Number(d.pfx_x);
            const pfx_z = Number(d.pfx_z);
            if (isNaN(pfx_x) || isNaN(pfx_z)) return;

            // In inches (Savant standard calc from feet: -x*12, z*12)
            let hb = -pfx_x * 12;
            let ivb = pfx_z * 12;

            if (units === 'metric') {
                hb = hb * 2.54;
                ivb = ivb * 2.54;
            }

            const rawType = d.pitch_type || d.pitch_name || d.type || 'Unknown';
            const jpType = PITCH_MAP[rawType] || PITCH_MAP[d.pitch_name] || rawType;
            const enType = JP_TO_EN_MAP[jpType] || jpType;
            const colorKey = TYPE_TO_COLOR_KEY[enType] || 'Other';
            const color = COLOR_MAP[colorKey] || 'gray';

            processed.push({
                x: Number(hb.toFixed(1)),
                y: Number(ivb.toFixed(1)),
                pitchType: language === 'en' ? enType : jpType,
                color: color
            });
        });

        return processed;
    }, [data, selectedPlayers, units, language]);

    const domain = units === 'metric' ? [-60, 60] : [-30, 30];
    const ticks = units === 'metric'
        ? [-60, -45, -30, -15, 0, 15, 30, 45, 60]
        : [-30, -20, -10, 0, 10, 20, 30];

    // LEGEND DATA (Unique Pitch Types)
    const legendData = useMemo(() => {
        const unique = {};
        chartData.forEach(p => {
            if (!unique[p.pitchType]) {
                unique[p.pitchType] = p.color;
            }
        });
        return Object.entries(unique).map(([name, color]) => ({ name, color }));
    }, [chartData]);


    if (chartData.length === 0) return null;

    return (
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm w-full h-auto flex flex-col">
            <h3 className="text-lg font-bold mb-2">
                {language === 'ja' ? '変化量 (Pitch Movement)' : 'Pitch Movement'}
                <span className="text-xs font-normal text-muted-foreground ml-2">
                    {language === 'ja'
                        ? `(縦: iVB, 横: HB) [${units === 'metric' ? 'cm' : 'inch'}]`
                        : `(Y: iVB, X: HB) [${units === 'metric' ? 'cm' : 'inch'}]`
                    }
                </span>
            </h3>

            {/* Custom Legend */}
            <div className="flex flex-wrap gap-2 mb-2 text-xs">
                {legendData.map(s => (
                    <div key={s.name} className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }}></span>
                        <span className="text-foreground font-medium">{s.name}</span>
                    </div>
                ))}
            </div>

            <div className="w-full aspect-square overflow-hidden relative">
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis
                            type="number"
                            dataKey="x"
                            name="HB"
                            domain={domain}
                            ticks={ticks}
                            label={{ value: 'Horizontal Break', position: 'bottom', offset: 0, fontSize: 10, fill: '#888' }}
                            tick={{ fontSize: 10 }}
                        />
                        <YAxis
                            type="number"
                            dataKey="y"
                            name="iVB"
                            domain={domain}
                            ticks={ticks}
                            label={{ value: 'Induced Vertical Break', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#888' }}
                            tick={{ fontSize: 10 }}
                        />
                        <ReferenceLine x={0} stroke="#666" strokeOpacity={0.5} />
                        <ReferenceLine y={0} stroke="#666" strokeOpacity={0.5} />
                        <Tooltip
                            cursor={{ strokeDasharray: '3 3' }}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const d = payload[0].payload;
                                    return (
                                        <div className="bg-popover border border-border p-2 rounded shadow text-xs z-50">
                                            <p className="font-bold mb-1" style={{ color: d.color }}>{d.pitchType}</p>
                                            <div className="text-muted-foreground">
                                                <p>HB: {d.x}</p>
                                                <p>iVB: {d.y}</p>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        {/* Single Scatter with Cells for robust hit detection */}
                        <Scatter
                            name="Pitches"
                            data={chartData}
                            fill="#8884d8"
                            isAnimationActive={false}
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Scatter>
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default PitchMovementChart;
