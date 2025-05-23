import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const TopicNavigator = ({ currentSession, onTopicChange }) => {
  const [topicState, setTopicState] = useState({
    topics: [],
    currentTopicId: 0,
    currentTopicIndex: 0,
    isLoading: false,
    error: null
  });

  // Load topics from backend
  useEffect(() => {
    if (currentSession > 1) {
      loadTopics();
    } else {
      // Reset topics for tutorial session
      setTopicState({
        topics: [],
        currentTopicId: 0,
        currentTopicIndex: 0,
        isLoading: false,
        error: null
      });
    }
  }, [currentSession]);

  // In TopicNavigator.js - loadTopics function
// TopicNavigator.js - Remove the "Aucun sujet" option and ensure topic is always selected

const loadTopics = async () => {
  setTopicState(prev => ({ ...prev, isLoading: true, error: null }));
  
  try {
    const response = await axios.get('/api/dev/chat-topics');
    const { topics, currentTopicId } = response.data;
    
    // NO MORE "No topic" option - use topics directly
    const availableTopics = topics;
    
    // If no topic selected, default to first available topic
    let selectedTopicId = currentTopicId;
    let currentIndex = availableTopics.findIndex(t => t.id === currentTopicId);
    
    if (currentIndex === -1 && availableTopics.length > 0) {
      // Auto-select first topic if none selected
      selectedTopicId = availableTopics[0].id;
      currentIndex = 0;
      // Immediately select this topic on backend
      await axios.post('/api/dev/select-topic', { topicId: selectedTopicId });
    }
    
    setTopicState({
      topics: availableTopics,
      currentTopicId: selectedTopicId,
      currentTopicIndex: Math.max(0, currentIndex),
      isLoading: false,
      error: null
    });
    
    // Notify parent of current topic
    const currentTopic = availableTopics[Math.max(0, currentIndex)];
    if (onTopicChange) {
      onTopicChange(currentTopic);
    }
    
  } catch (error) {
    console.error('Failed to load topics:', error);
    setTopicState(prev => ({
      ...prev,
      isLoading: false,
      error: 'Erreur de chargement des sujets'
    }));
  }
};

  const navigateToTopic = useCallback((direction) => {
    const { topics, currentTopicIndex } = topicState;
    
    if (topics.length === 0) return;
    
    let newIndex;
    if (direction === 'next') {
      newIndex = currentTopicIndex === topics.length - 1 ? 0 : currentTopicIndex + 1;
    } else {
      newIndex = currentTopicIndex === 0 ? topics.length - 1 : currentTopicIndex - 1;
    }
    
    const selectedTopic = topics[newIndex];
    
    setTopicState(prev => ({
      ...prev,
      currentTopicIndex: newIndex,
      currentTopicId: selectedTopic.id
    }));
    
    // Notify parent of topic change
    if (onTopicChange) {
      onTopicChange(selectedTopic);
    }
  }, [topicState, onTopicChange]);

  const selectCurrentTopic = useCallback(async () => {
    const { topics, currentTopicIndex } = topicState;
    if (topics.length === 0) return;
    
    const selectedTopic = topics[currentTopicIndex];
    
    try {
      setTopicState(prev => ({ ...prev, isLoading: true }));
      
      const response = await axios.post('/api/dev/select-topic', {
        topicId: selectedTopic.id
      });
      
      if (response.data.success) {
        // Topic selected successfully
        console.log('Topic selected:', response.data);
        
        // Update the current topic ID to match backend
        setTopicState(prev => ({
          ...prev,
          currentTopicId: selectedTopic.id,
          isLoading: false
        }));
        
        // Notify parent
        if (onTopicChange) {
          onTopicChange(selectedTopic);
        }
        
      } else {
        throw new Error(response.data.error || 'Topic selection failed');
      }
      
    } catch (error) {
      console.error('Failed to select topic:', error);
      setTopicState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Erreur lors de la sélection du sujet'
      }));
    }
  }, [topicState, onTopicChange]);

  // Don't show topic navigator in tutorial session
  if (currentSession < 2) {
    return null;
  }

  const { topics, currentTopicIndex, isLoading, error } = topicState;
  
  if (isLoading && topics.length === 0) {
    return (
      <div className="topic-navigator">
        <h3>Sujets suggérés</h3>
        <div className="topic-loading">
          <div className="loading-spinner">⏳</div>
          <span>Chargement des sujets...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="topic-navigator">
        <h3>Sujets suggérés</h3>
        <div className="topic-error">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button onClick={loadTopics} className="retry-btn">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (topics.length === 0) {
    return null;
  }

  const currentTopic = topics[currentTopicIndex];
  const isSelected = topicState.currentTopicId === currentTopic.id;

  return (
    <div className="topic-navigator">
      <h3>Sujets suggérés</h3>
      
      <div className="topic-container">
        <button 
          onClick={() => navigateToTopic('prev')}
          className="nav-button prev"
          aria-label="Sujet précédent"
          disabled={topics.length <= 1 || isLoading}
        >
          ←
        </button>
        
        <div className="topic-info">
          <h4>{currentTopic.name}</h4>
          <div className="topic-details">
            <span className="topic-category">{currentTopic.category}</span>
            {/* <div className="topic-description">{currentTopic.description}</div> */}
          </div>
          <div className="topic-counter">
            {currentTopicIndex + 1} / {topics.length}
          </div>
          
          {/* Selection status */}
          <div className="topic-status">
            {isSelected ? (
              <span className="status-selected">✓ Sélectionné</span>
            ) : (
              <button 
                onClick={selectCurrentTopic}
                className="select-topic-btn"
                disabled={isLoading}
              >
                {isLoading ? 'Sélection...' : 'Sélectionner ce sujet'}
              </button>
            )}
          </div>
        </div>
        
        <button 
          onClick={() => navigateToTopic('next')}
          className="nav-button next"
          aria-label="Sujet suivant"
          disabled={topics.length <= 1 || isLoading}
        >
          →
        </button>
      </div>
      
      
      {error && (
        <div className="topic-error-inline">
          <small>⚠️ {error}</small>
        </div>
      )}
    </div>
  );
};

export default TopicNavigator;