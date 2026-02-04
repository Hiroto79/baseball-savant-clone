import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';

const PolarSprayChart = ({ data, selectedPlayers }) => {
    const layout = useMemo(() => {
        return {
            title: 'Spray Chart by Exit Velocity & Result',
            polar: {
                radialaxis: { visible: false, range: [0, 1] }, // Normalized radius
                angularaxis: {
                    rotation: 90, // 0 at East (Right Field line usually -45 deg)
                    direction: 'counterclockwise',
                    tickmode: 'array',
                    tickvals: [-90, -45, 0, 45, 90],
                    ticktext: ['-90°', '-45°', '0°', '45°', '90°'],
                    range: [-90, 90] // standard spray chart view
                },
                sector: [-90, 90]
            },
            showlegend: true,
            legend: { x: 1, y: 1 },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { color: '#fff' },
            autosize: true,
            margin: { l: 40, r: 40, t: 80, b: 40 }
        };
    }, []);

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

        // Group traces by Event + Speed (so legend shows them?)
        // Python script has two legends: Events and ExVel.
        // Plotly legend is one list. We can cheat by adding dummy traces or complex grouping.
        // Or simpler: Color by Event, Symbol by Speed.
        // Plotly scatterpolar supports marker symbol and color.

        const traces = [];
        const uniqueEvents = [...new Set(filtered.map(d => d.events))];

        // Group actual data
        uniqueEvents.forEach(evt => {
            // Simplified Event mapping
            let cleanEvt = evt;
            if (['field_out', 'fly_out', 'grounded_into_double_play', 'double_play', 'force_out', 'strikeout', 'strikeout_double_play', 'fielders_choice', 'sac_fly', 'sac_bunt'].includes(evt)) {
                cleanEvt = 'out';
            }
            if (!eventColors[cleanEvt]) return; // Skip non-result events like 'walk'?

            // Should we plot walks? Python script says `required_columns = ["launch_speed"...]`. Walks have no launch speed usually.
            // So implicit filter.

            const evtData = filtered.filter(d => d.events === evt);

            evtData.forEach(d => {
                const speed = parseFloat(d.launch_speed);
                const angle = parseFloat(d.launch_angle); // bearing
                // Polar theta: standard is 0 at East.
                // Baseball spray: 0 is center field? OR is launch_angle the vertical angle?
                // WAIT. Python script: theta = np.deg2rad(df["launch_angle"])
                // `launch_angle` in Savant is Vertical Angle.
                // `hc_x`, `hc_y` gives spray direction.
                // OR `spray_angle` (calculated)?
                // Python script uses `launch_angle` as theta... Wait.
                // `ax0 = fig.add_subplot(111, polar=True)`
                // `theta = np.deg2rad(df_cleaned["launch_angle"])`
                // `r = df_cleaned["launch_speed"]`
                // This plots [Vertical Angle] vs [Exit Velocity].
                // This is NOT a field spray chart (where does the ball land).
                // This is a "Launch Profile" chart (Barrel chart).
                // 0 degrees is line drive up the middle vertically? No, 0 deg is flat ground.
                // 90 deg is popup.
                // Python code sets `ax0.set_thetamin(-90)` `ax0.set_thetamax(90)`.
                // Launch Angle range is typically -90 (down) to 90 (up).
                // So this IS the standard EV / LA chart, just plotted in Polar coords?
                // Yes, "Spray Chart by Exit Velocity & Result" title might be misleading if it means Field Direction.
                // But the python script uses `launch_angle`.
                // So I will implement exactly that: Theta = Launch Angle, R = Exit Velocity.

                let spdCat = 'slow';
                if (speed >= 94) spdCat = 'fast';
                else if (speed >= 84) spdCat = 'medium';

                // Add point to specific trace bucket?
                // To avoid thousands of traces, let's group by Event+Speed.
            });
        });

        // Re-strategy: Create traces for each (Event, SpeedCat) combo found.
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
                name: `${b.evt} (${b.spd})`,
                hovertemplate:
                    `<b>${b.evt}</b><br>` +
                    `Velocity: %{customdata.speed:.1f} mph<br>` +
                    `Angle: %{theta:.1f}°<br>` +
                    `<extra></extra>`, // Hide trace name in hover
                customdata: b.customdata
            });
        });

        // Add "Rings" for reference (20, 40, ... 130 mph) happens strictly in layout? 
        // Or we can add dummy traces for the grid if Plotly doesn't support custom radial text easily in this layout?
        // Layout uses simple radialaxis range. I'll stick to that relative scale.

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
