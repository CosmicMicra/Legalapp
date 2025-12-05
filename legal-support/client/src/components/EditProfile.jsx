import React, { useEffect, useState } from 'react'
import axios from 'axios'
import API_URL from '../api'

function EditProfile({ onBack }) {
  const [text, setText] = useState('')

  useEffect(() => {
    axios.get(`${API_URL}/api/profile`)
      .then(res => setText(res.data.profile || ''))
      .catch(() => setText(''))
  }, [])

  const handleSave = async () => {
    try {
      await axios.post(`${API_URL}/api/profile`, { profile: text })
      alert('Saved')
      if (onBack) onBack()
    } catch (err) {
      console.error('Error saving profile', err)
      alert('Error saving profile')
    }
  }

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="mb-0">Edit Profile</h1>
        <button className="btn btn-secondary" onClick={onBack}>Back</button>
      </div>
      <textarea
        className="form-control mb-3"
        rows="8"
        value={text}
        onChange={e => setText(e.target.value)}
      />
      <button className="btn btn-primary" onClick={handleSave}>Save</button>
    </div>
  )
}

export default EditProfile
