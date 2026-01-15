import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';

const StrikeZoneHeatmap = ({ data, language = 'en' }) => {

    // Process Data for Heatmap
    const { x, z, text } = useMemo(() => {
        if (!data || data.length === 0) return { x: [], z: [], text: [] };

        const xCoords = [];
        const zCoords = [];
        const tooltips = [];

        data.forEach(p => {
            // Statcast plate_x (ft), plate_z (ft)
            const px = parseFloat(p.plate_x);
            const pz = parseFloat(p.plate_z);

            if (!isNaN(px) && !isNaN(pz)) {
                xCoords.push(px); // Catcher's view: - is Left(Batting right's outside), + is Right
                zCoords.push(pz);
                tooltips.push(`${p.pitch_type || 'Pitch'} ${p.release_speed ? Math.round(Number(p.release_speed)) : ''}`);
            }
        });

        return { x: xCoords, z: zCoords, text: tooltips };
    }, [data]);

    const layout = {
        title: language === 'ja' ? 'ストライクゾーン・ヒートマップ' : 'Strike Zone Heatmap',
        autosize: true,
        height: 400,
        margin: { l: 40, r: 20, b: 30, t: 40 },
        paper_bgcolor: '#1f293700', // transparent
        plot_bgcolor: '#1f293700',
        font: { color: '#fff' },
        xaxis: {
            title: language === 'ja' ? 'コース (ft)' : 'Plate X (ft)',
            range: [-2.5, 2.5],
            zeroline: false,
            showgrid: true,
            gridcolor: '#444'
        },
        yaxis: {
            title: language === 'ja' ? '高さ (ft)' : 'Plate Z (ft)',
            range: [0, 5],
            zeroline: false,
            showgrid: true,
            gridcolor: '#444'
        },
        shapes: [
            // Strike Zone Box (Standard)
            {
                type: 'rect',
                x0: -0.71, y0: 1.5,
                x1: 0.71, y1: 3.5,
                line: { color: 'white', width: 2, dash: 'dot' }
            },
            // Inner Zone (Visual aid)
            {
                type: 'rect',
                x0: -0.23, y0: 2.1,
                x1: 0.23, y1: 2.9,
                line: { color: 'white', width: 1, dash: 'dot', opacity: 0.3 }
            }
        ]
    };

    return (
        <div className="rounded-xl overflow-hidden border border-border bg-card shadow-sm h-[400px]">
            <Plot
                data={[
                    {
                        x: x,
                        y: z,
                        text: text,
                        type: 'histogram2dcontour',
                        colorscale: 'Hot',
                        reversescale: true, // Red is high freq
                        ncontours: 20,
                        showscale: false, // Hide color bar to save space
                        hoverinfo: 'x+y+z'
                    },
                    {
                        x: x,
                        y: z,
                        mode: 'markers',
                        type: 'scatter',
                        marker: { color: 'white', size: 3, opacity: 0.5 },
                        hoverinfo: 'none'
                    }
                ]}
                layout={layout}
                useResizeHandler={true}
                style={{ width: '100%', height: '100%' }}
                config={{ displayModeBar: false }}
            />
        </div>
    );
};

export default StrikeZoneHeatmap;
