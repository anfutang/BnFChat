import React, { useState, useEffect } from 'react';
import "./MultiTypeForm.css"

const MultiTypeForm = ({ questions, onChange }) => {
  const [selectedOptions, setSelectedOptions] = useState({});
  const [explanations, setExplanations] = useState({});
  const [textAnswers, setTextAnswers] = useState({});

  // 校验是否所有 required explanations 都填写了
  const validate = () => {
    for (const q of questions) {
      const selected = selectedOptions[q.id] || [];
      const textAnswer = textAnswers[q.id] || '';
  
      // 1. check questions 
      if (q.required) {
        if (q.type === 'text') {
          if (!textAnswer.trim()) return false;
        } else if (selected.length === 0) {
          return false;
        }
      }
  
      // 2. check question explanations
      const isExplainType = q.type === 'single+explanation' || q.type === 'multiple+explanation';
      if (isExplainType && q.explanationRequired) {
        for (const opt of selected) {
          const explain = explanations[q.id]?.[opt] || '';
          if (!explain.trim()) return false;
        }
      }
    }
  
    return true;
  };

  // save user responses & set isMandatoryFilled
  useEffect(() => {
    onChange?.(
      {
        selectedOptions,
        explanations,
        textAnswers,
      },
      validate()
    );
  }, [selectedOptions, explanations, textAnswers]);

  const handleOptionChange = (questionId, option, type) => {
    setSelectedOptions((prev) => {
      let newSelected;
      if (type === 'single' || type === 'single+explanation') {
        newSelected = { ...prev, [questionId]: [option] };
      } else {
        const prevSelected = prev[questionId] || [];
        newSelected = {
          ...prev,
          [questionId]: prevSelected.includes(option)
            ? prevSelected.filter((item) => item !== option)
            : [...prevSelected, option],
        };
      }
      return newSelected;
    });
  };

  const handleExplanationChange = (questionId, option, value) => {
    setExplanations((prev) => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] || {}),
        [option]: value,
      },
    }));
  };

  const handleTextChange = (questionId, value) => {
    setTextAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const renderQuestion = (q) => {
    const type = q.type;

  if (type === 'text') {
    return (
      <textarea
        className="text-input"
        value={textAnswers[q.id] || ''}
        onChange={(e) => handleTextChange(q.id, e.target.value)}
        placeholder="Saissisez..."
      />
    );
  }

  const isExplain = type.includes('+explanation');
  const isSingle = type.startsWith('single');

  return (
    <div className="option-container">
      {q.options.map((opt) => {
        const selected = selectedOptions[q.id] || [];
        const isSelected = selected.includes(opt);

        return (
          <div key={opt} className="option-item" style={{ width:isExplain ? '100%' : 'auto' }}>
            <label className="option-label">
              <input
                type={isSingle ? 'radio' : 'checkbox'}
                name={q.id}
                checked={isSelected}
                onChange={() => handleOptionChange(q.id, opt, type)}
              />
              <span>{opt}</span>
            </label>

            {isExplain && isSelected && (
              <textarea
                className="explanation-input"
                placeholder={
                  q.explanationRequired
                    ? `* (Obligatoire) Justifiez votre choix.`
                    : `(Optionnel) Justifiez votre choix.`
                }
                value={explanations[q.id]?.[opt] || ''}
                onChange={(e) =>
                  handleExplanationChange(q.id, opt, e.target.value)
                }
              />
            )}
          </div>
        );
      })}
    </div>
    );
  };

  return (
    <div className="multi-type-form-container">
      {questions.map((q) => (
        <div key={q.id} className="multi-type-question-item">
          <p className="multi-type-question-label">{q.required && <span className="mandatory">*</span>}{q.text}</p>
          {renderQuestion(q)}
        </div>
      ))}
    </div>
  );
};

export default MultiTypeForm;
