import React from 'react';
import StrikeZone from './StrikeZone';
import SprayChart from './SprayChart';

const Dashboard = () => {
    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Summary Cards */}
            <div className="p-6 rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-sm font-medium text-muted-foreground">Total Pitches</h3>
                <div className="mt-2 text-3xl font-bold">2,451</div>
                <p className="text-xs text-emerald-500 mt-1">+12% from last game</p>
            </div>
            <div className="p-6 rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-sm font-medium text-muted-foreground">Avg Velocity</h3>
                <div className="mt-2 text-3xl font-bold">94.2 <span className="text-lg font-normal text-muted-foreground">mph</span></div>
            </div>
            <div className="p-6 rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-sm font-medium text-muted-foreground">Max Spin Rate</h3>
                <div className="mt-2 text-3xl font-bold">2,850 <span className="text-lg font-normal text-muted-foreground">rpm</span></div>
            </div>
            <div className="p-6 rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-sm font-medium text-muted-foreground">Strike Rate</h3>
                <div className="mt-2 text-3xl font-bold">64.5%</div>
            </div>

            {/* Main Charts Area */}
            <div className="col-span-full lg:col-span-2 min-h-[400px] rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col">
                <h3 className="text-lg font-semibold mb-4">Strike Zone Analysis</h3>
                <div className="flex-1 w-full">
                    <StrikeZone />
                </div>
            </div>
            <div className="col-span-full lg:col-span-2 min-h-[400px] rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col">
                <h3 className="text-lg font-semibold mb-4">Spray Chart (Hit Locations)</h3>
                <div className="flex-1 w-full">
                    <SprayChart />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
