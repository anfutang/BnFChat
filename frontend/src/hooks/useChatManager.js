import { useState, useRef } from 'react';
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
  const messageListRef = useRef(null);

  // Charger l'historique des messages si existant
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

  // Gérer la soumission des messages
  const handleSubmit = async (message, currentSession) => {
    if (!message.trim() || isLoading) return;
    
    // Masquer le message d'introduction après la première entrée utilisateur
    setShowSessionMessage(false);
    
    setUserInput('');
    setIsLoading(true);
    setThoughtProcess([]);
    setTimingData({});
    setNeedsAnnotation(false);
    
    // Ajouter le message de l'utilisateur au chat
    const newUserMessage = {
      sender: 'user',
      message,
      timestamp: new Date().toISOString()
    };
    
    setChatHistory(prev => [...prev, newUserMessage]);
    try {
      setIsLoading(true);
      
      // Utiliser fetch au lieu d'axios pour le streaming
      const response = await fetch('/api/dev/input', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userInput: message,
          firstInput: isFirstInput
        })
      });
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // Traiter les lignes complètes
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Garder la dernière ligne potentiellement incomplète
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          try {
            const data = JSON.parse(line);
            console.log("Received data:", data); // Debug
            
            switch (data.type) {
              // Les mêmes cases que vous aviez avant
              case 'info':
                setThoughtProcess(data.content);
                break;
                
              case 'time':
                setTimingData(data.content);
                break;
                

            case 'error':
              console.error('Error from server:', data.content);
              // Ajouter un message d'erreur au chat
              setChatHistory(prev => [
                ...prev, 
                {
                  sender: 'system',
                  message: `Erreur: ${data.content}`,
                  timestamp: new Date().toISOString()
                }
              ]);
              
              // Ajouter une réponse de fallback après l'erreur
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
              break;
                
              case 'response':
                const botResponse = {
                  sender: 'bot',
                  message: data.content.message,
                  metadata: data.content.metadata,
                  timestamp: new Date().toISOString()
                };
                
                setChatHistory(prev => [...prev, botResponse]);
                setCurrentResponse(botResponse);
                
                if (data.content.needsAnnotation) {
                  setNeedsAnnotation(true);
                }
                break;
            }
          } catch (err) {
            console.error('Failed to parse server response:', err, line);
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Gérer la soumission des annotations
  const handleAnnotationSubmit = async (annotationData) => {
    try {
      await axios.post('/api/dev/user-annotation', annotationData);
      
      setNeedsAnnotation(false);
      
      // Si la conversation est terminée, vider le chat
      if (annotationData.convLabel) {
        setChatHistory([]);
        setIsFirstInput(true);
        setShowSessionMessage(true);
      }
      
    } catch (error) {
      console.error('Failed to submit annotation:', error);
    }
  };

  // Redémarrer la conversation
  const handleRestartChat = async () => {
    try {
      await axios.post('/api/dev/restart-chat');
      
      // Réinitialisation de l'état de la conversation uniquement
      setChatHistory([]);
      setIsFirstInput(true);
      setThoughtProcess([]);
      setTimingData({});
      setNeedsAnnotation(false);
      
      // Ajouter un message système indiquant le redémarrage
      setChatHistory([{
        sender: 'system',
        message: 'Nouvelle conversation démarrée.',
        timestamp: new Date().toISOString()
      }]);
      
      return true;
    } catch (error) {
      console.error('Échec du redémarrage de la conversation:', error);
      return false;
    }
  };

  // Abandonner la conversation
  const handleAbandonChat = async () => {
    if (chatHistory.length <= 1) {
      // S'il n'y a pas encore de vraie conversation, simplement réinitialiser
      return handleRestartChat();
    }
    
    try {
      await axios.post('/api/dev/abandon-chat');
      
      // Ajouter un message système
      setChatHistory(prev => [
        ...prev,
        {
          sender: 'system',
          message: 'Conversation abandonnée. Vous pouvez démarrer une nouvelle conversation.',
          timestamp: new Date().toISOString()
        }
      ]);
      
      // Désactiver l'entrée pour forcer l'utilisateur à redémarrer
      setIsLoading(true); // Empêche l'envoi de nouveaux messages
      
      // Délai avant de proposer de redémarrer
      setTimeout(() => {
        setIsLoading(false);
        setIsFirstInput(true); // Prêt pour une nouvelle conversation
      }, 2000);
      
      return true;
    } catch (error) {
      console.error('Échec de l\'abandon de la conversation:', error);
      return false;
    }
  };

  // Confirmer une conversation comme satisfaisante
  const handleConfirmChat = async (probableReference, showReferenceModal) => {
    if (chatHistory.length <= 1) {
      // Aucune conversation à confirmer
      alert('Aucune conversation à confirmer. Posez d\'abord une question.');
      return false;
    }
    
    try {
      await axios.post('/api/dev/confirm-chat');
      
      // Ajouter un message de confirmation
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
      console.error('Échec de la confirmation de la conversation:', error);
      return false;
    }
  };
  
  // Ajouter un message système
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

  // Réinitialiser le chat (pour changer de session)
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
    loadChatHistory,
    handleSubmit,
    handleAnnotationSubmit,
    handleRestartChat,
    handleAbandonChat,
    handleConfirmChat,
    addSystemMessage,
    resetChat
  };
};

export default useChatManager;