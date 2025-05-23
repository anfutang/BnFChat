// hooks/useChat.js - Updated with topic support

import { useState, useRef, useCallback, useEffect } from 'react';

import { io } from 'socket.io-client';

export const useChat = () => {
  // ONLY these states needed - Single Source of Truth
  const [currentChatId, setCurrentChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [socket, setSocket] = useState(null);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(process.env.REACT_APP_SOCKET_URL, {
      auth: {
        token: localStorage.getItem('authToken')
      }
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Socket connected');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Socket disconnected');
    });

    // Chat state response
    newSocket.on('chat_state_response', (data) => {
      if (data.chat) {
        setCurrentChatId(data.chat.id);
        setMessages(data.chat.messages || []);
      } else {
        // No ongoing chat - clear state
        setCurrentChatId(null);
        setMessages([]);
      }
    });

    // Message received
    newSocket.on('message_received', (data) => {
      setMessages(prev => [...prev, data.message]);
    });

    // Streaming events
    newSocket.on('stream_start', (data) => {
      setIsStreaming(true);
      setCurrentChatId(data.chat_id);
      // Add AI message placeholder
      setMessages(prev => [...prev, {
        id: `temp_${Date.now()}`,
        role: 'assistant',
        content: '',
        isStreaming: true
      }]);
    });

    newSocket.on('stream_chunk', (data) => {
      setMessages(prev => prev.map(msg => 
        msg.isStreaming ? 
          { ...msg, content: msg.content + data.content } : 
          msg
      ));
    });

    newSocket.on('stream_end', (data) => {
      setIsStreaming(false);
      setMessages(prev => prev.map(msg => 
        msg.isStreaming ? 
          { ...msg, isStreaming: false, id: data.message_id } : 
          msg
      ));

      // Handle chat end events
      if (data.chat_ended) {
        handleChatEnd();
      }
    });

    // Session change success
    newSocket.on('session_change_success', () => {
      console.log('Session changed, ongoing chats terminated');
      clearChatState();
    });

    // Ongoing chats terminated
    newSocket.on('ongoing_chats_terminated', () => {
      console.log('Ongoing chats terminated');
      clearChatState();
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Clear chat state helper
  const clearChatState = useCallback(() => {
    setCurrentChatId(null);
    setMessages([]);
    setIsStreaming(false);
  }, []);

  // Handle chat end (abandon/recommencer/resultat)
  const handleChatEnd = useCallback(() => {
    console.log('Chat ended, clearing UI');
    clearChatState();
  }, [clearChatState]);

  // Send message - creates chat lazily if needed
  const sendMessage = useCallback((content) => {
    if (!socket || !isConnected) {
      console.error('Socket not connected');
      return;
    }

    // Add user message immediately to UI
    const userMessage = {
      id: `user_${Date.now()}`,
      role: 'user', 
      content,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);

    // Send via socket - backend will create chat if needed
    socket.emit('send_message', {
      content,
      chat_id: currentChatId // null if no ongoing chat
    });
  }, [socket, isConnected, currentChatId]);

  // Get current chat state
  const getChatState = useCallback(() => {
    if (!socket || !isConnected) return;
    
    socket.emit('get_chat_state');
  }, [socket, isConnected]);

  // Change session - will terminate ongoing chats
  const changeSession = useCallback((sessionId) => {
    if (!socket || !isConnected) return;
    
    socket.emit('session_change', { session_id: sessionId });
  }, [socket, isConnected]);

  // Update topic - will terminate ongoing chats  
  const updateTopic = useCallback((topicId, topicType) => {
    if (!socket || !isConnected) return;
    
    const topicField = topicType === 'exercise' ? 'exercise_topic_id' : 'test_topic_id';
    
    socket.emit('update_topic', { 
      [topicField]: topicId 
    });
  }, [socket, isConnected]);

  return {
    // State
    currentChatId,
    messages,
    isConnected,
    isStreaming,
    
    // Actions
    sendMessage,
    getChatState,
    changeSession,
    updateTopic,
    clearChatState
  };
};

export default useChat;