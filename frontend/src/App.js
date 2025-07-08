import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';

// Auth Components
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ProfileWizard from './components/auth/ProfileWizard';
import ResetPassword from './components/auth/ResetPassword';

// App Components
import ChatInterface from './components/chat/ChatInterface';
// import FeedbackForm from './components/feedback/FeedbackForm';
import AccountPanel from './components/account/Account';

// Context
import { AuthProvider } from './context/AuthContext';
import useAutoLogout from './hooks/useAutoLogout';

// Style
import './App.css';
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await axios.get('/api/auth/check-auth');
        setIsAuthenticated(response.data.authenticated);
      } catch (error) {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return <div className="loading" style={{ color:"white" }}>Chargement...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  useAutoLogout();

  return (
    <div className="App">
      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/profile" element={<ProfileWizard />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* App Routes */}
        <Route path="/chat" element={
          <ProtectedRoute>
            <ChatInterface />
          </ProtectedRoute>
        } />
        
        {/* Feedback Route
        <Route path="/feedback" element={
          <ProtectedRoute>
            <FeedbackForm />
          </ProtectedRoute>
        } /> */}
        
        {/* Admin Routes */}
        <Route path="/account" element={
          <ProtectedRoute>
            <AccountPanel />
          </ProtectedRoute>
        } />
        
        {/* Default Redirect */}
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </div>
  );
}

export default App;