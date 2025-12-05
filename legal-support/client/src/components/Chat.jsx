import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import API_URL from '../api'

function Chat({ debug }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [timer, setTimer] = useState(0)
  const timerRef = useRef(null)

  const startTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    setTimer(0)
    timerRef.current = setInterval(() => {
      setTimer(t => t + 1)
    }, 1000)
  }

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  useEffect(() => {
    if (debug === false && messages.length === 0) {
      handleInitial()
    }
  }, [debug])

  const send = async (newMessage) => {
    const updated = [...messages, { role: 'user', content: newMessage }]
    setMessages(updated)
    try {
      setLoading(true)
      startTimer()
      const res = await axios.post(`${API_URL}/api/chat`, { messages: updated })
      const reply = res.data.reply
      const htmlReply = markdownToHtml(reply)
      setMessages([...updated, { role: 'assistant', content: htmlReply }])
    } catch (err) {
      console.error('Error sending message', err)
      alert('Error communicating with the server')
    } finally {
      setLoading(false)
      stopTimer()
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!input.trim()) return
    send(input.trim())
    setInput('')
  }

  const handleInitial = async () => {
    try {
      setLoading(true)
      startTimer()
      const res = await axios.post(`${API_URL}/api/chat`, { messages: [] })
      const reply = res.data.reply
      const htmlReply = markdownToHtml(reply)
      setMessages([{ role: 'assistant', content: htmlReply }])
    } catch (err) {
      console.error('Error sending initial prompt', err)
      alert('Error communicating with the server')
    } finally {
      setLoading(false)
      stopTimer()
    }
  }

  const markdownToHtml = (text) => {
    const lines = text.split('\n')
    const out = []
    let i = 0
    while (i < lines.length) {
      const line = lines[i]
      const next = lines[i + 1]
      const tableHeaderMatch = line.trim().match(/^\|(.+)\|$/)
      const separatorMatch = next && next.trim().match(/^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/)
      if (tableHeaderMatch && separatorMatch) {
        const headers = tableHeaderMatch[1].split('|').map(h => h.trim())
        out.push('<table class="table table-bordered table-sm">')
        out.push('<thead><tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr></thead>')
        out.push('<tbody>')
        i += 2
        while (i < lines.length && /^\|(.+)\|$/.test(lines[i].trim())) {
          const cells = lines[i].trim().slice(1, -1).split('|').map(c => c.trim())
          out.push('<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>')
          i += 1
        }
        out.push('</tbody></table>')
        continue
      }
      out.push(line)
      i += 1
    }
    return out.join('\n')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br />')
  }
  
  return (
    <div className="mt-4">
      {debug && (
        <button className="btn btn-primary mb-3" onClick={handleInitial} disabled={loading}>
          Submit Prompt
        </button>
      )}
      {loading && (
        <div className="mb-2 d-flex align-items-center">
          <div className="spinner-border spinner-border-sm me-2" role="status" />
          <span>{timer}s</span>
        </div>
      )}
      <div className="mb-3" style={{ maxHeight: '600px', overflowY: 'auto' }}>
        {messages.map((m, idx) => (
          <div key={idx} className="mb-2">
            <strong>{m.role === 'assistant' ? 'AI:' : 'You:'}</strong>{' '}
            {m.role === 'assistant' ? (
              <span dangerouslySetInnerHTML={{ __html: m.content }} />
            ) : (
              m.content
            )}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="input-group">
        <input
          className="form-control"
          placeholder="Type your message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={loading}
        />
        <button className="btn btn-secondary" type="submit" disabled={loading}>Send</button>
      </form>
    </div>
  )
}

export default Chat
