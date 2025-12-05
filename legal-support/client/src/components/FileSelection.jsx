import React, { useEffect, useState } from 'react'
import axios from 'axios'
import './FileSelection.css'

function FileSelection({ onSelectFile, onNewFile, onBack }) {
  const [files, setFiles] = useState([])
  const [selectedFile, setSelectedFile] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFiles()
  }, [])

  const fetchFiles = async () => {
    try {
      const res = await axios.get('/api/list_answers')
      setFiles(res.data.files || [])
    } catch (err) {
      console.error('Error fetching file list', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLoad = async () => {
    if (!selectedFile) {
      alert('Please select a file to load')
      return
    }
    try {
      const loadRes = await axios.get('/api/load_answers', { params: { filename: selectedFile } })
      onSelectFile(selectedFile, loadRes.data.answers || {}, loadRes.data.clientInfo)
    } catch (err) {
      console.error('Error loading', err)
      alert('Error loading file')
    }
  }

  const handleDelete = async () => {
    if (!selectedFile) {
      alert('Please select a file to delete')
      return
    }
    if (!window.confirm('Delete selected file?')) return
    try {
      await axios.post('/api/delete_answers', { filename: selectedFile })
      setSelectedFile('')
      fetchFiles()
    } catch (err) {
      console.error('Error deleting', err)
      alert('Error deleting file')
    }
  }

  return (
    <div className="file-selection-container">
      <div className="file-selection-card">
        <h1 className="file-selection-title">Case Assessment Tool</h1>
        <p className="file-selection-subtitle">
          Start a new case assessment or continue with an existing one.
        </p>
        <div className="header-divider"></div>

        {onBack && (
          <button className="back-button" onClick={onBack}>
            ← Back
          </button>
        )}
        <div className="file-selection-options">
          <div className="option-section">
            <h2 className="option-title">New Case</h2>
            <p className="option-description">Start a fresh case assessment</p>
            <button className="option-button primary" onClick={onNewFile}>
              Create New Case
            </button>
          </div>

          <div className="option-divider">
            <span>OR</span>
          </div>

          <div className="option-section">
            <h2 className="option-title">Continue Existing Case</h2>
            <p className="option-description">Load a previously saved case assessment</p>
            
            {loading ? (
              <p className="loading-text">Loading files...</p>
            ) : files.length === 0 ? (
              <p className="no-files-text">No saved files found</p>
            ) : (
              <>
                <select
                  className="file-select"
                  value={selectedFile}
                  onChange={e => setSelectedFile(e.target.value)}
                >
                  <option value="">Select a saved file</option>
                  {files.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                <div className="file-actions">
                  <button
                    className="option-button secondary"
                    onClick={handleLoad}
                    disabled={!selectedFile}
                  >
                    Load Case
                  </button>
                  <button
                    className="option-button danger"
                    onClick={handleDelete}
                    disabled={!selectedFile}
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default FileSelection

