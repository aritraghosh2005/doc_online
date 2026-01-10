import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth, RedirectToSignIn } from '@clerk/clerk-react';
import Workspace from './components/Workspace';
import Dashboard from './components/Dashboard';

// 1. Auth Wrapper: Checks login status
// Fixes the "TS2786" error by avoiding <SignedIn> tags in the return
const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}>Loading...</div>;
  }

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  return <>{children}</>;
};

// 2. Workspace Wrapper: Forces a hard reset when the document ID changes
// Fixes the "Data Leak" bug where old text appeared in new docs
const WorkspaceWrapper = () => {
  const location = useLocation();
  // The 'key' forces React to destroy and recreate the component on URL change
  return <Workspace key={location.pathname} />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Route 1: Dashboard */}
        <Route path="/" element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        } />
        
        {/* Route 2: Workspace */}
        <Route path="/document/:id" element={
          <RequireAuth>
            <WorkspaceWrapper />
          </RequireAuth>
        } />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;