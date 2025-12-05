import React from 'react'
import './QuestionField.css'

function QuestionField({ question, answers, onChange }) {
  const {
    id, label, type, parameters, conditional_on, mandatory,
    slider, default_slider_value
  } = question

  // Handle conditionals
  if (conditional_on) {
    const [depId, requiredValue] = conditional_on.split(',')
    const actualValue = answers[depId?.trim()]
    if (actualValue !== requiredValue?.trim().replace(/['"]+/g, '')) {
      return null
    }
  }

  const handleInputChange = (e) => {
    onChange(id, e.target.value)
  }

  const sliderValue = answers[`${id}_slider`] ?? default_slider_value ?? 0.5
  const displayValue = Math.round(sliderValue * 10)

  return (
    <div className="question-field">
      {type !== 'label' && (
        <label className="question-label">
          {label}
          {mandatory && <span className="required"> *</span>}
        </label>
      )}

      <div className="question-input-wrapper">
        {type === 'short text' || type === 'middle text' || type === 'long text' ? (
          <textarea
            className="question-textarea"
            placeholder="Describe the case details, circumstances, and relevant information..."
            value={answers[id] || ''}
            onChange={handleInputChange}
            rows={type === 'long text' ? 6 : type === 'middle text' ? 4 : 3}
          />
        ) : type === 'date' ? (
          <input
            type="date"
            className="question-input"
            value={answers[id] || ''}
            onChange={handleInputChange}
          />
        ) : type === 'numeric' ? (
          <input
            type="number"
            className="question-input"
            value={answers[id] || ''}
            onChange={handleInputChange}
          />
        ) : type === 'yesno' ? (
          <select
            className="question-select"
            value={answers[id] || ''}
            onChange={handleInputChange}
          >
            <option value="">Select an option</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        ) : type === 'multiple choice' ? (
          <select
            className="question-select"
            value={answers[id] || ''}
            onChange={handleInputChange}
          >
            <option value="">Select an option</option>
            {parameters?.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        ) : type === 'label' ? (
          <p className="question-label-text"><em>{label}</em></p>
        ) : (
          <input
            type="text"
            className="question-input"
            value={answers[id] || ''}
            onChange={handleInputChange}
            placeholder="Enter your answer..."
          />
        )}
      </div>

      {slider && (
        <div className="severity-assessment">
          <label className="severity-label">SEVERITY ASSESSMENT</label>
          <div className="severity-slider-container">
            <input
              type="range"
              className="severity-slider"
              min={0}
              max={1}
              step={0.01}
              value={sliderValue}
              onChange={e => onChange(`${id}_slider`, parseFloat(e.target.value))}
              style={{
                '--slider-progress': `${sliderValue * 100}%`
              }}
            />
            <div className="severity-value">{displayValue}</div>
          </div>
          <textarea
            className="severity-explanation"
            placeholder="Explain impact (optional)"
            value={answers[`${id}_explanation`] || ''}
            onChange={e => onChange(`${id}_explanation`, e.target.value)}
            rows={2}
          />
        </div>
      )}
    </div>
  )
}

export default QuestionField
