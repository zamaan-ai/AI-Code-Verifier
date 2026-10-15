import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './layouts/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProjectExplorer from './pages/ProjectExplorer';
import Findings from './pages/Findings';
import FindingDetail from './pages/FindingDetail';
import Transpilation from './pages/Transpilation';
import WCETAnalyzer from './pages/WCETAnalyzer';
import ScanHistory from './pages/ScanHistory';
import Settings from './pages/Settings';
import Compliance from './pages/Compliance';

function RequireAuth({ children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="projects" element={<ProjectExplorer />} />
        <Route path="findings" element={<Findings />} />
        <Route path="findings/:id" element={<FindingDetail />} />
        <Route path="transpilation" element={<Transpilation />} />
        <Route path="wcet" element={<WCETAnalyzer />} />
        <Route path="history" element={<ScanHistory />} />
        <Route path="settings" element={<Settings />} />
        <Route path="compliance" element={<Compliance />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
