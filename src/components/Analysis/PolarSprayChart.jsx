import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';

const PolarSprayChart = ({ data, selectedPlayers }) => {
    const plotData = useMemo(() => {
        if (!data || data.length === 0 || selectedPlayers.length === 0) return [];

        const filtered = data.filter(d =>
            d.batter_name && selectedPlayers.includes(d.batter_name) &&
            d.launch_speed != null && d.launch_angle != null && d.events
        );

        if (filtered.length === 0) return [];

        // Max Speed calc for normalization (fixed to 130 mph as per python)
        const MAX_SPEED = 130;

        // Categories
        // Speed: slow (<84), medium (84-94), fast (>94)
        // Event: single, double, triple, home_run, out
        const eventColors = {
            "single": "green", "double": "blue", "triple": "purple",
            "home_run": "red", "out": "gray"
        };

        const markers = {
            "slow": "circle", "medium": "triangle-up", "fast": "square"
        };

        // Create traces for each (Event, SpeedCat) combo found.
        const traces = [];
        const buckets = {};

        filtered.forEach(d => {
            let evt = d.events;
            let cleanEvt = evt;
            if (['single', 'double', 'triple', 'home_run'].includes(evt)) {
                // keep
            } else {
                cleanEvt = 'out';
            }

            const speed = parseFloat(d.launch_speed);
            const angle = parseFloat(d.launch_angle);

            let spdCat = 'slow';
            if (speed >= 94) spdCat = 'fast';
            else if (speed >= 84) spdCat = 'medium';

            const key = `${cleanEvt}|${spdCat}`;
            if (!buckets[key]) buckets[key] = { r: [], theta: [], evt: cleanEvt, spd: spdCat };

            buckets[key].r.push(speed / MAX_SPEED); // Normalized R
            buckets[key].theta.push(angle);
            // Custom data for hover
            if (!buckets[key].customdata) buckets[key].customdata = [];
            buckets[key].customdata.push({ speed, angle, event: evt });
        });

        Object.values(buckets).forEach(b => {
            traces.push({
                type: 'scatterpolar',
                mode: 'markers',
                r: b.r,
                theta: b.theta,
                marker: {
                    color: eventColors[b.evt] || 'gray',
                    symbol: markers[b.spd],
                    size: 8,
                    opacity: 0.7,
                    line: { width: 1, color: 'white' }
                },
                name: `${b.evt}`,
                legendgroup: b.evt, // Group by event
                showlegend: false, // Hide individual bucket traces
                hovertemplate:
                    `<b>${b.evt}</b><br>` +
                    `Velocity: %{customdata.speed:.1f} mph<br>` +
                    `Angle: %{theta:.1f}°<br>` +
                    `<extra></extra>`, // Hide trace name in hover
                customdata: b.customdata
            });
        });

        // Add Legend Traces (Events) - Control Toggling
        const evtLabels = {
            'single': 'Single', 'double': 'Double', 'triple': 'Triple',
            'home_run': 'Home Run', 'out': 'Out'
        };
        const evtOrder = ['out', 'single', 'double', 'triple', 'home_run']; // Order as requested or logical? "OUT, Hit..."
        // User said: "OUT, Hitの後に" (Out, Hits...). 
        // I will do Out first, then Hits.

        evtOrder.forEach(evt => {
            if (!eventColors[evt]) return;
            traces.push({
                type: 'scatterpolar',
                mode: 'markers',
                r: [null], theta: [null], // Dummy
                marker: { color: eventColors[evt], symbol: 'circle', size: 10 },
                name: evtLabels[evt] || evt,
                legendgroup: evt,
                showlegend: true
            });
        });

        // Add Legend Traces (Speed Shapes) - Informational
        const speedLegend = [
            { key: 'slow', label: 'Slow (<84 mph)', symbol: markers['slow'] },
            { key: 'medium', label: 'Medium (84-94 mph)', symbol: markers['medium'] },
            { key: 'fast', label: 'Fast (>94 mph)', symbol: markers['fast'] }
        ];

        speedLegend.forEach(s => {
            traces.push({
                type: 'scatterpolar',
                mode: 'markers',
                r: [null], theta: [null],
                marker: { color: '#888', symbol: s.symbol, size: 10, line: { color: 'white', width: 1 } },
                name: s.label,
                showlegend: true,
                hoverinfo: 'none'
            });
        });

        return traces;

    }, [data, selectedPlayers]);

    return (
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm w-full h-[500px]">
            <Plot
                data={plotData}
                layout={{
                    title: { text: 'Launch Profile (Exit Vel vs Angle)', font: { color: 'white' } }, // Renamed to accurately reflect contents
                    polar: {
                        radialaxis: { visible: false, range: [0, 1] },
                        angularaxis: {
                            direction: 'counterclockwise',
                            rotation: 0, // 0 deg is right (flat ground usually), 90 is up. Plotly default 0 is East (Right).
                            // Launch Angle 0 is East. 90 is North (Up). -90 is South (Down).
                            // This matches unit circle perfectly.
                            tickfont: { color: 'white' },
                            gridcolor: '#444'
                        },
                        sector: [-90, 90],
                        bgcolor: '#222',
                        gridshape: 'circular'
                    },
                    showlegend: true,
                    legend: { font: { color: 'white' } },
                    paper_bgcolor: 'rgba(0,0,0,0)',
                    plot_bgcolor: 'rgba(0,0,0,0)',
                    font: { color: '#fff' },
                    margin: { l: 50, r: 50, t: 50, b: 50 }
                }}
                config={{ responsive: true, displayModeBar: false }}
                style={{ width: '100%', height: '100%' }}
            />
        </div>
    );
};

export default PolarSprayChart;
