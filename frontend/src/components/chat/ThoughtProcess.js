import React from 'react';
import './ChatInterface.css';

const ThoughtProcess = ({ process, timing }) => {
  return (
    <div className="thought-process-container">
      <h3>Étapes de traitement</h3>
      
      {process && process.length > 0 ? (
        <div className="thought-steps">
          {process.map((step, index) => (
            <div key={index} className="thought-step">{step}</div>
          ))}
        </div>
      ) : (
        <div className="empty-thought">
          <p>Les étapes de traitement apparaîtront ici lorsque vous enverrez un message.</p>
        </div>
      )}
      
      {Object.keys(timing).length > 0 && (
        <div className="timing-data">
          <h4>Temps de traitement</h4>
          <table>
            <tbody>
              {Object.entries(timing).map(([key, value]) => (
                <tr key={key}>
                  <td>{key.replace(/_/g, ' ').replace(/time/i, 'Temps')}</td>
                  <td>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ThoughtProcess;