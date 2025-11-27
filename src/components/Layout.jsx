import React, { useState } from 'react';
import { LayoutDashboard, BarChart3, Settings, Upload, Activity, Menu, X, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';

const Layout = ({ children }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-background text-foreground flex font-sans">
            {/* Sidebar */}
            <aside className="w-64 border-r border-border bg-card hidden md:flex flex-col sticky top-0 h-screen">
                <div className="p-6 border-b border-border">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
                        Savant Clone
                    </h1>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    <Link to="/" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
                        <LayoutDashboard size={20} />
                        <span>Dashboard</span>
                    </Link>
                    <Link to="/analysis" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
                        <BarChart3 size={20} />
                        <span>Analysis</span>
                    </Link>
                    <Link to="/leaderboard" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
                        <Trophy size={20} />
                        <span>Leaderboard</span>
                    </Link>
                    <Link to="/rapsodo" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
                        <Activity size={20} />
                        <span>Rapsodo Analysis</span>
                    </Link>
                    <Link to="/blast" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
                        <Activity size={20} />
                        <span>Blast Analysis</span>
                    </Link>
                    <Link to="/upload" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
                        <Upload size={20} />
                        <span>Upload Data</span>
                    </Link>
                    <Link to="/settings" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
                        <Settings size={20} />
                        <span>Settings</span>
                    </Link>
                </nav>
            </aside>

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />

                    {/* Sidebar Content */}
                    <aside className="absolute left-0 top-0 bottom-0 w-64 bg-card border-r border-border flex flex-col animate-in slide-in-from-left duration-300">
                        <div className="p-6 border-b border-border flex items-center justify-between">
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
                                Savant Clone
                            </h1>
                            <button
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="p-1 hover:bg-accent rounded-md"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <nav className="flex-1 p-4 space-y-2">
                            <Link
                                to="/"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                            >
                                <LayoutDashboard size={20} />
                                <span>Dashboard</span>
                            </Link>
                            <Link
                                to="/analysis"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                            >
                                <BarChart3 size={20} />
                                <span>Analysis</span>
                            </Link>
                            <Link
                                to="/leaderboard"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                            >
                                <Trophy size={20} />
                                <span>Leaderboard</span>
                            </Link>
                            <Link
                                to="/rapsodo"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                            >
                                <Activity size={20} />
                                <span>Rapsodo Analysis</span>
                            </Link>
                            <Link
                                to="/blast"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                            >
                                <Activity size={20} />
                                <span>Blast Analysis</span>
                            </Link>
                            <Link to="/upload" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
                                <Upload size={20} />
                                <span>Upload Data</span>
                            </Link>
                            <Link to="/settings" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
                                <Settings size={20} />
                                Settings
                            </Link>
                        </nav>
                    </aside>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0">

                <header className="h-16 border-b border-border bg-card/50 backdrop-blur flex items-center px-4 md:px-6 justify-between sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <button
                            className="md:hidden p-2 -ml-2 hover:bg-accent rounded-md"
                            onClick={() => setIsMobileMenuOpen(true)}
                        >
                            <Menu size={20} />
                        </button>
                        <h2 className="text-lg font-semibold">Dashboard</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                            U
                        </div>
                    </div>
                </header>
                <div className="flex-1 p-6 overflow-auto">
                    {children}
                </div>

            </main>
        </div>
    );
};

export default Layout;
