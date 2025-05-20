import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const useChatManager = (setShowSessionMessage) => {
  const [chatHistory, setChatHistory] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFirstInput, setIsFirstInput] = useState(true);
  const [thoughtProcess, setThoughtProcess] = useState([]);
  const [timingData, setTimingData] = useState({});
  const [needsAnnotation, setNeedsAnnotation] = useState(false);
  const [currentResponse, setCurrentResponse] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultModalData, setResultModalData] = useState(null);
  const [processingResult, setProcessingResult] = useState(false);
  const messageListRef = useRef(null);
  const eventSourceRef = useRef(null);
  const [processingResultEvent, setProcessingResultEvent] = useState(false);

  // Load chat history if it exists
  const loadChatHistory = async () => {
    try {
      const historyResponse = await axios.get('/api/dev/chat-history');
      if (historyResponse.data && historyResponse.data.length > 0) {
        setChatHistory(historyResponse.data);
        setIsFirstInput(false);
        setShowSessionMessage(false);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  // Clean up the EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        console.log("Closing SSE connection on unmount");
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  const processSearchResults = async (content) => {
    console.log("⭐ Processing search results with content:", content);
    
    try {
      // Vérifier le type de contenu et le traiter en conséquence
      let sruQuery, originalQuery;
      
      if (typeof content === 'string') {
        // Si c'est une chaîne, essayer de la diviser avec le délimiteur
        if (content.includes('###')) {
          [sruQuery, originalQuery] = content.split('###');
        } else {
          // Si pas de délimiteur, utiliser tout comme requête SRU
          sruQuery = content;
          originalQuery = "Requête originale non spécifiée";
        }
      } else if (typeof content === 'object') {
        // Si c'est un objet, essayer d'extraire les propriétés pertinentes
        sruQuery = content.sruQuery || JSON.stringify(content);
        originalQuery = content.originalQuery || "Requête structurée";
      } else {
        // Fallback pour tout autre type
        sruQuery = String(content);
        originalQuery = "Type de données non reconnu";
      }
      
      console.log("⭐ Extracted queries:", { sruQuery, originalQuery });
      
      // Envoyer la requête au backend
      const response = await axios.post('/api/dev/manage-result', {
        sruQuery,
        originalQuery
      });
      
      console.log("⭐ API response:", response.data);
      
      // Important: First update the result data, then update loading state
      // This ensures the modal has the data when it becomes visible
      setResultModalData({
        id: response.data.id,
        sruQuery,
        originalQuery,
        items: response.data.items
      });
      
      // Use a small delay to ensure state updates are processed in sequence
      setTimeout(() => {
        setProcessingResult(false);
      }, 50);
      
      console.log("⭐ Result modal data updated");
    } catch (error) {
      console.error('Failed to process search results:', error);
      
      // En cas d'erreur, afficher un message d'erreur
      setResultModalData({
        error: true,
        message: "Une erreur est survenue lors du traitement des résultats."
      });
      setProcessingResult(false);
    }
  };

  // Handle message submission
  const handleSubmit = async (message, currentSession) => {
    if (!message.trim() || isLoading) return;
    
    // Hide the intro message after first user input
    setShowSessionMessage(false);
    
    setUserInput('');
    setIsLoading(true);
    setThoughtProcess([]);
    setTimingData({});
    setNeedsAnnotation(false);
    
    // Add user message to chat
    const newUserMessage = {
        sender: 'user',
        message,
        timestamp: new Date().toISOString()
    };
    
    setChatHistory(prev => [...prev, newUserMessage]);
    
    try {
        // Close any existing EventSource connection
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        
        // Get current chat ID from the last response if available
        const chatId = currentResponse?.metadata?.chatId || '';
        
        // Create new EventSource connection with chat ID
        console.log(`Creating EventSource connection to /api/stream/input?query=${encodeURIComponent(message)}&first=${isFirstInput}&session=${currentSession}&chatId=${chatId}`);
        const eventSource = new EventSource(`/api/stream/input?query=${encodeURIComponent(message)}&first=${isFirstInput}&session=${currentSession}&chatId=${chatId}`);
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
              
              setChatHistory(prev => [...prev, botResponse]);
              setCurrentResponse(botResponse);
              
              if (data.content.needsAnnotation) {
                setNeedsAnnotation(true);
              }
              break;

            // Modify the case for result event
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

            // Modify the case for close_connection
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
                  message: `Erreur: ${data.content}`,
                  timestamp: new Date().toISOString()
                }
              ]);
              
              // Add fallback response for certain errors
              if (data.content.includes("ParseError") || data.content.includes("syntax error")) {
                setChatHistory(prev => [
                  ...prev, 
                  {
                    sender: 'bot',
                    message: "Je suis désolé, mais je n'ai pas pu traiter votre requête correctement. Il semble y avoir un problème avec la formulation de la recherche. Pourriez-vous essayer de reformuler votre question de manière plus simple ou avec des termes différents ?",
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
            message: "Erreur de connexion au serveur. Veuillez réessayer.",
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
          message: `Erreur de communication avec le serveur: ${error.message}`,
          timestamp: new Date().toISOString()
        }
      ]);
      setIsLoading(false);
    }
  };
  
  // Stop the SSE stream
  const stopStreaming = () => {
    if (eventSourceRef.current) {
      console.log("Closing SSE connection");
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsLoading(false);
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
        message: 'Nouvelle conversation démarrée.',
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
          message: 'Conversation abandonnée. Vous pouvez démarrer une nouvelle conversation.',
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

  // Confirm chat as satisfactory
  const handleConfirmChat = async () => {
    if (chatHistory.length <= 1) {
      alert('Aucune conversation à confirmer. Posez d\'abord une question.');
      return false;
    }
    
    try {
      await axios.post('/api/dev/confirm-chat');
      
      setChatHistory(prev => [
        ...prev,
        {
          sender: 'system',
          message: 'Conversation confirmée. Cette conversation sera enregistrée comme référence positive.',
          timestamp: new Date().toISOString()
        }
      ]);
      
      return true;
    } catch (error) {
      console.error('Failed to confirm conversation:', error);
      return false;
    }
  };
  
  // Add a system message
  const addSystemMessage = (message) => {
    setChatHistory(prev => [
      ...prev,
      {
        sender: 'system',
        message,
        timestamp: new Date().toISOString()
      }
    ]);
  };

  // Reset chat (for session change)
  const resetChat = () => {
    setChatHistory([]);
    setIsFirstInput(true);
    setThoughtProcess([]);
    setTimingData({});
    setNeedsAnnotation(false);
  };

  return {
    chatHistory,
    setChatHistory,
    userInput,
    setUserInput,
    isLoading,
    isFirstInput,
    thoughtProcess,
    timingData,
    needsAnnotation,
    currentResponse,
    messageListRef,
    showResultModal,
    resultModalData,
    processingResult,
    // Exposer les setters pour le modal
    setShowResultModal,
    setResultModalData,
    setProcessingResult,
    // Le reste des fonctions
    loadChatHistory,
    handleSubmit,
    handleAnnotationSubmit,
    handleRestartChat,
    handleAbandonChat,
    handleConfirmChat,
    addSystemMessage,
    resetChat,
    stopStreaming,
    handleCloseResultModal
  };
}

export default useChatManager;