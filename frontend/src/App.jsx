import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowDownWideNarrow,
  Check,
  ChevronDown,
  CircleDot,
  CircleHelp,
  ClipboardList,
  LoaderCircle,
  LogOut,
  Pencil,
  Plus,
  Search,
  Save,
  X,
} from 'lucide-react'

const API_URL = '/api/v1/issues/'
const statuses = ['open', 'in_progress', 'closed']
const priorities = ['low', 'medium', 'high']
const statusNames = { open: 'Open', in_progress: 'In progress', closed: 'Closed' }

async function requestIssues(url, options = {}, token) {
  const headers = new Headers(options.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(url, { ...options, headers })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    const error = new Error(payload.detail || 'Something went wrong. Please try again.')
    error.status = response.status
    throw error
  }
  return response.status === 204 ? null : response.json()
}

function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem('access_token'))
  const [username, setUsername] = useState(() => sessionStorage.getItem('username') || '')
  const [loginError, setLoginError] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [loggingIn, setLoggingIn] = useState(false)
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState('')
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingIssue, setEditingIssue] = useState(null)
  const [saving, setSaving] = useState(false)
  const [busyIssue, setBusyIssue] = useState('')

  function logout() {
    sessionStorage.removeItem('access_token')
    sessionStorage.removeItem('username')
    setToken(null)
    setUsername('')
    setIssues([])
  }

  async function login(event) {
    event.preventDefault()
    setLoggingIn(true)
    setLoginError('')
    const formData = new FormData(event.currentTarget)
    const loginUsername = formData.get('username')
    const password = formData.get('password')
    try {
      if (isRegistering) {
        await requestIssues('/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: loginUsername, password }),
        })
      }
    } catch (error) {
      setLoginError(error.message)
      setLoggingIn(false)
      return
    }
    const body = new URLSearchParams()
    body.set('username', loginUsername)
    body.set('password', password)
    try {
      const result = await requestIssues('/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      })
      sessionStorage.setItem('access_token', result.access_token)
      sessionStorage.setItem('username', loginUsername)
      setUsername(loginUsername)
      setLoading(true)
      setToken(result.access_token)
    } catch (error) {
      setLoginError(error.message)
    } finally {
      setLoggingIn(false)
    }
  }

  async function refreshIssues() {
    setLoadError('')
    try {
      setIssues(await requestIssues(API_URL, {}, token))
    } catch (error) {
      if (error.status === 401) {
        logout()
        return
      }
      setLoadError(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) refreshIssues()
    else setLoading(false)
  }, [token])

  useEffect(() => {
    if (!notice) return undefined
    const timeout = window.setTimeout(() => setNotice(''), 3200)
    return () => window.clearTimeout(timeout)
  }, [notice])

  const counts = useMemo(() => ({
    all: issues.length,
    open: issues.filter((issue) => issue.status === 'open').length,
    in_progress: issues.filter((issue) => issue.status === 'in_progress').length,
    closed: issues.filter((issue) => issue.status === 'closed').length,
  }), [issues])

  const visibleIssues = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return issues.filter((issue) => {
      const matchesFilter = filter === 'all' || issue.status === filter
      const matchesQuery = !normalizedQuery ||
        `${issue.title} ${issue.description}`.toLowerCase().includes(normalizedQuery)
      return matchesFilter && matchesQuery
    })
  }, [filter, issues, query])

  async function updateIssue(issue, changes) {
    setBusyIssue(issue.id)
    try {
      const updated = await requestIssues(`${API_URL}${issue.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      }, token)
      setIssues((current) => current.map((item) => item.id === updated.id ? updated : item))
      setNotice('Issue updated')
    } catch (error) {
      if (error.status === 401) logout()
      setNotice(error.message)
    } finally {
      setBusyIssue('')
    }
  }

  async function deleteIssue(issue) {
    if (!window.confirm(`Delete “${issue.title}”? This cannot be undone.`)) return
    setBusyIssue(issue.id)
    try {
      await requestIssues(`${API_URL}${issue.id}`, { method: 'DELETE' }, token)
      setIssues((current) => current.filter((item) => item.id !== issue.id))
      setNotice('Issue deleted')
    } catch (error) {
      if (error.status === 401) logout()
      setNotice(error.message)
    } finally {
      setBusyIssue('')
    }
  }

  async function saveIssue(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const payload = {
      title: formData.get('title'),
      description: formData.get('description'),
      priority: formData.get('priority'),
    }
    setSaving(true)
    try {
      const saved = await requestIssues(editingIssue ? `${API_URL}${editingIssue.id}` : API_URL, {
        method: editingIssue ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }, token)
      if (editingIssue) {
        setIssues((current) => current.map((item) => item.id === saved.id ? saved : item))
      } else {
        setIssues((current) => [saved, ...current])
        setFilter('all')
        setQuery('')
      }
      setShowForm(false)
      setEditingIssue(null)
      setNotice(editingIssue ? 'Issue updated' : 'Issue created')
    } catch (error) {
      if (error.status === 401) logout()
      setNotice(error.message)
    } finally {
      setSaving(false)
    }
  }

  if (!token) return <LoginScreen
    error={loginError}
    submitting={loggingIn}
    isRegistering={isRegistering}
    onSubmit={login}
    onToggleMode={() => { setIsRegistering((current) => !current); setLoginError('') }}
  />

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="Issue Tracker home">
          <span className="brand-mark"><ClipboardList size={19} strokeWidth={2.2} /></span>
          <span>fieldnotes<span className="brand-period">.</span></span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <button className="workspace-switcher" type="button">
          <span className="workspace-avatar">A</span>
          <span className="workspace-name">Atlas Studio<small>Personal workspace</small></span>
          <ChevronDown size={15} />
        </button>
        <div className="sidebar-section-label">YOUR WORK</div>
        <button className="nav-item active" type="button">
          <ClipboardList size={17} />
          <span>Issues</span>
          <span className="nav-count">{counts.all}</span>
        </button>
        <div className="sidebar-bottom">
          <div className="sidebar-note"><span className="status-light" /> API connected</div>
          <button className="help-link" type="button" onClick={() => setNotice('Issues are saved to your local project data.') }>
            <CircleHelp size={16} /> Help & feedback
          </button>
          <div className="profile-row">
            <div className="profile-avatar">S</div>
            <span>{username}<small>Signed in</small></span>
            <button className="icon-button profile-menu" type="button" aria-label="Sign out" title="Sign out" onClick={logout}><LogOut size={15} /></button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>Issues</strong></div>
          <div className="topbar-right"><span className="sync-indicator"><span /> All changes saved</span><button className="icon-button help-icon" aria-label="Help" type="button" onClick={() => setNotice('Issues are saved to your local project data.')}><CircleHelp size={18} /></button></div>
        </header>

        <section className="content-wrap">
          <div className="page-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> PROJECT OPERATIONS</div>
              <h1>Issues<span className="heading-period">.</span></h1>
              <p className="page-description">Keep the small things from becoming big things.</p>
            </div>
            <button className="primary-button" type="button" onClick={() => { setEditingIssue(null); setShowForm(true) }}><Plus size={17} /> New issue</button>
          </div>

          <div className="summary-grid" aria-label="Issue summary">
            <SummaryItem label="Total issues" value={counts.all} icon={<ClipboardList size={17} />} tone="ink" />
            <SummaryItem label="Open" value={counts.open} icon={<CircleDot size={17} />} tone="coral" />
            <SummaryItem label="In progress" value={counts.in_progress} icon={<ArrowDownWideNarrow size={17} />} tone="blue" />
            <SummaryItem label="Resolved" value={counts.closed} icon={<Check size={17} />} tone="green" />
          </div>

          <section className="issue-panel" aria-label="Issue list">
            <div className="panel-heading">
              <div><h2>Issue log</h2><span className="result-count">{visibleIssues.length} {visibleIssues.length === 1 ? 'record' : 'records'}</span></div>
              <label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search issues" aria-label="Search issues" />{query && <button type="button" className="clear-search" aria-label="Clear search" onClick={() => setQuery('')}><X size={14} /></button>}</label>
            </div>
            <div className="filter-tabs" role="tablist" aria-label="Filter issues by status">
              {[['all', 'All issues'], ...statuses.map((status) => [status, statusNames[status]])].map(([key, label]) => (
                <button key={key} type="button" role="tab" aria-selected={filter === key} className={`filter-tab ${filter === key ? 'selected' : ''}`} onClick={() => setFilter(key)}>{label}<span>{counts[key]}</span></button>
              ))}
            </div>
            <div className="issue-table-wrap">
              <div className="issue-table-head"><span>ISSUE</span><span>PRIORITY</span><span>STATUS</span><span className="actions-heading">ACTIONS</span></div>
              {loading ? (
                <div className="state-message"><LoaderCircle className="spin" size={21} /><span>Loading issues…</span></div>
              ) : loadError ? (
                <div className="state-message error-state"><AlertCircle size={20} /><span>{loadError}</span><button type="button" onClick={() => { setLoading(true); refreshIssues() }}>Try again</button></div>
              ) : visibleIssues.length ? (
                <div className="issue-rows">{visibleIssues.map((issue) => <IssueRow key={issue.id} issue={issue} busy={busyIssue === issue.id} onUpdate={updateIssue} onEdit={(item) => { setEditingIssue(item); setShowForm(true) }} onDelete={deleteIssue} />)}</div>
              ) : (
                <div className="empty-state"><div className="empty-icon"><ClipboardList size={21} /></div><strong>{query ? 'No matching issues' : filter === 'all' ? 'Nothing on the list yet' : `No ${statusNames[filter].toLowerCase()} issues`}</strong><span>{query ? 'Try another search term.' : filter === 'all' ? 'Create an issue to start keeping track.' : 'Issues with this status will show up here.'}</span>{!query && filter === 'all' && <button type="button" className="text-action" onClick={() => setShowForm(true)}><Plus size={15} /> Create an issue</button>}</div>
              )}
            </div>
            <div className="panel-footer"><span><span className="footer-dot" /> Live from your issue store</span><span>ISSUE TRACKER <span className="footer-separator">/</span> V1</span></div>
          </section>
          <footer className="page-footer"><span>Made for moving work forward.</span><span>Atlas Studio <span className="footer-separator">·</span> {new Date().getFullYear()}</span></footer>
        </section>
      </main>

      {notice && <div className="toast" role="status"><Check size={16} />{notice}<button type="button" aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={14} /></button></div>}
      {showForm && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setShowForm(false) }}>
        <section className="issue-modal" role="dialog" aria-modal="true" aria-labelledby="form-title">
          <div className="modal-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> {editingIssue ? 'UPDATE THE LOG' : 'ADD TO THE LOG'}</div><h2 id="form-title">{editingIssue ? 'Edit issue' : 'New issue'}</h2></div><button className="icon-button" type="button" aria-label="Close" onClick={() => { setShowForm(false); setEditingIssue(null) }}><X size={19} /></button></div>
          <form onSubmit={saveIssue} className="issue-form">
            <label>Title<input name="title" minLength="3" maxLength="100" required placeholder="A short, clear summary" defaultValue={editingIssue?.title ?? ''} autoFocus /></label>
            <label>Description<textarea name="description" minLength="5" maxLength="1000" required rows="4" placeholder="What happened, and what should happen instead?" defaultValue={editingIssue?.description ?? ''} /></label>
            <label>Priority<select name="priority" defaultValue={editingIssue?.priority ?? 'medium'}>{priorities.map((priority) => <option key={priority} value={priority}>{priority[0].toUpperCase() + priority.slice(1)}</option>)}</select></label>
            <div className="form-note">{editingIssue ? <>Status: <span className={`status-pill ${editingIssue.status}`}><span /> {statusNames[editingIssue.status]}</span></> : <>New issues start with <span className="status-pill open"><span /> Open</span> status.</>}</div>
            <div className="form-actions"><button type="button" className="secondary-button" onClick={() => { setShowForm(false); setEditingIssue(null) }} disabled={saving}>Cancel</button><button type="submit" className="primary-button" disabled={saving}>{saving ? <LoaderCircle className="spin" size={16} /> : editingIssue ? <Save size={16} /> : <Plus size={16} />}{saving ? 'Saving…' : editingIssue ? 'Save changes' : 'Create issue'}</button></div>
          </form>
        </section>
      </div>}
    </div>
  )
}

function LoginScreen({ error, submitting, isRegistering, onSubmit, onToggleMode }) {
  return (
    <main className="auth-screen">
      <section className="auth-panel" aria-labelledby="login-title">
        <a className="brand auth-brand" href="/" aria-label="Issue Tracker home">
          <span className="brand-mark"><ClipboardList size={19} strokeWidth={2.2} /></span>
          <span>fieldnotes<span className="brand-period">.</span></span>
        </a>
        <div className="eyebrow"><span className="eyebrow-line" /> ISSUE TRACKER</div>
        <h1 id="login-title">{isRegistering ? 'Create account' : 'Welcome back'}<span className="heading-period">.</span></h1>
        <p className="auth-description">{isRegistering ? 'Create an account to start tracking issues.' : 'Sign in to continue to your issue workspace.'}</p>
        <form className="login-form" onSubmit={onSubmit}>
          <label>Username<input name="username" required autoComplete="username" placeholder="Your username" /></label>
          <label>Password<input name="password" type="password" required minLength={isRegistering ? 8 : undefined} maxLength="128" autoComplete={isRegistering ? 'new-password' : 'current-password'} placeholder={isRegistering ? 'At least 8 characters' : 'Your password'} /></label>
          {error && <div className="login-error" role="alert"><AlertCircle size={15} />{error}</div>}
          <button className="primary-button login-submit" type="submit" disabled={submitting}>{submitting ? <LoaderCircle className="spin" size={16} /> : null}{submitting ? (isRegistering ? 'Creating account…' : 'Signing in…') : (isRegistering ? 'Create account' : 'Sign in')}</button>
        </form>
        <button className="auth-toggle" type="button" onClick={onToggleMode}>{isRegistering ? 'Already have an account? Sign in' : 'New here? Create an account'}</button>
        {!isRegistering && <div className="demo-credentials"><span>DEMO ACCOUNT</span><code>johndoe</code><span>/</span><code>secret</code></div>}
      </section>
      <span className="auth-footer">A quieter way to keep work moving.</span>
    </main>
  )
}

function SummaryItem({ label, value, icon, tone }) {
  return <div className="summary-item"><div className={`summary-icon ${tone}`}>{icon}</div><div className="summary-copy"><span>{label}</span><strong>{value}</strong></div><span className="summary-mark" /></div>
}

function IssueRow({ issue, busy, onUpdate, onEdit, onDelete }) {
  return <article className={`issue-row ${busy ? 'row-busy' : ''}`}>
    <div className="issue-main"><span className={`issue-status-dot ${issue.status}`} /><div className="issue-copy"><strong title={issue.title}>{issue.title}</strong><span>{issue.description}</span><small>#{issue.id.slice(0, 8)}</small></div></div>
    <div className="priority-cell"><span className={`priority-label ${issue.priority}`}><span />{issue.priority}</span></div>
    <div className="status-cell"><label className={`status-select ${issue.status}`}><select aria-label={`Status for ${issue.title}`} value={issue.status} disabled={busy} onChange={(event) => onUpdate(issue, { status: event.target.value })}>{statuses.map((status) => <option key={status} value={status}>{statusNames[status]}</option>)}</select><ChevronDown size={13} /></label></div>
    <div className="row-actions"><button className="edit-button" type="button" title="Edit issue" aria-label={`Edit ${issue.title}`} disabled={busy} onClick={() => onEdit(issue)}><Pencil size={14} /></button><button className="delete-button" type="button" title="Delete issue" aria-label={`Delete ${issue.title}`} disabled={busy} onClick={() => onDelete(issue)}><X size={16} /></button></div>
  </article>
}

export default App