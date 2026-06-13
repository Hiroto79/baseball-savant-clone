import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './components/Login';

import PlayerDetails from './pages/PlayerDetails';
import { DataProvider } from './context/DataContext';
import { RapsodoProvider } from './context/RapsodoContext';
import Rapsodo from './pages/Rapsodo';
import Upload from './pages/Upload';
import Settings from './pages/Settings';
import Blast from './pages/Blast';
import Analysis from './pages/Analysis';
import Leaderboard from './pages/Leaderboard';
import Feedback from './pages/Feedback';
import HitterFeedback from './pages/HitterFeedback';
import PitchingSimulator from './pages/PitchingSimulator';

import { SettingsProvider } from './context/SettingsContext';
import { BlastProvider } from './context/BlastContext';

import ErrorBoundary from './components/ErrorBoundary';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    try {
      const auth = sessionStorage.getItem('authenticated');
      setIsAuthenticated(auth === 'true');
    } catch (error) {
      console.warn('sessionStorage is not accessible:', error);
      setIsAuthenticated(false);
    } finally {
      setIsChecking(false);
    }
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

                    <Route path="/player/:playerId" element={<PlayerDetails />} />
                    <Route path="/rapsodo" element={<Rapsodo />} />
                    <Route path="/blast" element={<Blast />} />
                    <Route path="/analysis" element={<Analysis />} />
                    <Route path="/leaderboard" element={<Leaderboard />} />
                    <Route path="/feedback" element={<Feedback />} /> {/* Added Feedback route */}
                    <Route path="/hitter-feedback" element={<HitterFeedback />} /> {/* Added HitterFeedback route */}
                    <Route path="/simulator" element={<PitchingSimulator />} />
                    <Route path="/upload" element={<Upload />} />
                    <Route path="/settings" element={<Settings />} />

                    <Route path="/" element={<Navigate to="/analysis" replace />} />
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
