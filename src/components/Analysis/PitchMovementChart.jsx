import React, { useMemo } from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell } from 'recharts';
import { useSettings } from '../../context/SettingsContext';

// Pitch type colors matching standard Baseball Savant palette
const COLOR_MAP = {
    "4-Seam Fastball": "#ef4444",   // Red
    "Slider": "#eab308",            // Yellow/Gold
    "Curveball": "#06b6d4",          // Cyan
    "Changeup": "#22c55e",           // Green
    "CH": "#22c55e",
    "Cutter": "#a855f7",            // Purple
    "Sinker": "#f97316",            // Orange
    "Splitter": "#3b82f6",          // Blue
    "Split-Finger": "#3b82f6",
    "Sweeper": "#d97706",           // Amber
    "Knuckle Curve": "#1d4ed8",     // Dark Blue
    "Slurve": "#eab308",
    "Other": "#94a3b8"              // Slate
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
    'ST': 'スイーパー', 'Sweeper': 'スイーパー',
    'SV': 'スラーブ', 'Slurve': 'スラーブ',
    'KC': 'ナックルカーブ', 'Knuckle Curve': 'ナックルカーブ',
    'KN': 'ナックル', 'Knuckleball': 'ナックル',
    'FO': 'フォーク', 'Forkball': 'フォーク',
    'CS': 'スローカーブ'
};

const JP_TO_EN_MAP = {
    'ストレート': '4-Seam Fastball',
    'カッター': 'Cutter',
    'チェンジアップ': 'Changeup',
    'カーブ': 'Curveball',
    'スライダー': 'Slider',
    'シンカー': 'Sinker',
    'スプリット': 'Split-Finger',
    'スイーパー': 'Sweeper',
    'スラーブ': 'Slurve',
    'ナックルカーブ': 'Knuckle Curve',
    'その他': 'Other'
};

const PitchMovementChart = ({ data, selectedPlayers, standFilter = 'all' }) => {
    const { language, units } = useSettings();

    const chartData = useMemo(() => {
        if (!data || data.length === 0 || selectedPlayers.length === 0) return [];

        const filtered = data.filter(d => {
            if (!d.player_name || !selectedPlayers.includes(d.player_name)) return false;
            if (!d.pitch_type && !d.pitch_name) return false;
            if (standFilter !== 'all' && d.stand && d.stand !== standFilter) return false;
            return true;
        });

        const processed = [];

        filtered.forEach(d => {
            if (d.pfx_x === null || d.pfx_x === undefined || d.pfx_z === null || d.pfx_z === undefined) return;

            const pfx_x = Number(d.pfx_x);
            const pfx_z = Number(d.pfx_z);
            if (isNaN(pfx_x) || isNaN(pfx_z)) return;

            // In inches (-pfx_x * 12, pfx_z * 12)
            let hb = -pfx_x * 12;
            let ivb = pfx_z * 12;

            if (units === 'metric') {
                hb = hb * 2.54;
                ivb = ivb * 2.54;
            }

            const rawType = d.pitch_type || d.pitch_name || d.type || 'Other';
            const jpType = PITCH_MAP[rawType] || PITCH_MAP[d.pitch_name] || rawType;
            const enType = JP_TO_EN_MAP[jpType] || rawType;
            const color = COLOR_MAP[enType] || COLOR_MAP[rawType] || COLOR_MAP['Other'];

            processed.push({
                x: Number(hb.toFixed(1)),
                y: Number(ivb.toFixed(1)),
                pitchType: language === 'en' ? enType : jpType,
                color: color
            });
        });

        return processed;
    }, [data, selectedPlayers, units, language, standFilter]);

    const domain = units === 'metric' ? [-60, 60] : [-25, 25];
    const ticks = units === 'metric'
        ? [-60, -40, -20, 0, 20, 40, 60]
        : [-25, -15, -5, 0, 5, 15, 25];

    // Legend data
    const legendData = useMemo(() => {
        const unique = {};
        chartData.forEach(p => {
            if (!unique[p.pitchType]) {
                unique[p.pitchType] = p.color;
            }
        });
        return Object.entries(unique).map(([name, color]) => ({ name, color }));
    }, [chartData]);

    if (chartData.length === 0) {
        return (
            <div className="bg-card rounded-xl border border-border p-4 flex flex-col items-center justify-center h-[340px] text-muted-foreground text-sm">
                <p>{language === 'ja' ? '変化量データがありません' : 'No Movement Data'}</p>
            </div>
        );
    }

    return (
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm flex flex-col h-[380px]">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h3 className="text-sm font-bold text-foreground">
                        {language === 'ja' ? '球種別 変化量' : 'Pitch Movement'}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                        {units === 'metric' ? '横: HB (cm) / 縦: iVB (cm)' : 'X: HB (in) / Y: iVB (in)'}
                    </p>
                </div>
            </div>

            {/* Compact Legend */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 mb-1 text-xs">
                {legendData.map(s => (
                    <div key={s.name} className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }}></span>
                        <span className="text-foreground text-[11px] font-medium">{s.name}</span>
                    </div>
                ))}
            </div>

            {/* Fixed square size chart container */}
            <div className="flex-1 w-full min-h-0 relative">
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 15, bottom: 15, left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} stroke="#64748b" />
                        <XAxis
                            type="number"
                            dataKey="x"
                            name="HB"
                            domain={domain}
                            ticks={ticks}
                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                            stroke="#475569"
                        />
                        <YAxis
                            type="number"
                            dataKey="y"
                            name="iVB"
                            domain={domain}
                            ticks={ticks}
                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                            stroke="#475569"
                        />
                        <ReferenceLine x={0} stroke="#94a3b8" strokeDasharray="2 2" strokeOpacity={0.6} />
                        <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="2 2" strokeOpacity={0.6} />
                        <Tooltip
                            cursor={{ strokeDasharray: '3 3' }}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const d = payload[0].payload;
                                    return (
                                        <div className="bg-popover/95 backdrop-blur-sm border border-border px-3 py-2 rounded-lg shadow-xl text-xs z-50">
                                            <div className="flex items-center gap-1.5 mb-1 font-bold" style={{ color: d.color }}>
                                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></span>
                                                {d.pitchType}
                                            </div>
                                            <div className="text-muted-foreground space-y-0.5 text-[11px]">
                                                <div>HB (横変化): <span className="font-semibold text-foreground">{d.x > 0 ? `+${d.x}` : d.x} {units === 'metric' ? 'cm' : 'in'}</span></div>
                                                <div>iVB (縦変化): <span className="font-semibold text-foreground">{d.y > 0 ? `+${d.y}` : d.y} {units === 'metric' ? 'cm' : 'in'}</span></div>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Scatter
                            name="Pitches"
                            data={chartData}
                            fill="#8884d8"
                            isAnimationActive={false}
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.75} />
                            ))}
                        </Scatter>
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default PitchMovementChart;
