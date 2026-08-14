import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';

const StrikeZoneHeatmap = ({ data, language = 'ja' }) => {
    // Process Data for Heatmap
    const { x, z, text } = useMemo(() => {
        if (!data || !Array.isArray(data) || data.length === 0) return { x: [], z: [], text: [] };

        const xCoords = [];
        const zCoords = [];
        const tooltips = [];

        data.forEach(p => {
            if (!p) return;
            const px = parseFloat(p.plate_x);
            const pz = parseFloat(p.plate_z);

            if (!isNaN(px) && !isNaN(pz)) {
                xCoords.push(px);
                zCoords.push(pz);
                tooltips.push(`${p.pitch_name || p.pitch_type || 'Pitch'} ${p.release_speed ? Math.round(Number(p.release_speed)) : ''}`);
            }
        });

        return { x: xCoords, z: zCoords, text: tooltips };
    }, [data]);

    const layout = {
        autosize: true,
        margin: { l: 32, r: 15, b: 30, t: 20 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: '#080d1e',
        font: { color: '#94a3b8', size: 9 },
        xaxis: {
            title: { text: language === 'ja' ? '横位置 (ft)' : 'Plate X (ft)', font: { size: 9, color: '#94a3b8' } },
            range: [-2.2, 2.2],
            zeroline: false,
            showgrid: true,
            gridcolor: '#1e293b',
            tickfont: { size: 8, color: '#94a3b8' }
        },
        yaxis: {
            title: { text: language === 'ja' ? '高さ (ft)' : 'Plate Z (ft)', font: { size: 9, color: '#94a3b8' } },
            range: [0.3, 4.8],
            zeroline: false,
            showgrid: true,
            gridcolor: '#1e293b',
            tickfont: { size: 8, color: '#94a3b8' }
        },
        shapes: [
            // Strike Zone Box (White bold dashed)
            {
                type: 'rect',
                x0: -0.71, y0: 1.5,
                x1: 0.71, y1: 3.5,
                line: { color: '#ffffff', width: 2, dash: 'solid' }
            },
            // Inner Zone (Visual aid)
            {
                type: 'rect',
                x0: -0.24, y0: 2.15,
                x1: 0.24, y1: 2.85,
                line: { color: 'rgba(255,255,255,0.4)', width: 1, dash: 'dot' }
            }
        ]
    };

    if (x.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                {language === 'ja' ? 'ロケーションデータがありません' : 'No location data'}
            </div>
        );
    }

    return (
        <div className="w-full max-w-[340px] aspect-square relative overflow-hidden rounded-xl mx-auto">
            <Plot
                data={[
                    {
                        x: x,
                        y: z,
                        text: text,
                        type: 'histogram2dcontour',
                        colorscale: [
                            [0, 'rgba(8,13,30,0)'],
                            [0.2, '#1e3a8a'],
                            [0.4, '#0284c7'],
                            [0.6, '#eab308'],
                            [0.8, '#ea580c'],
                            [1, '#ef4444']
                        ],
                        reversescale: false,
                        ncontours: 20,
                        showscale: false,
                        hoverinfo: 'x+y'
                    },
                    {
                        x: x,
                        y: z,
                        mode: 'markers',
                        type: 'scatter',
                        marker: { color: '#ffffff', size: 3.5, opacity: 0.65 },
                        hoverinfo: 'none'
                    }
                ]}
                layout={layout}
                useResizeHandler={true}
                style={{ width: '100%', height: '100%' }}
                config={{ displayModeBar: false, responsive: true }}
            />
        </div>
    );
};

export default StrikeZoneHeatmap;
