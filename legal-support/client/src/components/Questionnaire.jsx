import API_URL from '../api'
import React, { useEffect, useState, useMemo } from 'react'
import axios from 'axios'
import QuestionField from './QuestionField'
import ClientInfo from './ClientInfo'
import './Questionnaire.css'

function Questionnaire({ onSubmit, answers, setAnswers, clientInfo, setClientInfo, fileName, onSave, onBack }) {
  const [data, setData] = useState(null)
  const [allQuestions, setAllQuestions] = useState([])
  const [currentPage, setCurrentPage] = useState(0)
  const [selectedQuestionId, setSelectedQuestionId] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showEditClientInfo, setShowEditClientInfo] = useState(false)
  const questionsPerPage = 12

  useEffect(() => {
    axios.get(`${API_URL}/api/questions`)
      .then(res => {
        setData(res.data)
        // Build question tree with sections and nested questions
        const questions = []
        res.data.sections?.forEach(section => {
          section.questions?.forEach(q => {
            questions.push({
              ...q,
              sectionTitle: section.title,
              sectionNumber: section.section_number,
              level: 0 // Will be calculated for nested questions
            })
          })
        })
        setAllQuestions(questions)
        if (questions.length > 0) {
          setSelectedQuestionId(questions[0].id)
        }
      })
      .catch(err => console.error('Error fetching questions:', err))
  }, [])

  const handleChange = (id, value) => {
    setAnswers(prev => ({ ...prev, [id]: value }))
  }

  // Calculate visible questions based on conditionals and build question tree
  const { visibleQuestions, questionTree } = useMemo(() => {
    const visible = []
    const tree = []
    let questionIndex = 0

    allQuestions.forEach(q => {
      let shouldShow = true
      
      // Check conditional logic
      if (q.conditional_on) {
        const [depId, requiredValue] = q.conditional_on.split(',')
        const actualValue = answers[depId?.trim()]
        shouldShow = actualValue === requiredValue?.trim().replace(/['"]+/g, '')
      }

      if (shouldShow) {
        // Calculate nesting level
        let level = 0
        if (q.conditional_on) {
          const [depId] = q.conditional_on.split(',')
          const parentIndex = visible.findIndex(vq => vq.id === depId?.trim())
          if (parentIndex >= 0) {
            level = visible[parentIndex].level + 1
          }
        }

        const questionWithLevel = {
          ...q,
          level,
          index: questionIndex++
        }
        visible.push(questionWithLevel)
        tree.push(questionWithLevel)
      }
    })

    return { visibleQuestions: visible, questionTree: tree }
  }, [allQuestions, answers])

  // Calculate progress
  const answeredCount = visibleQuestions.filter(q => {
    const answer = answers[q.id]
    return answer !== undefined && answer !== null && answer !== ''
  }).length

  const progressPercentage = visibleQuestions.length > 0 
    ? (answeredCount / visibleQuestions.length) * 100 
    : 0

  // Paginate questions
  const totalPages = Math.ceil(visibleQuestions.length / questionsPerPage)
  const startIndex = currentPage * questionsPerPage
  const endIndex = startIndex + questionsPerPage
  const currentPageQuestions = visibleQuestions.slice(startIndex, endIndex)

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage)
    // Scroll to top of questions
    const questionsContainer = document.querySelector('.questions-container')
    if (questionsContainer) {
      questionsContainer.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleQuestionClick = (questionId) => {
    setSelectedQuestionId(questionId)
    // Find which page this question is on
    const questionIndex = visibleQuestions.findIndex(q => q.id === questionId)
    if (questionIndex >= 0) {
      const page = Math.floor(questionIndex / questionsPerPage)
      setCurrentPage(page)
      // Scroll to the question
      setTimeout(() => {
        const questionElement = document.getElementById(`question-${questionId}`)
        if (questionElement) {
          questionElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const res = await axios.post(`${API_URL}/api/compile_summary`, { answers })
      if (onSubmit) onSubmit(res.data.html)
    } catch (err) {
      console.error('Error submitting form:', err)
      alert('Error submitting form. Please try again.')
    }
  }

  const handleSaveClick = async () => {
    if (onSave) {
      await onSave()
    }
  }

  const handleEditClientInfo = (updatedInfo) => {
    setClientInfo(updatedInfo)
    setShowEditClientInfo(false)
    // Auto-save after editing client info
    if (onSave && fileName) {
      onSave()
    }
  }

  if (!data || !Array.isArray(data.sections)) {
    return (
      <div className="questionnaire-container">
        <div className="loading-state">
          <p>Loading questionnaire data...</p>
        </div>
      </div>
    )
  }

  // Group questions by section for sidebar
  const questionsBySection = {}
  questionTree.forEach(q => {
    const sectionKey = `${q.sectionNumber}-${q.sectionTitle}`
    if (!questionsBySection[sectionKey]) {
      questionsBySection[sectionKey] = {
        sectionNumber: q.sectionNumber,
        sectionTitle: q.sectionTitle,
        questions: []
      }
    }
    questionsBySection[sectionKey].questions.push(q)
  })

  return (
    <div className="questionnaire-container">
      {/* Progress Bar */}
      <div className="progress-bar-container">
        <div className="progress-bar-header">
          <div className="progress-info">
            <span className="progress-text">
              Progress: {answeredCount} of {visibleQuestions.length} questions answered
            </span>
            <span className="progress-percentage">{Math.round(progressPercentage)}%</span>
          </div>
          <div className="progress-actions">
            <button
              type="button"
              className="save-button"
              onClick={handleSaveClick}
            >
              Save Progress
            </button>
          </div>
        </div>
        <div className="progress-bar">
          <div
            className="progress-bar-fill"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      <div className="questionnaire-layout">
        {/* Sidebar - Question Index */}
        <aside className={`questionnaire-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <div className="sidebar-header">
            <h3 className="sidebar-title">Question Index</h3>
            <button
              className="sidebar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? '◀' : '▶'}
            </button>
          </div>
          <div className="sidebar-content">
            {Object.values(questionsBySection).map(section => (
              <div key={`${section.sectionNumber}-${section.sectionTitle}`} className="sidebar-section">
                <h4 className="sidebar-section-title">
                  Section {section.sectionNumber}: {section.sectionTitle}
                </h4>
                <ul className="sidebar-question-list">
                  {section.questions.map(q => {
                    const isAnswered = answers[q.id] !== undefined && 
                                      answers[q.id] !== null && 
                                      answers[q.id] !== ''
                    const isSelected = selectedQuestionId === q.id
                    return (
                      <li
                        key={q.id}
                        className={`sidebar-question-item ${isSelected ? 'selected' : ''} ${isAnswered ? 'answered' : ''} level-${q.level}`}
                        onClick={() => handleQuestionClick(q.id)}
                      >
                        <span className="question-number">{q.index + 1}</span>
                        <span className="question-label">{q.label}</span>
                        {isAnswered && <span className="answered-indicator">✓</span>}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="questionnaire-main">
          <div className="questionnaire-header">
            <div className="header-top">
              {onBack && (
                <button type="button" className="back-button" onClick={onBack}>
                  ← Back
                </button>
              )}
              <h1 className="questionnaire-title">Case Assessment</h1>
            </div>
            {clientInfo && (
              <div className="client-info-section">
                <div className="client-info-badge">
                  <span><strong>Client:</strong> {clientInfo.clientName}</span>
                  {clientInfo.caseNumber && <span> • <strong>Case #:</strong> {clientInfo.caseNumber}</span>}
                  {clientInfo.caseType && <span> • <strong>Type:</strong> {clientInfo.caseType}</span>}
                </div>
                <button
                  type="button"
                  className="edit-client-button"
                  onClick={() => setShowEditClientInfo(true)}
                >
                  Edit Client Info
                </button>
              </div>
            )}
          </div>

          {/* Edit Client Info Modal */}
          {showEditClientInfo && (
            <div className="modal-overlay" onClick={() => setShowEditClientInfo(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>Edit Client Information</h2>
                  <button
                    className="modal-close"
                    onClick={() => setShowEditClientInfo(false)}
                  >
                    ×
                  </button>
                </div>
                <div className="modal-body">
                  <ClientInfo
                    onContinue={handleEditClientInfo}
                    initialData={clientInfo || {}}
                    onBack={null}
                    hideBackButton={true}
                  />
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="questionnaire-form">
            <div className="questions-container">
              {currentPageQuestions.map((question, idx) => (
                <div
                  key={question.id}
                  id={`question-${question.id}`}
                  className={`question-card ${selectedQuestionId === question.id ? 'highlighted' : ''}`}
                  style={{ marginLeft: `${question.level * 2}rem` }}
                >
                  <div className="question-header">
                    <div className="question-number-badge">
                      {question.index + 1}
                    </div>
                    <div className="question-header-content">
                      <h3 className="question-title">{question.label}</h3>
                      {question.sectionTitle && (
                        <p className="question-section">{question.sectionTitle}</p>
                      )}
                    </div>
        </div>

                  <div className="question-body">
                <QuestionField
                      question={question}
                  answers={answers}
                  onChange={handleChange}
                />
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  type="button"
                  className="pagination-button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 0}
                >
                  Previous
                </button>
                <span className="pagination-info">
                  Page {currentPage + 1} of {totalPages}
                </span>
                <button
                  type="button"
                  className="pagination-button"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages - 1}
                >
                  Next
                </button>
          </div>
            )}

            {/* Submit Button */}
            <div className="submit-section">
              <button type="submit" className="submit-button">
                Submit Assessment
              </button>
        </div>
      </form>
        </main>
      </div>
    </div>
  )
}

export default Questionnaire
