import React, { useState } from 'react';
import { LayoutDashboard, BarChart3, Settings, Upload, Activity, Menu, X, Trophy, FileText, Users, Compass, Crosshair } from 'lucide-react';
import { Link } from 'react-router-dom';

const Layout = ({ children }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-background text-foreground flex font-sans">
            {/* Sidebar */}
            <aside className="w-64 border-r border-border bg-card hidden md:flex flex-col sticky top-0 h-screen print:hidden">
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
                    <Link to="/leaderboard" className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                        <Trophy size={20} />
                        <span className="font-medium">Leaderboard</span>
                    </Link>
                    <Link to="/feedback" className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                        <FileText size={20} />
                        <span className="font-medium">Pitching Feedback</span>
                    </Link>
                    <Link to="/hitter-feedback" className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                        <FileText size={20} />
                        <span className="font-medium">Hitter Feedback</span>
                    </Link>

                    <Link to="/rapsodo" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
                        <Activity size={20} />
                        <span>Rapsodo Analysis</span>
                    </Link>
                    <Link to="/simulator" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
                        <Compass size={20} />
                        <span>Simulator (3Dシーム&軌道)</span>
                    </Link>
                    <Link to="/command" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
                        <Crosshair size={20} className="text-rose-400" />
                        <span className="font-bold text-rose-400">Command Analysis</span>
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
                                to="/feedback"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                            >
                                <FileText size={20} />
                                <span>Feedback</span>
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
                                to="/simulator"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                            >
                                <Compass size={20} />
                                <span>Simulator (3Dシーム&軌道)</span>
                            </Link>
                            <Link
                                to="/command"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                            >
                                <Crosshair size={20} className="text-rose-400" />
                                <span className="font-bold text-rose-400">Command Analysis</span>
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

                <header className="h-13 sm:h-14 md:h-16 border-b border-border bg-card/80 backdrop-blur flex items-center px-3 sm:px-4 md:px-6 justify-between sticky top-0 z-20 print:hidden">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                        <button
                            className="md:hidden p-1.5 -ml-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors cursor-pointer"
                            onClick={() => setIsMobileMenuOpen(true)}
                            aria-label="Toggle Menu"
                        >
                            <Menu size={18} />
                        </button>
                        <h2 className="text-sm sm:text-base md:text-lg font-bold truncate">Dashboard</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs sm:text-sm font-bold">
                            U
                        </div>
                    </div>
                </header>
                <div className="flex-1 p-2 sm:p-4 md:p-6 overflow-auto">
                    {children}
                </div>

            </main>
        </div>
    );
};

export default Layout;
