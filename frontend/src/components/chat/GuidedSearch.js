// GuidedSearch.js
import React from 'react';
import './GuidedSearch.css';

const GuidedSearch = ({ onSelectGuide }) => {
  const guides = [
    { 
      id: 1, 
      title: "Rechercher Victor Hugo", 
      description: "Trouvez des ouvrages de ou sur Victor Hugo",
      sample: "Quels sont les principaux ouvrages de Victor Hugo disponibles à la BNF ?"
    },
    { 
      id: 2, 
      title: "Rechercher Flaubert", 
      description: "Explorez les œuvres de Gustave Flaubert",
      sample: "Je recherche des informations sur Madame Bovary de Flaubert. Quelles éditions sont disponibles ?"
    },
    { 
      id: 3, 
      title: "Littérature du 19ème siècle", 
      description: "Explorez les grands courants littéraires",
      sample: "Pouvez-vous me suggérer des ouvrages critiques sur le romantisme français ?"
    },
    { 
      id: 4, 
      title: "Recherche thématique", 
      description: "Sur l'urbanisme parisien",
      sample: "Je cherche des ouvrages sur les transformations de Paris au Second Empire"
    }
  ];

  return (
    <div className="guided-search-container">
      <h3>Guides de recherche</h3>
      <p className="guided-search-intro">Sélectionnez un des sujets ci-dessous pour commencer votre recherche guidée :</p>
      
      <div className="guides-list">
        {guides.map(guide => (
          <div 
            key={guide.id} 
            className="guide-item"
            onClick={() => onSelectGuide(guide.sample)}
          >
            <div className="guide-title">{guide.title}</div>
            <div className="guide-description">{guide.description}</div>
            <div className="guide-sample">
              <span>Exemple : </span>
              <em>{guide.sample}</em>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GuidedSearch;