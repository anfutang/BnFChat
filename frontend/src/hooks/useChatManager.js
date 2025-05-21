import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const useChatManager = (setShowSessionMessage, currentSession, currentChatId) => {
  const [chatHistory, setChatHistory] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFirstInput, setIsFirstInput] = useState(true);
  const [thoughtProcess, setThoughtProcess] = useState([]);
  const [timingData, setTimingData] = useState({});
  const [intentData, setIntentData] = useState({});
  const [needsAnnotation, setNeedsAnnotation] = useState(false);
  const [currentResponse, setCurrentResponse] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultModalData, setResultModalData] = useState(null);
  const [processingResult, setProcessingResult] = useState(false);
  const messageListRef = useRef(null);
  const eventSourceRef = useRef(null);
  const [processingResultEvent, setProcessingResultEvent] = useState(false);
  const [requestInProgress, setRequestInProgress] = useState(false); // Add this to track ongoing requests

  // Load chat history if it exists
  const loadChatHistory = async (specificSessionId) => {
    try {
      // Use either specified session ID, current session from props, or default
      const sessionId = specificSessionId || currentSession || 1;
      
      // Include session ID in request
      const historyResponse = await axios.get(`/api/dev/chat-history?sessionId=${sessionId}`);
      
      if (historyResponse.data && historyResponse.data.messages && historyResponse.data.messages.length > 0) {
        // Replace instead of append to avoid duplication
        setChatHistory(historyResponse.data.messages);
        
        // Store the chat ID if it exists
        if (historyResponse.data.chatId) {
          setCurrentResponse(prev => ({
            ...prev,
            metadata: {
              ...((prev && prev.metadata) || {}),
              chatId: historyResponse.data.chatId
            }
          }));
        }
        
        setIsFirstInput(false);
        setShowSessionMessage(false);
      } else {
        // If no messages, ensure chat history is empty
        setChatHistory([]);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  // Effect to reload chat history when session changes
  useEffect(() => {
    if (currentSession) {
      loadChatHistory(currentSession);
    }
  }, [currentSession]);

  // Effect to update the current chat ID when it changes from props
  useEffect(() => {
    if (currentChatId) {
      setCurrentResponse(prev => ({
        ...prev,
        metadata: {
          ...((prev && prev.metadata) || {}),
          chatId: currentChatId
        }
      }));
    }
  }, [currentChatId]);

  // Stop the SSE stream
  const stopStreaming = () => {
    if (eventSourceRef.current) {
      console.log("Closing SSE connection");
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsLoading(false);
      setRequestInProgress(false); // Reset request in progress flag
    }
  };

  const processSearchResults = async (content) => {
    console.log("⭐ Processing search results with content:", content);
    
    try {
      // Process the content
      let sruQuery, originalQuery;
      
      if (typeof content === 'string') {
        // If it's a string, try to split with delimiter
        if (content.includes('###')) {
          [sruQuery, originalQuery] = content.split('###');
        } else {
          // If no delimiter, use all as SRU query
          sruQuery = content;
          originalQuery = "Original query not specified";
        }
      } else if (typeof content === 'object') {
        // If it's an object, try to extract relevant properties
        sruQuery = content.sruQuery || JSON.stringify(content);
        originalQuery = content.originalQuery || "Structured query";
      } else {
        // Fallback for any other type
        sruQuery = String(content);
        originalQuery = "Unrecognized data type";
      }
      
      console.log("⭐ Extracted queries:", { sruQuery, originalQuery });
      
      // Send request to backend
      const response = await axios.post('/api/dev/manage-result', {
        sruQuery,
        originalQuery
      });
      
      console.log("⭐ API response:", response.data);
      
      // Update result data, then update loading state
      setResultModalData({
        id: response.data.id,
        sruQuery,
        originalQuery,
        wcResults: response.data.wcResults,
        wocResults: response.data.wocResults
      });
      
      // Use a small delay to ensure state updates are processed in sequence
      setTimeout(() => {
        setProcessingResult(false);
      }, 50);
      
      console.log("⭐ Result modal data updated");
    } catch (error) {
      console.error('Failed to process search results:', error);
      
      // In case of error, display error message
      setResultModalData({
        error: true,
        message: "An error occurred while processing results."
      });
      setProcessingResult(false);
    }
  };

  // Handle message submission
  const handleSubmit = async (message, sessionId) => {
    if (!message.trim() || isLoading || requestInProgress) return;
    
    // Set request in progress to prevent multiple submissions
    setRequestInProgress(true);
    
    // Hide intro message after first user input
    setShowSessionMessage(false);
    
    setUserInput('');
    setIsLoading(true);
    setThoughtProcess([]);
    setTimingData({});
    setIntentData('');
    setNeedsAnnotation(false);
    
    // Add user message to chat
    const newUserMessage = {
        sender: 'user',
        message,
        timestamp: new Date().toISOString()
    };
    
    // Use a function form to ensure we're working with the latest state
    setChatHistory(prev => [...prev, newUserMessage]);
    
    try {
        // Close any existing EventSource connection
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        
        // Get current chat ID from the last response or props
        const chatId = currentResponse?.metadata?.chatId || currentChatId || '';
        
        // Make sure we're using the correct session ID
        const useSessionId = sessionId || currentSession || 1;
        
        // Create new EventSource connection with chat ID and session ID
        console.log(`Creating EventSource connection to /api/stream/input?query=${encodeURIComponent(message)}&first=${isFirstInput}&session=${useSessionId}&chatId=${chatId}`);
        
        const eventSource = new EventSource(`/api/stream/input?query=${encodeURIComponent(message)}&first=${isFirstInput}&session=${useSessionId}&chatId=${chatId}`);
        eventSourceRef.current = eventSource;

      // Handle different event types
      eventSource.onmessage = (event) => {
        console.log("Received SSE message:", event.data);
        
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'connection':
              console.log('Connection established');
              break;
              
            case 'info':
              setThoughtProcess(data.content);
              break;
              
            case 'time':
              setTimingData(data.content);
              break;

            case 'intent':
              setIntentData(data.content);
              break;
              
            case 'typing':
              // Could show typing indicator or update processing message
              break;
            
            case 'response':
              // Process response normally
              const botResponse = {
                sender: 'bot',
                message: data.content.message || data.content,
                metadata: data.content.metadata,
                timestamp: new Date().toISOString()
              };
              
              // Use functional update to ensure we're working with the latest state
              setChatHistory(prev => {
                // Check if this is a new conversation or not
                if (prev.length === 0) {
                  return [newUserMessage, botResponse];
                } else if (prev.length === 1 && prev[0].sender === 'user' && prev[0].message === message) {
                  // If we only have one message and it's the user message we just added,
                  // ensure we don't create duplicate entries
                  return [prev[0], botResponse];
                } else {
                  // Normal case: append the bot response
                  return [...prev, botResponse];
                }
              });
              
              setCurrentResponse(botResponse);
              
              if (data.content.needsAnnotation) {
                setNeedsAnnotation(true);
              }
              break;

            case 'result':
              console.log("⭐⭐⭐ RESULT EVENT RECEIVED ⭐⭐⭐");
              console.log("Result content:", data.content);
              
              // Set flag to indicate we're processing a result
              setProcessingResultEvent(true);
              
              // Process the result
              setProcessingResult(true);
              setShowResultModal(true);
              
              // Process results and then clear the flag when done
              processSearchResults(data.content)
                .then(() => {
                  console.log("Result processing completed");
                  setProcessingResultEvent(false);
                })
                .catch(err => {
                  console.error("Error processing results:", err);
                  setProcessingResultEvent(false);
                });
              break;

            case 'close_connection':
              console.log("Server requested connection close");
              
              // Check if we're processing a result
              if (processingResultEvent) {
                console.log("Delaying connection close until result processing completes");
                
                // Poll until processingResultEvent is false
                const checkInterval = setInterval(() => {
                  if (!processingResultEvent) {
                    clearInterval(checkInterval);
                    stopStreaming();
                  }
                }, 100);
              } else {
                stopStreaming();
              }
              break;
              
            case 'error':
              console.error('Error from server:', data.content);
              
              setChatHistory(prev => [
                ...prev, 
                {
                  sender: 'system',
                  message: `Error: ${data.content}`,
                  timestamp: new Date().toISOString()
                }
              ]);
              
              // Add fallback response for certain errors
              if (data.content.includes("ParseError") || data.content.includes("syntax error")) {
                setChatHistory(prev => [
                  ...prev, 
                  {
                    sender: 'bot',
                    message: "I'm sorry, but I couldn't process your request correctly. There seems to be a problem with the search formulation. Could you try rephrasing your question more simply or with different terms?",
                    timestamp: new Date().toISOString()
                  }
                ]);
              }
              
              stopStreaming();
              break;
              
            default:
              console.warn('Unknown message type:', data.type);
          }
        } catch (e) {
          console.error('Error processing message:', e, 'Data:', event.data);
        }
      };
      
      // Handle connection established
      eventSource.onopen = () => {
        console.log("SSE connection opened successfully");
      };
      
      // Handle errors
      eventSource.onerror = (error) => {
        console.error("SSE connection error:", error);
        setChatHistory(prev => [
          ...prev,
          {
            sender: 'system',
            message: "Server connection error. Please try again.",
            timestamp: new Date().toISOString()
          }
        ]);
        stopStreaming();
      };
      
      // Mark as not being first input anymore
      if (isFirstInput) {
        setIsFirstInput(false);
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      setChatHistory(prev => [
        ...prev, 
        {
          sender: 'system',
          message: `Server communication error: ${error.message}`,
          timestamp: new Date().toISOString()
        }
      ]);
      setIsLoading(false);
      setRequestInProgress(false); // Reset request in progress flag
    }
  };

  // Handle closing the result modal
  const handleCloseResultModal = () => {
    setShowResultModal(false);
    setResultModalData(null);
  };

  // Handle annotation submission  
  const handleAnnotationSubmit = async (annotationData) => {
    try {
      await axios.post('/api/dev/user-annotation', annotationData);
      
      setNeedsAnnotation(false);
      
      // If conversation is finished, clear the chat
      if (annotationData.convLabel) {
        setChatHistory([]);
        setIsFirstInput(true);
        setShowSessionMessage(true);
      }
      
    } catch (error) {
      console.error('Failed to submit annotation:', error);
    }
  };

  // Restart the chat
  const handleRestartChat = async () => {
    try {
      await axios.post('/api/dev/restart-chat');
      
      // Reset the conversation state
      setChatHistory([]);
      setIsFirstInput(true);
      setThoughtProcess([]);
      setTimingData({});
      setNeedsAnnotation(false);
      
      // Add system message indicating restart
      setChatHistory([{
        sender: 'system',
        message: 'New conversation started.',
        timestamp: new Date().toISOString()
      }]);
      
      return true;
    } catch (error) {
      console.error('Failed to restart conversation:', error);
      return false;
    }
  };

  // Abandon the chat
  const handleAbandonChat = async () => {
    if (chatHistory.length <= 1) {
      return handleRestartChat();
    }
    
    try {
      await axios.post('/api/dev/abandon-chat');
      
      setChatHistory(prev => [
        ...prev,
        {
          sender: 'system',
          message: 'Conversation abandoned. You can start a new conversation.',
          timestamp: new Date().toISOString()
        }
      ]);
      
      // Disable input to force user to restart
      setIsLoading(true);
      
      setTimeout(() => {
        setIsLoading(false);
        setIsFirstInput(true);
      }, 2000);
      
      return true;
    } catch (error) {
      console.error('Failed to abandon conversation:', error);
      return false;
    }
  };

  return {
    chatHistory,
    setChatHistory,
    userInput,
    setUserInput,
    isLoading,
    isFirstInput,
    setIsFirstInput,
    thoughtProcess,
    timingData,
    intentData,
    needsAnnotation,
    currentResponse,
    messageListRef,
    showResultModal,
    resultModalData,
    processingResult,
    // Expose setters for modal
    setShowResultModal,
    setResultModalData,
    setProcessingResult,
    // Functions
    loadChatHistory,
    handleSubmit,
    handleAnnotationSubmit,
    handleRestartChat,
    handleAbandonChat,
    stopStreaming,
    handleCloseResultModal
  };
};

export default useChatManager;