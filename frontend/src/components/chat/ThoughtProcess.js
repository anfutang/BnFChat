import React from 'react';
import './ChatInterface.css';

const ThoughtProcess = ({ process, timing }) => {
  return (
    <div className="thought-process-container">
      <h3>Processing Steps</h3>
      
      {process && process.length > 0 ? (
        <div className="thought-steps">
          {process.map((step, index) => (
            <div key={index} className="thought-step">{step}</div>
          ))}
        </div>
      ) : (
        <div className="empty-thought">
          <p>The processing steps will appear here when you send a message.</p>
        </div>
      )}
      
      {Object.keys(timing).length > 0 && (
        <div className="timing-data">
          <h4>Processing Times</h4>
          <table>
            <tbody>
              {Object.entries(timing).map(([key, value]) => (
                <tr key={key}>
                  <td>{key.replace(/_/g, ' ').replace(/time/i, 'Time')}</td>
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