import React, { useState, useEffect } from 'react'
import Questionnaire from './components/Questionnaire'
import FileSelection from './components/FileSelection'
import ClientInfo from './components/ClientInfo'
import Login from './components/Login'
import Result from './components/Result'
import EditProfile from './components/EditProfile'
import axios from 'axios'
import './App.css'

function App() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [resultHtml, setResultHtml] = useState(null)
  const [answers, setAnswers] = useState({})
  const [clientInfo, setClientInfo] = useState(null)
  const [fileName, setFileName] = useState('')
  const [page, setPage] = useState('file-selection') // file-selection -> client-info -> questionnaire
  const [currentNav, setCurrentNav] = useState('CASES')

  useEffect(() => {
    axios.get('/api/check_login')
      .then(res => setLoggedIn(res.data.logged_in))
      .catch(() => setLoggedIn(false))
  }, [])

  const handleFileSelected = (file, loadedAnswers, loadedClientInfo) => {
    setFileName(file)
    setAnswers(loadedAnswers)
    if (loadedClientInfo) {
      setClientInfo(loadedClientInfo)
      setPage('questionnaire')
    } else {
      setPage('client-info')
    }
  }

  const handleNewFile = () => {
    setFileName('')
    setAnswers({})
    setClientInfo(null)
    setPage('client-info')
  }

  const handleClientInfoContinue = (info) => {
    setClientInfo(info)
    setPage('questionnaire')
  }

  const handleSave = async () => {
    if (!fileName) {
      const name = prompt('Enter a file name to save:')
      if (!name) return
      setFileName(name)
    }
    try {
      await axios.post('/api/save_answers', {
        filename: fileName,
        answers,
        clientInfo: clientInfo
      })
      alert('Saved successfully')
    } catch (err) {
      console.error('Error saving', err)
      alert('Error saving file')
    }
  }

  return (
    <div className="app-container">
      {loggedIn && (
        <header className="app-header">
          <div className="header-left">
            <h1 className="logo">VERITAS.</h1>
          </div>
          <nav className="header-nav">
            <button 
              className={`nav-link ${currentNav === 'DASHBOARD' ? 'active' : ''}`}
              onClick={() => setCurrentNav('DASHBOARD')}
            >
              DASHBOARD
            </button>
            <button 
              className={`nav-link ${currentNav === 'CASES' ? 'active' : ''}`}
              onClick={() => {
                setCurrentNav('CASES')
                setPage('file-selection')
                setResultHtml(null)
                setAnswers({})
                setClientInfo(null)
                setFileName('')
              }}
            >
              CASES
            </button>
            <button 
              className={`nav-link ${currentNav === 'SETTINGS' ? 'active' : ''}`}
              onClick={() => {
                setCurrentNav('SETTINGS')
                setPage('profile')
              }}
            >
              SETTINGS
            </button>
            <button 
              className="nav-link logout-btn"
              onClick={() => {
                axios.post('/api/logout').finally(() => {
                  setLoggedIn(false)
                  setResultHtml(null)
                  setAnswers({})
                  setClientInfo(null)
                  setFileName('')
                  setPage('file-selection')
                  setCurrentNav('CASES')
                })
              }}
            >
              LOGOUT
            </button>
          </nav>
        </header>
      )}

      <main className="app-main">
        {loggedIn ? (
          resultHtml ? (
            <Result html={resultHtml} onBack={() => setResultHtml(null)} />
          ) : (
            <>
              {page === 'profile' ? (
                <EditProfile onBack={() => {
                  setPage('questionnaire')
                  setCurrentNav('CASES')
                }} />
              ) : page === 'file-selection' ? (
                <FileSelection
                  onSelectFile={handleFileSelected}
                  onNewFile={handleNewFile}
                  onBack={loggedIn ? undefined : undefined}
                />
              ) : page === 'client-info' ? (
                <ClientInfo
                  onContinue={handleClientInfoContinue}
                  initialData={clientInfo || {}}
                  onBack={() => setPage('file-selection')}
                />
              ) : (
                <Questionnaire
                  onSubmit={setResultHtml}
                  answers={answers}
                  setAnswers={setAnswers}
                  clientInfo={clientInfo}
                  setClientInfo={setClientInfo}
                  fileName={fileName}
                  onSave={handleSave}
                  onBack={() => setPage('client-info')}
                />
              )}
            </>
          )
        ) : (
          <Login onLogin={() => { 
            setLoggedIn(true)
            setPage('file-selection')
            setCurrentNav('CASES')
          }} />
        )}
      </main>
    </div>
  )
}

export default App
