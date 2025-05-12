import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

const ProfileForm = () => {
  const [profileData, setProfileData] = useState({
    'full-name': '',
    'email': '',
    'age': '',
    'gender': '',
    'education': '',
    'occupation': '',
    'experience-level': 'beginner',
    'avatar-seed': Math.floor(Math.random() * 1000)
  });
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { submitProfile, currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If user has a completed profile, redirect to chat
    if (currentUser && currentUser.avatarSeed) {
      navigate('/chat');
    }
  }, [currentUser, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Validate inputs
    if (!profileData['full-name'] || !profileData.email) {
      setError('Name and email are required');
      setIsLoading(false);
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profileData.email)) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    try {
      const result = await submitProfile(profileData);
      
      if (result.success) {
        navigate('/chat');
      } else {
        setError(result.message || 'Profile submission failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const generateNewAvatar = () => {
    setProfileData(prev => ({
      ...prev,
      'avatar-seed': Math.floor(Math.random() * 1000)
    }));
  };

  return (
    <div className="auth-container">
      <div className="auth-card profile-card">
        <h2>Complete Your Profile</h2>
        
        {error && <div className="auth-error">{error}</div>}
        
        <div className="avatar-section">
          <div className="avatar-preview">
            <img 
              src={`https://api.dicebear.com/7.x/micah/svg?seed=${profileData['avatar-seed']}`} 
              alt="Avatar" 
              className="avatar-image"
            />
          </div>
          <button 
            type="button" 
            className="avatar-button" 
            onClick={generateNewAvatar}
            disabled={isLoading}
          >
            Generate New Avatar
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="full-name">Full Name*</label>
            <input
              type="text"
              id="full-name"
              name="full-name"
              value={profileData['full-name']}
              onChange={handleChange}
              disabled={isLoading}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Email Address*</label>
            <input
              type="email"
              id="email"
              name="email"
              value={profileData.email}
              onChange={handleChange}
              disabled={isLoading}
              required
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="age">Age</label>
              <input
                type="number"
                id="age"
                name="age"
                value={profileData.age}
                onChange={handleChange}
                disabled={isLoading}
                min="13"
                max="120"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="gender">Gender</label>
              <select
                id="gender"
                name="gender"
                value={profileData.gender}
                onChange={handleChange}
                disabled={isLoading}
              >
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="education">Education Level</label>
            <select
              id="education"
              name="education"
              value={profileData.education}
              onChange={handleChange}
              disabled={isLoading}
            >
              <option value="">Select Education Level</option>
              <option value="high-school">High School</option>
              <option value="bachelor">Bachelor's Degree</option>
              <option value="master">Master's Degree</option>
              <option value="phd">PhD or Doctorate</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="occupation">Occupation</label>
            <input
              type="text"
              id="occupation"
              name="occupation"
              value={profileData.occupation}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="experience-level">Experience Level</label>
            <select
              id="experience-level"
              name="experience-level"
              value={profileData['experience-level']}
              onChange={handleChange}
              disabled={isLoading}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
          </div>
          
          <button 
            type="submit" 
            className="auth-button"
            disabled={isLoading}
          >
            {isLoading ? 'Submitting...' : 'Complete Registration'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileForm;