import React, { useEffect, useMemo, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  ArrowRight, Check, ChevronDown, CreditCard, Edit3, FileText, Home,
  LogIn, Menu, MoreHorizontal, Plus, Search, Settings, Sparkles, Target,
  Trash2, TrendingUp, Wallet, X,
} from 'lucide-react';
import { api } from './api';
import './styles.css';

const categories = ['Food & dining', 'Transport', 'Entertainment', 'Bills', 'Health', 'Shopping', 'Other'];
const colors = ['#14b8a6', '#6366f1', '#f59e0b', '#f97316', '#ec4899', '#8b5cf6', '#94a3b8'];
const categoryColors = Object.fromEntries(categories.map((category, index) => [category, colors[index]]));

function formatCurrency(value, digits = 2) {
  return `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

function localDateValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'BG';
}

function Logo() {
  return <div className="logo"><img className="logo-mark-image" src="/bachat-guru-logo-mark.png" alt="" /><span>Bachat <b>Guru</b></span></div>;
}

function Landing({ onAuth }) {
  return <div className="landing">
    <nav className="landing-nav">
      <Logo />
      <div className="nav-links"><a href="#features">Features</a><a href="#features">How it works</a></div>
      <button className="btn btn-ghost" onClick={() => onAuth('login')}><LogIn size={16} /> Log in</button>
    </nav>
    <main className="hero">
      <div className="hero-copy">
        <div className="eyebrow"><span className="pulse"></span> Your smarter money companion</div>
        <h1>Feel good about<br /><em>every rupee.</em></h1>
        <p>See where your money goes, build better habits, and make room for what matters. Bachat Guru keeps your finances clear and calm.</p>
        <div className="hero-actions">
          <button className="btn btn-primary btn-lg" onClick={() => onAuth('register')}>Get started free <ArrowRight size={18} /></button>
          <a className="text-link" href="#features">Explore features <ArrowRight size={15} /></a>
        </div>
        <div className="trust"><span>Private, personal expense tracking—no bank connection required.</span></div>
      </div>
      <div className="hero-art">
        <div className="art-orbit orbit-one"></div><div className="art-orbit orbit-two"></div>
        <div className="money-card">
          <div className="mc-top"><span>A clearer view of your money</span><MoreHorizontal size={18} /></div>
          <strong>₹ —</strong><small>Your spending, in one place</small>
          <div className="mini-chart"><svg viewBox="0 0 320 100" preserveAspectRatio="none"><defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#14b8a6" stopOpacity=".3" /><stop offset="1" stopColor="#14b8a6" stopOpacity="0" /></linearGradient></defs><path d="M0 76 C32 65 42 78 62 55 S95 68 113 49 S145 62 166 37 S195 52 213 34 S249 44 270 20 S303 35 320 7 V100 H0Z" fill="url(#fill)" /><path d="M0 76 C32 65 42 78 62 55 S95 68 113 49 S145 62 166 37 S195 52 213 34 S249 44 270 20 S303 35 320 7" fill="none" stroke="#14b8a6" strokeWidth="3" /></svg></div>
          <div className="mc-footer"><span><i className="dot teal"></i>Simple</span><span><i className="dot indigo"></i>Personal</span></div>
        </div>
        <div className="float-note"><span className="check-circle"><Check size={14} /></span><div><b>Small steps add up</b><small>Track one purchase at a time</small></div></div>
        <div className="float-goal"><Target size={18} /><div><small>Your money stays yours</small><b>Private by default</b><div className="progress"><span></span></div></div></div>
      </div>
    </main>
    <section id="features" className="feature-strip">
      <div><span className="feature-icon teal-bg"><TrendingUp size={20} /></span><b>Understand your spending</b><p>Simple insights without the spreadsheet headache.</p></div>
      <div><span className="feature-icon indigo-bg"><Target size={20} /></span><b>Make goals feel possible</b><p>Turn good intentions into small, steady wins.</p></div>
      <div><span className="feature-icon orange-bg"><Wallet size={20} /></span><b>Stay one step ahead</b><p>Know your money before it surprises you.</p></div>
    </section>
  </div>;
}

function AuthPage({ initialMode, onBack, onSuccess }) {
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await api(mode === 'register' ? '/auth/register' : '/auth/login', {
        method: 'POST',
        body: mode === 'register' ? { name, email, password } : { email, password },
      });
      await onSuccess(result.user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return <div className="login-page">
    <div className="login-side"><Logo /><div className="login-quote"><span>“</span><h2>Small steps today.<br />More freedom tomorrow.</h2><p>Bachat Guru helps you make confident decisions with your money, every day.</p></div><div className="login-side-footer">© 2026 Bachat Guru <span>•</span> Built for better habits</div></div>
    <div className="login-panel">
      <button className="back-btn" onClick={onBack}>← Back to home</button>
      <div className="login-form-wrap">
        <div className="mobile-logo"><Logo /></div>
        <span className="eyebrow">{mode === 'register' ? 'GET STARTED' : 'WELCOME BACK'}</span>
        <h1>{mode === 'register' ? 'Create your account' : 'Log in to your account'}</h1>
        <p className="muted">{mode === 'register' ? 'Your finances, in one private place.' : 'Pick up right where you left off.'}</p>
        <form onSubmit={submit}>
          {mode === 'register' && <label>Your name<input required maxLength="80" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" autoComplete="name" /></label>}
          <label>Email address<input required type="email" maxLength="254" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" /></label>
          <label>Password<div className="password-wrap"><input required minLength={mode === 'register' ? 10 : undefined} type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === 'register' ? 'At least 10 characters' : 'Enter your password'} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button></div></label>
          {error && <div className="error" role="alert">{error}</div>}
          <button className="btn btn-primary login-submit" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Log in'} <ArrowRight size={17} /></button>
        </form>
        <p className="login-help">{mode === 'register' ? 'Already have an account?' : 'New to Bachat Guru?'} <button onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setError(''); }}>{mode === 'register' ? 'Log in' : 'Create an account'}</button></p>
      </div>
    </div>
  </div>;
}

function SummaryCard({ icon, title, value, meta, tone }) {
  return <div className="summary-card"><div className={`summary-icon ${tone}`}>{icon}</div><span className="summary-title">{title}</span><strong>{value}</strong><small>{meta}</small></div>;
}

function ExpenseModal({ item, onClose, onSave }) {
  const [form, setForm] = useState(item || {
    title: '', category: 'Food & dining', amount: '',
    date: localDateValue(), note: '',
  });
  const [error, setError] = useState('');
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      await onSave({ ...form, amount: Number(form.amount) });
    } catch (requestError) {
      setError(requestError.message);
    }
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-head"><div><span className="eyebrow">MONEY MOVEMENT</span><h2 id="modal-title">{item ? 'Edit expense' : 'Add an expense'}</h2></div><button className="icon-btn" onClick={onClose} aria-label="Close"><X size={19} /></button></div>
      <form onSubmit={submit}>
        <div className="form-grid">
          <label>What was it?<input required maxLength="100" value={form.title} onChange={(event) => change('title', event.target.value)} placeholder="e.g. Lunch with friends" /></label>
          <label>Amount<input required min="0.01" max="1000000000" step="0.01" type="number" value={form.amount} onChange={(event) => change('amount', event.target.value)} placeholder="0.00" /></label>
          <label>Category<select value={form.category} onChange={(event) => change('category', event.target.value)}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
          <label>Date<input required type="date" value={form.date} onChange={(event) => change('date', event.target.value)} /></label>
        </div>
        <label>Note <span className="optional">(optional)</span><textarea maxLength="500" value={form.note} onChange={(event) => change('note', event.target.value)} placeholder="Add a little context..." rows="3" /></label>
        {error && <div className="error" role="alert">{error}</div>}
        <div className="modal-actions"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary"><Check size={16} />{item ? 'Save changes' : 'Add expense'}</button></div>
      </form>
    </div>
  </div>;
}

function GoalModal({ item, onClose, onSave }) {
  const [form, setForm] = useState(item || { title: '', targetAmount: '', currentAmount: 0, targetDate: '' });
  const [error, setError] = useState('');
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      await onSave({ ...form, targetAmount: Number(form.targetAmount), currentAmount: Number(form.currentAmount || 0), targetDate: form.targetDate || null });
    } catch (requestError) {
      setError(requestError.message);
    }
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="goal-modal-title">
      <div className="modal-head"><div><span className="eyebrow">SAVINGS PLAN</span><h2 id="goal-modal-title">{item ? 'Edit goal' : 'Create a goal'}</h2></div><button className="icon-btn" onClick={onClose} aria-label="Close"><X size={19} /></button></div>
      <form onSubmit={submit}>
        <label>What are you saving for?<input required maxLength="80" value={form.title} onChange={(event) => change('title', event.target.value)} placeholder="e.g. Emergency fund" /></label>
        <div className="form-grid">
          <label>Target amount<input required min="0.01" max="1000000000" step="0.01" type="number" value={form.targetAmount} onChange={(event) => change('targetAmount', event.target.value)} /></label>
          <label>Already saved<input required min="0" step="0.01" type="number" value={form.currentAmount} onChange={(event) => change('currentAmount', event.target.value)} /></label>
        </div>
        <label>Target date <span className="optional">(optional)</span><input type="date" value={form.targetDate || ''} onChange={(event) => change('targetDate', event.target.value)} /></label>
        {error && <div className="error" role="alert">{error}</div>}
        <div className="modal-actions"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary"><Check size={16} />{item ? 'Save changes' : 'Create goal'}</button></div>
      </form>
    </div>
  </div>;
}

function ExpenseTable({ expenses, setModal, remove }) {
  return <div className="table-wrap"><table><thead><tr><th>Expense</th><th>Category</th><th>Date</th><th>Amount</th><th></th></tr></thead>
    <tbody>{expenses.length ? expenses.map((expense) => <tr key={expense.id}>
      <td><div className="expense-name"><span className={`expense-badge b-${expense.category.split(' ')[0].toLowerCase()}`}>{expense.category.slice(0, 1)}</span><div><b>{expense.title}</b><small>{expense.note || 'No note added'}</small></div></div></td>
      <td><span className="category-pill">{expense.category}</span></td>
      <td>{new Date(`${expense.date}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
      <td><b className="amount">− {formatCurrency(expense.amount)}</b></td>
      <td><div className="row-actions"><button onClick={() => setModal(expense)} aria-label={`Edit ${expense.title}`}><Edit3 size={15} /></button><button onClick={() => remove(expense.id)} aria-label={`Delete ${expense.title}`}><Trash2 size={15} /></button></div></td>
    </tr>) : <tr><td colSpan="5" className="empty-cell">No expenses match your filters.</td></tr>}</tbody>
  </table></div>;
}

