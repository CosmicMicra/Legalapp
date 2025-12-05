import React, { useState } from 'react'
import axios from 'axios'
import API_URL from '../api'

function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [signupMode, setSignupMode] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    try {
      await axios.post(`${API_URL}/api/login`, { username, password })
      setError(null)
      if (onLogin) onLogin(true)
    } catch (err) {
      setError('Invalid credentials')
    }
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    try {
      await axios.post(`${API_URL}/api/signup`, { username, password })
      setError(null)
      if (onLogin) onLogin(true)
    } catch (err) {
      const msg = err.response?.data?.error || 'Signup failed'
      setError(msg)
    }
  }

  return (
    <div className="container mt-5" style={{ maxWidth: '400px' }}>
      <h2 className="mb-3">{signupMode ? 'Sign Up' : 'Login'}</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={signupMode ? handleSignup : handleLogin}>
        <div className="mb-3">
          <label className="form-label">Username</label>
          <input
            type="text"
            className="form-control"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Password</label>
          <input
            type="password"
            className="form-control"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary">
          {signupMode ? 'Sign Up' : 'Login'}
        </button>
      </form>
      <button
        type="button"
        className="btn btn-link mt-2"
        onClick={() => {
          setError(null)
          setSignupMode(!signupMode)
        }}
      >
        {signupMode ? 'Have an account? Login' : 'New user? Sign Up'}
      </button>
    </div>
  )
}

export default Login
