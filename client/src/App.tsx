import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, RedirectToSignIn } from '@clerk/clerk-react';
import Workspace from './components/Workspace';
import Dashboard from './components/Dashboard';

// --- Auth Wrapper Component ---
// This checks if the user is logged in. 
// If yes -> Renders the page. 
// If no -> Redirects to Clerk Login.
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

function App() {
  return (
    <Router>
      <Routes>
        {/* Route 1: Dashboard (Protected) */}
        <Route 
          path="/" 
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          } 
        />
        
        {/* Route 2: Workspace (Protected) */}
        <Route 
          path="/document/:id" 
          element={
            <RequireAuth>
              <Workspace />
            </RequireAuth>
          } 
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;