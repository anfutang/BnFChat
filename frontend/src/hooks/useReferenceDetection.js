import { useState, useEffect } from 'react';

const useReferenceDetection = (chatHistory, currentSession) => {
  const [probableReference, setProbableReference] = useState(null);
  const [showReferenceModal, setShowReferenceModal] = useState(false);

  // Effet pour détecter la référence probable dans les réponses
  useEffect(() => {
    // Si on est en session test et qu'on a des messages
    if (currentSession === 3 && chatHistory.length > 0) {
      // Chercher le dernier message du bot
      const lastBotMessage = [...chatHistory].reverse().find(msg => msg.sender === 'bot');
      
      if (lastBotMessage && lastBotMessage.metadata) {
        try {
          // Essayer d'extraire des métadonnées de référence
          if (lastBotMessage.metadata.reference) {
            setProbableReference(lastBotMessage.metadata.reference);
          }
          // Sinon, essayer de construire une référence à partir des métadonnées textuelles
          else {
            // Exemple simple - dans un cas réel, vous devriez parser correctement vos métadonnées
            const metadataText = lastBotMessage.metadata;
            
            // Exemple simplifié - à adapter selon votre format de métadonnées
            const titleMatch = metadataText.match(/titre: ([^,]+)/i);
            const authorMatch = metadataText.match(/auteur: ([^,]+)/i);
            const yearMatch = metadataText.match(/année: ([^,]+)/i);
            const coteMatch = metadataText.match(/cote: ([^,]+)/i);
            
            if (titleMatch || authorMatch) {
              setProbableReference({
                id: Date.now().toString(),
                title: titleMatch ? titleMatch[1].trim() : "Titre inconnu",
                author: authorMatch ? authorMatch[1].trim() : "Auteur inconnu",
                year: yearMatch ? yearMatch[1].trim() : null,
                cote: coteMatch ? coteMatch[1].trim() : null,
                type: "Ouvrage"
              });
            }
          }
        } catch (error) {
          console.error("Erreur lors de l'analyse des métadonnées de référence:", error);
        }
      }
    }
  }, [chatHistory, currentSession]);

  // Fonction pour ouvrir le modal d'évaluation de référence
  const handleViewReference = () => {
    if (probableReference) {
      setShowReferenceModal(true);
    }
  };

  // Fonction pour fermer le modal
  const handleCloseReferenceModal = () => {
    setShowReferenceModal(false);
  };

  // Fonction pour soumettre l'évaluation d'une référence
  const handleSubmitReferenceEvaluation = async (evaluationData, addSystemMessage) => {
    try {
      await axios.post('/api/dev/evaluate-reference', evaluationData);
      
      // Afficher un message de confirmation
      addSystemMessage(`Évaluation enregistrée (${evaluationData.rating}/5 étoiles). Merci pour votre feedback !`);
      return true;
    } catch (error) {
      console.error('Échec de l\'enregistrement de l\'évaluation:', error);
      return false;
    }
  };

  return {
    probableReference,
    showReferenceModal,
    handleViewReference,
    handleCloseReferenceModal,
    handleSubmitReferenceEvaluation
  };
};

export default useReferenceDetection;