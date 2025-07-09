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
            userId: response.data.user.userId,
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
      
      if (response.data.allowedLogin) {
        setCurrentUser({
          userId: response.data.userId,
          username: response.data.username,
          avatarSeed: response.data.avatarSeed,
          permissionLevel: response.data.permissionLevel,
          requestResetPassword: response.data.requestResetPassword,
          allowedResetPassword: response.data.allowedResetPassword,
          profileCompleted: response.data.profileCompleted,
          allowedLogin: response.data.allowedLogin
      })} else {
        setCurrentUser({ 
          requestResetPassword: response.data.requestResetPassword,
          allowedResetPassword: response.data.allowedResetPassword,
          allowedLogin: false,
        });
      };
      
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
      // return login(username, password);
      if (response.data.success) {
        setCurrentUser({
          username: response.data.username,
          profileCompleted: response.data.profileCompleted
      })};
      return { success: response.data.success};
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
      if (response.data.success) {
        if (response.data.allowedLogin) {
          setCurrentUser({
            userId: response.data.userId,
            username: response.data.username,
            avatarSeed: response.data.avatarSeed,
            permissionLevel: response.data.permissionLevel,
            requestResetPassword: response.data.requestResetPassword,
            allowedResetPassword: response.data.allowedResetPassword,
            profileCompleted: response.data.profileCompleted,
            allowedLogin: response.data.allowedLogin
          })
        } else {
          setCurrentUser({
            username: response.data.username,
            allowedLogin: response.data.allowedLogin,
            profileCompleted: response.data.profileCompleted,
            redirectedFromRegistration: true,
          })  
        };
      };
      
      return { success: response.data.success };
    } catch (error) {
      console.error('Profile submission failed:', error);
      return { 
        success: false, 
        message: error.response?.data?.error || 'Profile submission failed'
      };
    }
  };

  const resetPassword = async (username, password) => {
    try {
      const response = await axios.post('/api/auth/reset-password', { username, password });
      
      if (response.data.success) {
        setCurrentUser(prev => ({
          ...prev,
          requestResetPassword: false,
          allowedResetPassword: false,
        }));
      }
      
      return { success: response.data.success };
    } catch (error) {
      console.error('Login failed:', error);
      return { 
        success: false, 
        message: "Une erreur est survenue lors de la réinitialisation."
      };
    }
  };

  const cancel = async () => {
    try {
      await axios.post('/api/auth/cancel');
      return { success: true };
    } catch (error) {
      console.error('Delete user failed:', error);
      return { success: false };
    }
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout', {userId: currentUser.userId});
      setCurrentUser(null);
      return { success: true };
    } catch (error) {
      console.error('Logout failed:', error);
      return { success: false };
    }
  };

  const ping = async () => {
    try {
      const response = await axios.post('/api/auth/ping', { userId: currentUser.userId });
      return { success: response.data.success };
    } catch (error) {
      console.error('Ping failed:', error);
      return { success: false };
    }
  };

  const value = {
    currentUser,
    setCurrentUser,
    loading,
    login,
    register,
    submitProfile,
    resetPassword,
    cancel,
    logout,
    ping
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;