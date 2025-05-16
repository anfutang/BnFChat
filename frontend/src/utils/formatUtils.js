/**
 * Utilitaires de formatage et autres fonctions communes
 */

// Fonction de formatage du temps
export const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // Fonction pour extraire des métadonnées structurées d'un texte
  export const extractMetadata = (metadataText) => {
    if (!metadataText) return null;
    
    try {
      // Si le texte est déjà un objet JSON
      if (typeof metadataText === 'object') {
        return metadataText;
      }
      
      // Tenter de parser comme JSON
      try {
        return JSON.parse(metadataText);
      } catch (e) {
        // Ce n'est pas du JSON, continuer avec l'extraction de texte
      }
      
      // Extraction via regex
      const metadata = {};
      
      const patterns = {
        title: /titre\s*:\s*([^,\n]+)/i,
        author: /auteur\s*:\s*([^,\n]+)/i,
        year: /année|annee\s*:\s*([^,\n]+)/i,
        cote: /cote\s*:\s*([^,\n]+)/i,
        type: /type\s*:\s*([^,\n]+)/i,
        publisher: /éditeur|editeur\s*:\s*([^,\n]+)/i
      };
      
      Object.entries(patterns).forEach(([key, pattern]) => {
        const match = metadataText.match(pattern);
        if (match) {
          metadata[key] = match[1].trim();
        }
      });
      
      return Object.keys(metadata).length > 0 ? metadata : null;
    } catch (error) {
      console.error('Erreur lors de l\'extraction des métadonnées:', error);
      return null;
    }
  };
  
  // Fonction pour générer un identifiant unique
  export const generateId = (prefix = 'id') => {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  };