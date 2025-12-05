import React, { useEffect, useState } from 'react'
import Chat from './Chat'
import axios from 'axios'

function Result({ html, onBack }) {
  const [debug, setDebug] = useState(false)

  useEffect(() => {
    axios.get('/api/config')
      .then(res => setDebug(res.data.debug))
      .catch(() => setDebug(false))
  }, [])

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="mb-0">Result</h1>
        <button className="btn btn-secondary" onClick={onBack}>Back</button>
      </div>
      {debug && (
        <>
          <p className="mb-4">Here is your compiled summary. Submit it to a LLM:</p>
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </>
      )}
      <Chat debug={debug} />
    </div>
  )
}

export default Result
