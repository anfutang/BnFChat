import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await axios.get('/api/auth/check-auth');
        if (response.data.authenticated) {
          setCurrentUser({
            username: response.data.user.username,
            avatarSeed: response.data.user.avatarSeed,
            permissionLevel: response.data.user.permissionLevel,
            profileCompleted: response.data.user.profileCompleted || false
          });
        } else {
          setCurrentUser(null);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (username, password) => {
    try {
      const response = await axios.post('/api/auth/login', { username, password });
      
      setCurrentUser({
        username: response.data.username,
        avatarSeed: response.data.avatarSeed,
        permissionLevel: response.data.permissionLevel,
        profileCompleted: response.data.profileCompleted || false
      });
      
      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      return { 
        success: false, 
        message: error.response?.data?.error || 'Échec de la connexion'
      };
    }
  };

  const register = async (username, password) => {
    try {
      const response = await axios.post('/api/auth/register', { username, password });
      
      // After registration, automatically log the user in
      return login(username, password);
    } catch (error) {
      console.error('Registration failed:', error);
      return { 
        success: false, 
        message: error.response?.data?.error || "Échec de l'inscription"
      };
    }
  };

  const submitProfile = async (profileData) => {
    try {
      const response = await axios.post('/api/auth/profile-submit', { 
        userProfileData: profileData 
      });
      
      // Update the current user with the new profile data
      setCurrentUser(prev => ({
        ...prev,
        username: response.data.username,
        permissionLevel: response.data.permissionLevel,
        avatarSeed: response.data.avatarSeed,
        profileCompleted: response.data.profileCompleted
      }));
      
      return { success: true };
    } catch (error) {
      console.error('Profile submission failed:', error);
      return { 
        success: false, 
        message: error.response?.data?.error || 'Profile submission failed'
      };
    }
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
      setCurrentUser(null);
      return { success: true };
    } catch (error) {
      console.error('Logout failed:', error);
      return { success: false };
    }
  };

  const value = {
    currentUser,
    loading,
    login,
    register,
    submitProfile,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;