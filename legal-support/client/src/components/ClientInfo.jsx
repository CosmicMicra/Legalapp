import React, { useState } from 'react'
import './ClientInfo.css'

function ClientInfo({ onContinue, initialData = {}, onBack, hideBackButton = false }) {
  const [clientName, setClientName] = useState(initialData.clientName || '')
  const [clientEmail, setClientEmail] = useState(initialData.clientEmail || '')
  const [clientPhone, setClientPhone] = useState(initialData.clientPhone || '')
  const [caseNumber, setCaseNumber] = useState(initialData.caseNumber || '')
  const [caseType, setCaseType] = useState(initialData.caseType || '')

  const handleSubmit = (e) => {
    e.preventDefault()
    onContinue({
      clientName,
      clientEmail,
      clientPhone,
      caseNumber,
      caseType
    })
  }

  return (
    <div className="client-info-container">
      <div className="client-info-card">
        <h1 className="client-info-title">Client Information</h1>
        <p className="client-info-subtitle">
          Please provide basic information about the client and case.
        </p>
        <div className="header-divider"></div>

        {onBack && !hideBackButton && (
          <button type="button" className="back-button" onClick={onBack}>
            ← Back
          </button>
        )}

        <form onSubmit={handleSubmit} className="client-info-form">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Client Name *</label>
              <input
                type="text"
                className="form-input"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                required
                placeholder="Enter client name"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Case Number</label>
              <input
                type="text"
                className="form-input"
                value={caseNumber}
                onChange={e => setCaseNumber(e.target.value)}
                placeholder="Enter case number"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Client Email</label>
              <input
                type="email"
                className="form-input"
                value={clientEmail}
                onChange={e => setClientEmail(e.target.value)}
                placeholder="client@example.com"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Client Phone</label>
              <input
                type="tel"
                className="form-input"
                value={clientPhone}
                onChange={e => setClientPhone(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Case Type</label>
            <select
              className="form-select"
              value={caseType}
              onChange={e => setCaseType(e.target.value)}
            >
              <option value="">Select case type</option>
              <option value="discrimination">Discrimination</option>
              <option value="personal-injury">Personal Injury</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-actions">
            <button type="submit" className="submit-button">
              {hideBackButton ? 'Save Changes' : 'Continue to Assessment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ClientInfo

