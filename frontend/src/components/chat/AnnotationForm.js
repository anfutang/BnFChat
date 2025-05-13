import React, { useState } from 'react';
import './ChatInterface.css';

const AnnotationForm = ({ onSubmit, response }) => {
  const [satisfaction, setSatisfaction] = useState(3);
  const [helpfulness, setHelpfulness] = useState(3);
  const [relevance, setRelevance] = useState(3);
  const [clarity, setClarity] = useState(3);
  const [comments, setComments] = useState('');
  const [endConversation, setEndConversation] = useState(false);
  const [convLabel, setConvLabel] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const annotationData = {
      satisfaction,
      helpfulness,
      relevance,
      clarity,
      comments,
      selectedResponseIndex: 0, // Since we're in respond mode
      convLabel: endConversation ? convLabel : ''
    };
    
    onSubmit(annotationData);
  };

  return (
    <div className="annotation-form">
      <h3>Please Evaluate the Response</h3>
      
      <form onSubmit={handleSubmit}>
        <div className="rating-section">
          <div className="rating-item">
            <label>Satisfaction</label>
            <div className="rating-scale">
              <span>Not satisfied</span>
              {[1, 2, 3, 4, 5].map((value) => (
                <label key={value} className="rating-option">
                  <input
                    type="radio"
                    name="satisfaction"
                    value={value}
                    checked={satisfaction === value}
                    onChange={() => setSatisfaction(value)}
                  />
                  <span>{value}</span>
                </label>
              ))}
              <span>Very satisfied</span>
            </div>
          </div>
          
          <div className="rating-item">
            <label>Helpfulness</label>
            <div className="rating-scale">
              <span>Not helpful</span>
              {[1, 2, 3, 4, 5].map((value) => (
                <label key={value} className="rating-option">
                  <input
                    type="radio"
                    name="helpfulness"
                    value={value}
                    checked={helpfulness === value}
                    onChange={() => setHelpfulness(value)}
                  />
                  <span>{value}</span>
                </label>
              ))}
              <span>Very helpful</span>
            </div>
          </div>
          
          <div className="rating-item">
            <label>Relevance</label>
            <div className="rating-scale">
              <span>Not relevant</span>
              {[1, 2, 3, 4, 5].map((value) => (
                <label key={value} className="rating-option">
                  <input
                    type="radio"
                    name="relevance"
                    value={value}
                    checked={relevance === value}
                    onChange={() => setRelevance(value)}
                  />
                  <span>{value}</span>
                </label>
              ))}
              <span>Very relevant</span>
            </div>
          </div>
          
          <div className="rating-item">
            <label>Clarity</label>
            <div className="rating-scale">
              <span>Not clear</span>
              {[1, 2, 3, 4, 5].map((value) => (
                <label key={value} className="rating-option">
                  <input
                    type="radio"
                    name="clarity"
                    value={value}
                    checked={clarity === value}
                    onChange={() => setClarity(value)}
                  />
                  <span>{value}</span>
                </label>
              ))}
              <span>Very clear</span>
            </div>
          </div>
        </div>
        
        <div className="comments-section">
          <label htmlFor="comments">Additional Comments (Optional)</label>
          <textarea
            id="comments"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Any other feedback about the response?"
            rows={3}
          />
        </div>
        
        <div className="end-conversation-section">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={endConversation}
              onChange={(e) => setEndConversation(e.target.checked)}
            />
            End Conversation
          </label>
          
          {endConversation && (
            <div className="conv-label-section">
              <label htmlFor="conv-label">Conversation Label</label>
              <select
                id="conv-label"
                value={convLabel}
                onChange={(e) => setConvLabel(e.target.value)}
                required={endConversation}
              >
                <option value="">Select a label</option>
                <option value="success">Success - Found what I needed</option>
                <option value="partial">Partial Success - Found some information</option>
                <option value="failure">Failure - Couldn't find what I needed</option>
                <option value="interrupted">Interrupted - Had to end early</option>
              </select>
            </div>
          )}
        </div>
        
        <div className="form-actions">
          <button type="submit" className="submit-btn">
            Submit Evaluation
          </button>
        </div>
      </form>
    </div>
  );
};

export default AnnotationForm;