function Recent({ expenses, query, setQuery, setModal, remove, onViewAll }) {
  return <section className="panel recent-panel">
    <div className="panel-head"><div><h2>Recent expenses</h2><p className="muted">Your latest money movements</p></div>
      <div className="table-actions"><div className="search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search expenses" /></div><button className="more-link" onClick={onViewAll}>View all <ArrowRight size={14} /></button></div>
    </div>
    <ExpenseTable expenses={expenses.slice(0, 5)} setModal={setModal} remove={remove} />
  </section>;
}

function Overview({ expenses, summary, summaryMonths, onPeriodChange, query, setQuery, setModal, remove, onViewAll }) {
  const monthLabel = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const monthlyData = summary?.monthly || [];
  const byCategory = (summary?.categories || []).map((item) => ({ ...item, color: categoryColors[item.name] }));
  const total = summary?.totals?.spent || 0;
  const topCategory = byCategory[0]?.name || 'No spending yet';
  return <>
    <div className="welcome-row"><div><span className="eyebrow">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}</span><h1>Good day, {summary?.userName || 'there'} <span>✦</span></h1><p className="muted">Here’s your financial snapshot for {monthLabel}.</p></div><button className="btn btn-primary" onClick={() => setModal('new')}><Plus size={18} /> Add expense</button></div>
    <div className="summary-grid">
      <SummaryCard icon={<Wallet size={19} />} title="Spent this month" value={formatCurrency(total)} meta={monthLabel} tone="teal" />
      <SummaryCard icon={<CreditCard size={19} />} title="Transactions" value={String(summary?.totals?.count || 0)} meta={`${monthLabel}`} tone="indigo" />
      <SummaryCard icon={<TrendingUp size={19} />} title="Average expense" value={formatCurrency(summary?.totals?.average || 0)} meta="Per transaction this month" tone="orange" />
      <SummaryCard icon={<Target size={19} />} title="Top category" value={topCategory} meta={byCategory.length ? formatCurrency(byCategory[0].value) : 'Add an expense to begin'} tone="pink" />
    </div>
    <div className="dashboard-grid">
      <section className="panel spending-panel"><div className="panel-head"><div><h2>Spending overview</h2><p className="muted">Your recorded monthly spend</p></div><select aria-label="Select period" value={summaryMonths} onChange={(event) => onPeriodChange(Number(event.target.value))}><option value="6">Last 6 months</option><option value={new Date().getMonth() + 1}>This year</option></select></div>
        <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={monthlyData}><defs><linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity={.2} /><stop offset="100%" stopColor="#6366f1" stopOpacity={0} /></linearGradient></defs><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(value) => `₹${value / 1000}k`} width={42} /><Tooltip formatter={(value) => [formatCurrency(value, 0), 'Spent']} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px #0f172a14' }} /><Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} fill="url(#areaFill)" /></AreaChart></ResponsiveContainer></div>
      </section>
      <section className="panel breakdown-panel"><div className="panel-head"><div><h2>Where it goes</h2><p className="muted">{monthLabel}</p></div><button className="more-link" onClick={onViewAll}>Details <ArrowRight size={14} /></button></div>
        <div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={byCategory.length ? byCategory : [{ name: 'No expenses', value: 1, color: '#e2e8f0' }]} innerRadius={58} outerRadius={82} paddingAngle={3} dataKey="value" stroke="none">{(byCategory.length ? byCategory : [{ color: '#e2e8f0' }]).map((item, index) => <Cell key={index} fill={item.color} />)}</Pie><Tooltip formatter={(value) => formatCurrency(value)} /></PieChart></ResponsiveContainer><div className="donut-center"><b>{formatCurrency(total, 0)}</b><small>this month</small></div></div>
        <div className="legend">{byCategory.slice(0, 4).map((item) => <div key={item.name}><span><i style={{ background: item.color }}></i>{item.name}</span><b>{formatCurrency(item.value, 0)}</b></div>)}</div>
      </section>
    </div>
    <Recent expenses={expenses} query={query} setQuery={setQuery} setModal={setModal} remove={remove} onViewAll={onViewAll} />
  </>;
}

