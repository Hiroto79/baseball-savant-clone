import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './components/Login';
import Teams from './pages/Teams';
import TeamDetails from './pages/TeamDetails';
import PlayerDetails from './pages/PlayerDetails';
import { DataProvider } from './context/DataContext';
import { RapsodoProvider } from './context/RapsodoContext';
import Rapsodo from './pages/Rapsodo';
import Upload from './pages/Upload';
import Settings from './pages/Settings';
import Blast from './pages/Blast';
import Analysis from './pages/Analysis';
import Leaderboard from './pages/Leaderboard';
import MigrateData from './components/MigrateData';
import { SettingsProvider } from './context/SettingsContext';
import { BlastProvider } from './context/BlastContext';

import ErrorBoundary from './components/ErrorBoundary';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const auth = sessionStorage.getItem('authenticated');
    setIsAuthenticated(auth === 'true');
    setIsChecking(false);
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  // Show nothing while checking authentication
  if (isChecking) {
    return null;
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return (
      <ErrorBoundary>
        <SettingsProvider>
          <Login onLogin={handleLogin} />
        </SettingsProvider>
      </ErrorBoundary>
    );
  }

  // Show main app if authenticated
  return (
    <ErrorBoundary>
      <SettingsProvider>
        <DataProvider>
          <RapsodoProvider>
            <BlastProvider>
              <BrowserRouter>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Teams />} />
                    <Route path="/teams/:teamId" element={<TeamDetails />} />
                    <Route path="/player/:playerId" element={<PlayerDetails />} />
                    <Route path="/rapsodo" element={<Rapsodo />} />
                    <Route path="/blast" element={<Blast />} />
                    <Route path="/analysis" element={<Analysis />} />
                    <Route path="/leaderboard" element={<Leaderboard />} />
                    <Route path="/upload" element={<Upload />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/migrate" element={<MigrateData />} />
                    {/* Fallback route */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Layout>
              </BrowserRouter>
            </BlastProvider>
          </RapsodoProvider>
        </DataProvider>
      </SettingsProvider>
    </ErrorBoundary>
  );
}

export default App;

