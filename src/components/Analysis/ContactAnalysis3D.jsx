import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';

const ContactAnalysis3D = ({ data, selectedPlayers }) => {
    // Process Data
    const plotData = useMemo(() => {
        if (!data || data.length === 0 || selectedPlayers.length === 0) return [];

        // Filter valid data
        const validData = data.filter(d =>
            d.plate_x != null &&
            d.plate_z != null &&
            d.stand &&
            d.batter_name &&
            selectedPlayers.includes(d.batter_name)
        );

        if (validData.length === 0) return [];

        // Group by Batter -> Course
        // Since we might have L and R batters, we need to handle stand.
        // The python script filtered by `target_stand`. 
        // Here we should probably support both, or split them?
        // Let's iterate and classify.

        const summary = {}; // { batterName: { Inside: { count, sumX, sumZ }, Middle:..., Outside:... } }

        validData.forEach(d => {
            const stand = d.stand;
            const x = parseFloat(d.plate_x);
            const z = parseFloat(d.plate_z);
            const batter = d.batter_name;

            // Classify Course
            let course = 'Middle';
            const limit = 0.28; // ~3.36 inches
            if (stand === 'R') {
                if (x < -limit) course = 'Inside';
                else if (x > limit) course = 'Outside';
            } else { // 'L'
                if (x > limit) course = 'Inside';
                else if (x < -limit) course = 'Outside';
            }

            if (!summary[batter]) summary[batter] = {};
            if (!summary[batter][course]) summary[batter][course] = { count: 0, sumX: 0, sumZ: 0 };

            summary[batter][course].count++;
            summary[batter][course].sumX += x;
            summary[batter][course].sumZ += z;
        });

        // Depth Map
        const depthMap = { 'Inside': 0.7, 'Middle': 0.4, 'Outside': 0.1 };

        // Convert summary to traces
        const traces = [];

        Object.keys(summary).forEach(batter => {
            const courses = summary[batter];
            const xVals = [];
            const yVals = [];
            const zVals = [];
            const textVals = [];

            ['Inside', 'Middle', 'Outside'].forEach(course => {
                const stat = courses[course];
                if (stat) {
                    const avgX = stat.sumX / stat.count;
                    const avgZ = stat.sumZ / stat.count;
                    const yPos = depthMap[course];

                    xVals.push(avgX);
                    yVals.push(yPos);
                    zVals.push(avgZ);
                    textVals.push(`${course}<br>Height: ${avgZ.toFixed(2)}ft`);
                }
            });

            if (xVals.length > 0) {
                traces.push({
                    type: 'scatter3d',
                    mode: 'markers+lines',
                    x: xVals,
                    y: yVals,
                    z: zVals,
                    name: batter,
                    marker: { size: 8, opacity: 0.9 },
                    line: { width: 5 },
                    text: textVals,
                    hovertemplate: "%{text}<extra></extra>"
                });
            }
        });

        return traces;

    }, [data, selectedPlayers]);

    // Static Traces (Home Plate, Box, Zone)
    const staticTraces = useMemo(() => {
        const traces = [];

        // 1. Home Plate
        const w = 0.708;
        const hp_x = [-w, w, w, 0, -w];
        const hp_y = [0, 0, -0.708, -1.417, -0.708];
        const hp_z = [0.01, 0.01, 0.01, 0.01, 0.01];

        traces.push({
            type: 'mesh3d',
            x: hp_x, y: hp_y, z: hp_z,
            i: [0, 0, 0], j: [1, 2, 3], k: [2, 3, 4],
            color: 'lightgray', opacity: 1.0, name: 'Home Plate', hoverinfo: 'skip'
        });

        // 2. Batter's Box
        const box_inner = 0.708 + 0.5;
        const box_outer = box_inner + 4.0;
        const box_y_top = 1.5;
        const box_y_bottom = -4.5;

        const bx = [box_inner, box_outer, box_outer, box_inner, box_inner];
        const by = [box_y_top, box_y_top, box_y_bottom, box_y_bottom, box_y_top];
        const bz = [0, 0, 0, 0, 0];

        // Right Box
        traces.push({
            type: 'scatter3d', mode: 'lines',
            x: bx, y: by, z: bz,
            line: { color: 'white', width: 3 }, showlegend: false, hoverinfo: 'skip'
        });
        // Left Box
        traces.push({
            type: 'scatter3d', mode: 'lines',
            x: bx.map(x => -x), y: by, z: bz,
            line: { color: 'white', width: 3 }, showlegend: false, hoverinfo: 'skip'
        });

        // 3. Strike Zone
        const sz_top = 3.5;
        const sz_bot = 1.5;
        const sz_w = 0.71;
        const sz_x = [-sz_w, sz_w, sz_w, -sz_w, -sz_w];
        const sz_y = [0, 0, 0, 0, 0];
        const sz_z = [sz_bot, sz_bot, sz_top, sz_top, sz_bot];

        traces.push({
            type: 'scatter3d', mode: 'lines',
            x: sz_x, y: sz_y, z: sz_z,
            line: { color: 'cyan', width: 4, dash: 'dot' }, opacity: 0.5, name: 'Strike Zone', hoverinfo: 'skip'
        });

        return traces;
    }, []);

    return (
        <div className="bg-card rounded-xl border border-white/10 p-4 shadow-sm w-full h-[600px]">
            <h3 className="text-lg font-bold mb-4 text-white">Contact Point Analysis (3D)</h3>
            <Plot
                data={[...staticTraces, ...plotData]}
                layout={{
                    autosize: true,
                    scene: {
                        xaxis: { title: 'Inside <-> Outside', range: [-2.5, 2.5], color: 'white' },
                        yaxis: { title: 'Catcher <-> Pitcher', range: [-2, 2], color: 'white' },
                        zaxis: { title: 'Height', range: [0, 5], color: 'white' },
                        aspectmode: 'manual',
                        aspectratio: { x: 1, y: 1, z: 0.7 },
                        camera: { eye: { x: 1.5, y: -1.5, z: 1.2 } },
                        bgcolor: '#101010',
                        gridcolor: '#333'
                    },
                    margin: { l: 0, r: 0, b: 0, t: 30 },
                    paper_bgcolor: 'rgba(0,0,0,0)',
                    plot_bgcolor: 'rgba(0,0,0,0)',
                    font: { color: '#fff' },
                    showlegend: true,
                    legend: { font: { color: 'white' }, x: 0, y: 1 }
                }}
                config={{ responsive: true, displayModeBar: false }}
                style={{ width: '100%', height: '100%' }}
            />
        </div>
    );
};

export default ContactAnalysis3D;