function ExpensesView({ expenses, query, setQuery, category, setCategory, period, setPeriod, setModal, remove }) {
  const filtered = useMemo(() => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, '0')}`;
    return expenses.filter((expense) => {
      const matchesQuery = `${expense.title} ${expense.category} ${expense.note}`.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = category === 'All categories' || expense.category === category;
      const matchesPeriod = period === 'All time' || expense.date.startsWith(period === 'This month' ? thisMonth : lastMonth);
      return matchesQuery && matchesCategory && matchesPeriod;
    });
  }, [expenses, query, category, period]);
  return <>
    <div className="welcome-row"><div><span className="eyebrow">TRANSACTIONS</span><h1>All expenses</h1><p className="muted">Keep every purchase in one clear place.</p></div><button className="btn btn-primary" onClick={() => setModal('new')}><Plus size={18} /> Add expense</button></div>
    <section className="panel recent-panel full-table"><div className="panel-head"><div><h2>{filtered.length} {filtered.length === 1 ? 'transaction' : 'transactions'}</h2></div><div className="table-actions"><div className="search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search expenses" /></div><select aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)}><option>All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select><select aria-label="Filter by month" value={period} onChange={(event) => setPeriod(event.target.value)}><option>All time</option><option>This month</option><option>Last month</option></select></div></div><ExpenseTable expenses={filtered} setModal={setModal} remove={remove} /></section>
  </>;
}

function Reports({ summary, onExport }) {
  const categoriesForMonth = (summary?.categories || []).map((item) => ({ ...item, color: categoryColors[item.name] }));
  const topCategory = categoriesForMonth[0];
  return <>
    <div className="welcome-row"><div><span className="eyebrow">INSIGHTS</span><h1>Your reports</h1><p className="muted">Patterns based on the expenses you’ve recorded.</p></div><button className="btn btn-ghost" onClick={onExport}><FileText size={17} /> Export expenses</button></div>
    <div className="reports-grid"><section className="panel report-card"><h2>Category comparison</h2><p className="muted">Spending by category this month</p><div className="report-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={categoriesForMonth}><XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} /><Tooltip formatter={(value) => formatCurrency(value)} /><Bar dataKey="value" fill="#14b8a6" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div></section>
      <section className="panel insight-card"><div className="insight-icon"><Sparkles size={21} /></div><span className="eyebrow">A LITTLE INSIGHT</span><h2>{topCategory ? `${topCategory.name} is your biggest category` : 'Your report is ready when you are'}</h2><p>{topCategory ? `${formatCurrency(topCategory.value)} recorded in this category this month.` : 'Add expenses to see a useful, up-to-date category comparison.'}</p></section>
    </div>
  </>;
}

function GoalsView({ goals, setModal, onDelete, onContribute }) {
  const [contributions, setContributions] = useState({});
  return <>
    <div className="welcome-row"><div><span className="eyebrow">SAVINGS PLANS</span><h1>Your goals</h1><p className="muted">Set a target and make progress visible.</p></div><button className="btn btn-primary" onClick={() => setModal('new')}><Plus size={18} /> Create a goal</button></div>
    {goals.length ? <div className="goals-grid">{goals.map((goal) => {
      const percent = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
      return <section className="panel goal-card" key={goal.id}><div className="goal-card-head"><span className="empty-icon"><Target size={22} /></span><div className="goal-actions"><button aria-label={`Edit ${goal.title}`} onClick={() => setModal(goal)}><Edit3 size={15} /></button><button aria-label={`Delete ${goal.title}`} onClick={() => onDelete(goal)}><Trash2 size={15} /></button></div></div><h2>{goal.title}</h2><p className="muted">{formatCurrency(goal.currentAmount)} saved of {formatCurrency(goal.targetAmount)}</p><div className="goal-progress"><span style={{ width: `${percent}%` }} /></div><div className="goal-progress-label"><span>{percent}% complete</span><span>{goal.targetDate ? `Target ${new Date(`${goal.targetDate}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'No target date'}</span></div><form className="contribute-form" onSubmit={(event) => { event.preventDefault(); const amount = Number(contributions[goal.id]); if (amount > 0) onContribute(goal, amount); setContributions((current) => ({ ...current, [goal.id]: '' })); }}><input aria-label={`Amount to add to ${goal.title}`} type="number" min="0.01" step="0.01" max={Math.max(0, goal.targetAmount - goal.currentAmount)} value={contributions[goal.id] || ''} onChange={(event) => setContributions((current) => ({ ...current, [goal.id]: event.target.value }))} placeholder="Add savings" /><button className="btn btn-ghost" type="submit" disabled={goal.currentAmount >= goal.targetAmount}>Add</button></form></section>;
    })}</div> : <EmptyView icon={<Target />} title="Start a savings goal" copy="Choose something to save for and track your progress here." action="Create a goal" onAction={() => setModal('new')} />}
  </>;
}

function SettingsView({ user, onSave }) {
  const [name, setName] = useState(user.name);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setBusy(true); setMessage(''); setError('');
    try {
      await onSave(name.trim());
      setMessage('Your profile was updated.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }
  return <><div className="welcome-row"><div><span className="eyebrow">YOUR ACCOUNT</span><h1>Settings</h1><p className="muted">Manage your personal profile.</p></div></div><section className="panel settings-panel"><h2>Profile details</h2><p className="muted">Your account information is private to you.</p><form onSubmit={submit}><label>Display name<input required maxLength="80" value={name} onChange={(event) => setName(event.target.value)} /></label><label>Email address<input type="email" value={user.email} readOnly /></label>{error && <div className="error" role="alert">{error}</div>}{message && <div className="success-message" role="status">{message}</div>}<button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button></form></section></>;
}

function EmptyView({ icon, title, copy, action, onAction }) {
  return <div className="empty-view"><div className="empty-icon">{icon}</div><h1>{title}</h1><p>{copy}</p>{action && <button className="btn btn-primary" onClick={onAction}><Plus size={17} />{action}</button>}</div>;
}

function Dashboard({ user, onLogout, onUserChange, initialNotice }) {
  const [view, setView] = useState('Overview');
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [summaryMonths, setSummaryMonths] = useState(6);
  const [goals, setGoals] = useState([]);
  const [modal, setModal] = useState(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All categories');
  const [period, setPeriod] = useState('All time');
  const [menu, setMenu] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(initialNotice || '');

  async function refreshExpenses() {
    const result = await api('/expenses');
    setExpenses(result.expenses);
  }
  async function refreshSummary(months = summaryMonths) {
    const result = await api(`/reports/summary?months=${months}`);
    setSummary(result);
  }
  async function refreshGoals() {
    const result = await api('/goals');
    setGoals(result.goals);
  }

  useEffect(() => {
    Promise.all([refreshExpenses(), refreshSummary(), refreshGoals()])
      .catch((error) => setNotice(error.message))
      .finally(() => setLoading(false));
  }, []);

  async function saveExpense(expense) {
    const isExisting = Number.isInteger(expense.id);
    const result = await api(isExisting ? `/expenses/${expense.id}` : '/expenses', {
      method: isExisting ? 'PATCH' : 'POST',
      body: expense,
    });
    setExpenses((current) => isExisting
      ? current.map((item) => item.id === result.expense.id ? result.expense : item)
      : [result.expense, ...current]);
    await refreshSummary();
    setModal(null);
    setNotice('');
  }

  async function removeExpense(id) {
    const expense = expenses.find((item) => item.id === id);
    if (!expense || !window.confirm(`Delete "${expense.title}"? This cannot be undone.`)) return;
    try {
      await api(`/expenses/${id}`, { method: 'DELETE' });
      setExpenses((current) => current.filter((item) => item.id !== id));
      await refreshSummary();
      setNotice('');
    } catch (error) { setNotice(error.message); }
  }

  async function saveGoal(goal) {
    const isExisting = Number.isInteger(goal.id);
    const result = await api(isExisting ? `/goals/${goal.id}` : '/goals', { method: isExisting ? 'PATCH' : 'POST', body: goal });
    setGoals((current) => isExisting
      ? current.map((item) => item.id === result.goal.id ? result.goal : item)
      : [result.goal, ...current]);
    setModal(null);
    setNotice('');
  }

  async function deleteGoal(goal) {
    if (!window.confirm(`Delete the "${goal.title}" goal? This cannot be undone.`)) return;
    try {
      await api(`/goals/${goal.id}`, { method: 'DELETE' });
      setGoals((current) => current.filter((item) => item.id !== goal.id));
      setNotice('');
    } catch (error) { setNotice(error.message); }
  }

  async function contribute(goal, amount) {
    const nextAmount = Math.min(goal.targetAmount, Math.round((goal.currentAmount + amount) * 100) / 100);
    try {
      const result = await api(`/goals/${goal.id}`, {
        method: 'PATCH',
        body: { ...goal, currentAmount: nextAmount },
      });
      setGoals((current) => current.map((item) => item.id === goal.id ? result.goal : item));
      setNotice('');
    } catch (error) { setNotice(error.message); }
  }

  async function exportReport() {
    try {
      const response = await fetch('/api/reports/export.csv');
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Could not export your report.');
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = 'bachat-guru-expenses.csv';
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setNotice('');
    } catch (error) { setNotice(error.message); }
  }

  const nav = [['Overview', Home], ['Expenses', Wallet], ['Reports', PieChart]];
  const overviewExpenses = useMemo(() => {
    const term = query.trim().toLowerCase();
    return expenses.filter((expense) => !term || `${expense.title} ${expense.category} ${expense.note}`.toLowerCase().includes(term));
  }, [expenses, query]);

  if (loading) return <div className="app-loading"><Logo /><p>Loading your private workspace…</p></div>;

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
      <div className="side-top"><Logo /><button className="close-nav" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X size={18} /></button></div>
      <div className="workspace"><span className="workspace-avatar">{initials(user.name).slice(0, 1)}</span><div><b>{user.name}’s workspace</b><small>Personal finances</small></div><ChevronDown size={15} /></div>
      <nav className="side-nav">{nav.map(([name, Icon]) => <button key={name} className={view === name ? 'active' : ''} onClick={() => { setView(name); setMobileNav(false); }}><Icon size={18} />{name}</button>)}<div className="nav-label">MANAGE</div><button onClick={() => { setView('Goals'); setMobileNav(false); }} className={view === 'Goals' ? 'active' : ''}><Target size={18} />Goals</button><button onClick={() => { setView('Settings'); setMobileNav(false); }} className={view === 'Settings' ? 'active' : ''}><Settings size={18} />Settings</button></nav>
      <div className="sidebar-bottom"><div className="tip"><Sparkles size={17} /><b>Pro tip</b><p>Review your expenses every Sunday to stay on track.</p></div><button className="profile" onClick={() => setMenu(!menu)}><span className="profile-avatar">{initials(user.name)}</span><div><b>{user.name}</b><small>Personal account</small></div><MoreHorizontal size={17} /></button></div>
    </aside>
    {mobileNav && <div className="nav-overlay" onClick={() => setMobileNav(false)}></div>}
    <main className="main-content">
      <header className="topbar"><button className="mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu /></button><div className="breadcrumb"><span>Workspace</span><b>/</b><strong>{view}</strong></div><div className="top-actions"><div className="top-profile" role="button" tabIndex={0} onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && setMenu(!menu)} onClick={() => setMenu(!menu)}><span className="profile-avatar">{initials(user.name)}</span><ChevronDown size={15} /></div>{menu && <div className="user-menu"><b>{user.email}</b><button onClick={async () => { try { await onLogout(); } catch (error) { setNotice(error.message); } }}>Log out</button></div>}</div></header>
      <div className="page-content">
        {notice && <div className="notice" role="alert"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss message"><X size={15} /></button></div>}
        {view === 'Overview' && <Overview expenses={overviewExpenses} summary={{ ...summary, userName: user.name }} summaryMonths={summaryMonths} onPeriodChange={async (months) => { setSummaryMonths(months); try { await refreshSummary(months); } catch (error) { setNotice(error.message); } }} query={query} setQuery={setQuery} setModal={setModal} remove={removeExpense} onViewAll={() => setView('Expenses')} />}
        {view === 'Expenses' && <ExpensesView expenses={expenses} query={query} setQuery={setQuery} category={category} setCategory={setCategory} period={period} setPeriod={setPeriod} setModal={setModal} remove={removeExpense} />}
        {view === 'Reports' && <Reports summary={summary} onExport={exportReport} />}
        {view === 'Goals' && <GoalsView goals={goals} setModal={setModal} onDelete={deleteGoal} onContribute={contribute} />}
        {view === 'Settings' && <SettingsView user={user} onSave={async (name) => { const result = await api('/profile', { method: 'PATCH', body: { name } }); onUserChange(result.user); }} />}
      </div>
    </main>
    {modal && view === 'Goals' && <GoalModal item={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSave={saveGoal} />}
    {modal && view !== 'Goals' && <ExpenseModal item={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSave={saveExpense} />}
  </div>;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('loading');
  const [authMode, setAuthMode] = useState('login');
  const [authNotice, setAuthNotice] = useState('');

  useEffect(() => {
    api('/auth/me').then((result) => { setUser(result.user); setPage('dashboard'); })
      .catch((error) => { setPage('landing'); if (error.status !== 401) setAuthNotice(error.message); });
  }, []);

  useEffect(() => {
    const onSessionExpired = () => {
      setUser(null);
      setAuthNotice('Your session has expired. Please sign in again.');
      setPage('landing');
    };
    window.addEventListener('bg:session-expired', onSessionExpired);
    return () => window.removeEventListener('bg:session-expired', onSessionExpired);
  }, []);

  async function acceptLogin(nextUser) {
    let notice = '';
    const stored = localStorage.getItem('bg_expenses');
    if (stored) {
      try {
        const legacyExpenses = JSON.parse(stored);
        if (Array.isArray(legacyExpenses) && legacyExpenses.length) {
          const shouldImport = window.confirm(
            `This browser has ${legacyExpenses.length} expenses from the earlier Bachat Guru prototype. Import them into ${nextUser.email}? The browser copy is kept unless the import succeeds.`,
          );
          if (shouldImport) {
            await api('/expenses/import', { method: 'POST', body: { expenses: legacyExpenses } });
            localStorage.removeItem('bg_expenses');
          } else {
            notice = 'Your earlier browser expenses were left unchanged and can be imported the next time you sign in.';
          }
        }
      } catch (error) {
        notice = error.status === 409
          ? 'The browser copy was not imported because this account already has expenses. The browser data is unchanged.'
          : `Some expenses saved in this browser were not imported: ${error.message}`;
      }
    }
    setAuthNotice('');
    setUser(nextUser);
    setAuthNotice(notice);
    setPage('dashboard');
  }

  async function logout() {
    await api('/auth/logout', { method: 'POST' });
    setUser(null);
    setAuthNotice('');
    setPage('landing');
  }

  if (page === 'loading') return <div className="app-loading"><Logo /><p>Checking your secure session…</p></div>;
  if (page === 'landing') return <>{authNotice && <div className="auth-notice" role="alert">{authNotice}</div>}<Landing onAuth={(mode) => { setAuthMode(mode); setPage('auth'); }} /></>;
  if (page === 'auth') return <AuthPage initialMode={authMode} onBack={() => setPage('landing')} onSuccess={acceptLogin} />;
  return <Dashboard key={user.id} user={user} onLogout={logout} onUserChange={setUser} initialNotice={authNotice} />;
}
