import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';

// Auth Components
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ProfileWizard from './components/auth/ProfileWizard';

// App Components
import ChatInterface from './components/chat/ChatInterface';
import FeedbackForm from './components/feedback/FeedbackForm';
import AdminDashboard from './components/admin/AdminDashboard';


// Context
import { AuthProvider } from './context/AuthContext';

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
    return <div className="loading">Chargement...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Admin Route component
const AdminRoute = ({ children }) => {
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const authResponse = await axios.get('/api/auth/check-auth');
        if (!authResponse.data.authenticated) {
          setUserData({ isAdmin: false });
          return;
        }

        const sessionResponse = await axios.get('/api/dev/session-data');
        setUserData({
          isAdmin: sessionResponse.data.permissionLevel > 0,
          permissionLevel: sessionResponse.data.permissionLevel
        });
      } catch (error) {
        setUserData({ isAdmin: false });
      } finally {
        setIsLoading(false);
      }
    };

    checkAdmin();
  }, []);

  if (isLoading) {
    return <div className="loading">Chargement...</div>;
  }

  return userData && userData.isAdmin ? children : <Navigate to="/chat" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Routes>
            {/* Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/profile" element={<ProfileWizard />} />
            
            {/* App Routes */}
            <Route path="/chat" element={
              <ProtectedRoute>
                <ChatInterface />
              </ProtectedRoute>
            } />
            
            {/* Feedback Route */}
            <Route path="/feedback" element={
              <ProtectedRoute>
                <FeedbackForm />
              </ProtectedRoute>
            } />
            
            {/* Admin Routes */}
            <Route path="/admin" element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } />
            
            {/* Default Redirect */}
            <Route path="/" element={<Navigate to="/login" />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;