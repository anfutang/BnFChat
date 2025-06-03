import React, { useState, useEffect } from 'react';

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
        value={textAnswers[q.id] || ''}
        onChange={(e) => handleTextChange(q.id, e.target.value)}
        className="border rounded w-full p-2"
        placeholder="Saissisez..."
      />
    );
  }

  const isExplain = type.includes('+explanation');
  const isSingle = type.startsWith('single');

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2">
      {q.options.map((opt) => {
        const selected = selectedOptions[q.id] || [];
        const isSelected = selected.includes(opt);

        return (
          <div key={opt} className="min-w-[150px]">
            <label className="flex items-center space-x-2">
              <input
                type={isSingle ? 'radio' : 'checkbox'}
                name={q.id}
                checked={isSelected}
                onChange={() => handleOptionChange(q.id, opt, type)}
              />
              <span>{opt}</span>
            </label>

            {isExplain && isSelected && (
              <input
                type="text"
                className="border rounded px-2 py-1 w-full mt-1"
                placeholder={
                  q.explanationRequired
                    ? `* (Obligatoire) Justifiez votre choix de « ${opt} ».`
                    : `(Optionnel) Justifiez votre choix de « ${opt} ».`
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
    <div className="space-y-8">
      {questions.map((q) => (
        <div key={q.id} className="border-b pb-4">
          <h3 className="font-bold">{q.required && <span className="mandatory">*</span>}{q.text}</h3>
          {renderQuestion(q)}
        </div>
      ))}
    </div>
  );
};

export default MultiTypeForm;
