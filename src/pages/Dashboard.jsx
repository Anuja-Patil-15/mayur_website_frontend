import { Fragment, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { fmtNum, fmtPct } from '../scoring.js';
import { Metric } from './NewSession.jsx';

const CATS = [['a', 'Correct', '#2e9e6b'], ['b', 'Retrieval', '#e0a526'], ['c', 'Concept', '#d6453d'], ['d', 'New', '#2457d6'], ['e', 'Confused', '#8a6fd1']];

function Trend({ sessions }) {
  const pts = [...sessions].reverse().slice(-20); // oldest -> newest
  if (pts.length < 2) return <p className="muted small">Save at least two sessions to see your trend.</p>;
  const W = 640, H = 170, P = 28;
  const x = (i) => P + (i * (W - 2 * P)) / (pts.length - 1);
  const y = (v) => H - P - (v / 100) * (H - 2 * P);
  const line = (key) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p[key])}`).join(' ');
  return (
    <div className="scroll-x">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Learning score and conceptual clarity over time" className="trend">
        {[0, 50, 100].map((g) => (<g key={g}><line x1={P} x2={W - P} y1={y(g)} y2={y(g)} className="grid-line" /><text x={4} y={y(g) + 4} className="axis">{g}</text></g>))}
        <path d={line('learningScore')} className="l1" fill="none" />
        <path d={line('conceptualClarity')} className="l2" fill="none" />
        {pts.map((p, i) => <circle key={p.id} cx={x(i)} cy={y(p.learningScore)} r="3" className="d1"><title>{p.sessionDate}: learning {p.learningScore.toFixed(1)}%</title></circle>)}
      </svg>
      <p className="small muted legend"><span className="sw s1" /> Learning score <span className="sw s2" /> Conceptual clarity (last {pts.length} sessions)</p>
    </div>
  );
}

function downloadCsv(rows) {
  const keys = ['sessionDate', 'subject', 'total', 'timeMinutes', 'a', 'b', 'c', 'd', 'e', 'learningScore', 'conceptualClarity', 'previouslyLearned', 'retrievalReliability', 'mcqsPerHour', 'priority1', 'priority2', 'priority3', 'reassessmentDate', 'mistakesReviewed'];
  const q = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const csv = [keys.map(q).join(','), ...rows.map((r) => keys.map((k) => q(typeof r[k] === 'number' && !Number.isInteger(r[k]) ? r[k].toFixed(1) : r[k])).join(','))].join('\r\n');
  const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: 'mcq-history.csv' });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Dashboard() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filter, setFilter] = useState({ subject: '', from: '', to: '' });
  const [open, setOpen] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (f) => {
    try {
      const [s, sm] = await Promise.all([api.sessions(f), api.summary()]);
      setSessions(s.sessions); setSummary(sm); setError('');
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(filter); }, [load, filter]);

  async function remove(id) {
    if (!window.confirm('Delete this session permanently?')) return;
    await api.deleteSession(id); load(filter);
  }
  async function toggleReviewed(s) { await api.setReviewed(s.id, !s.mistakesReviewed); load(filter); }

  const t = summary?.totals;
  const today = new Date().toISOString().slice(0, 10);
  const due = sessions.filter((s) => !s.mistakesReviewed && s.reassessmentDate && s.reassessmentDate <= today);

  if (loading) return <p className="muted center-pad">Loading your dashboard…</p>;

  return (
    <>
      <h1>Welcome back, {user.name.split(' ')[0]}</h1>
      {error && <p className="error" role="alert">{error}</p>}

      {!t?.sessions ? (
        <section className="card center">
          <h2>No sessions yet</h2>
          <p className="muted">Log your first MCQ session to start building your history.</p>
          <Link className="btn primary" to="/new">Add your first session</Link>
        </section>
      ) : (
        <>
          <div className="metrics">
            <Metric label="Sessions logged" value={t.sessions} />
            <Metric label="MCQs solved" value={t.totalMcqs} />
            <Metric label="Avg learning score" value={fmtPct(t.avgLearning)} />
            <Metric label="Avg conceptual clarity" value={fmtPct(t.avgClarity)} bar={t.avgClarity} />
            <Metric label="Avg MCQs per hour" value={t.totalMinutes ? fmtNum((t.totalMcqs * 60) / t.totalMinutes) : '—'} />
            <Metric label="Hours practised" value={fmtNum(t.totalMinutes / 60)} />
          </div>

          <section className="card">
            <h2>Where your questions went</h2>
            <div className="stack" role="img" aria-label="Share of questions by category">
              {CATS.map(([k, , c]) => t['total' + k.toUpperCase()] > 0 && <div key={k} style={{ flex: t['total' + k.toUpperCase()], background: c }} />)}
            </div>
            <p className="small legend">
              {CATS.map(([k, name, c]) => <span key={k}><span className="sw" style={{ background: c }} /> {name} {t['total' + k.toUpperCase()]} </span>)}
            </p>
          </section>

          <section className="card"><h2>Progress</h2><Trend sessions={sessions} /></section>

          {due.length > 0 && (
            <section className="card">
              <h2>Due for revision ({due.length})</h2>
              {due.slice(0, 5).map((s) => (
                <p key={s.id} className="small"><strong>{s.subject || 'Untitled'}</strong> — {[s.priority1, s.priority2, s.priority3].filter(Boolean).join(', ') || 'no topics noted'} (reassess {s.reassessmentDate})</p>
              ))}
            </section>
          )}

          {summary.bySubject.length > 1 && (
            <section className="card">
              <h2>Subjects, weakest first</h2>
              {summary.bySubject.map((r) => (
                <div className="row2" key={r.subject}>
                  <span>{r.subject || 'Untitled'} <span className="small muted">({r.sessions} sessions, {r.totalMcqs} MCQs)</span></span>
                  <strong>{fmtPct(r.avgClarity)}</strong>
                </div>
              ))}
            </section>
          )}
        </>
      )}

      <section className="card">
        <div className="head-row"><h2>History</h2>
          <div className="actions"><Link className="btn primary" to="/new">New session</Link>
            <button disabled={!sessions.length} onClick={() => downloadCsv(sessions)}>Export CSV</button></div></div>
        <div className="grid filters">
          <div><label htmlFor="fs">Subject</label><input id="fs" value={filter.subject} onChange={(e) => setFilter({ ...filter, subject: e.target.value })} placeholder="Search subject" /></div>
          <div><label htmlFor="ff">From</label><input id="ff" type="date" value={filter.from} onChange={(e) => setFilter({ ...filter, from: e.target.value })} /></div>
          <div><label htmlFor="ft">To</label><input id="ft" type="date" value={filter.to} onChange={(e) => setFilter({ ...filter, to: e.target.value })} /></div>
        </div>
        {sessions.length === 0 ? <p className="muted">No sessions match these filters.</p> : (
          <div className="scroll-x">
            <table>
              <thead><tr><th>Date</th><th>Subject</th><th>MCQs</th><th>Learning</th><th>Clarity</th><th>Reviewed</th><th /></tr></thead>
              <tbody>
                {sessions.map((s) => (
                  <Fragment key={s.id}>
                    <tr>
                      <td>{s.sessionDate}</td><td>{s.subject || '—'}</td><td>{s.total}</td>
                      <td>{fmtPct(s.learningScore)}</td><td>{fmtPct(s.conceptualClarity)}</td>
                      <td><input type="checkbox" aria-label="Mistakes reviewed" checked={s.mistakesReviewed} onChange={() => toggleReviewed(s)} style={{ width: 'auto' }} /></td>
                      <td className="nowrap"><button className="sm" onClick={() => setOpen(open === s.id ? null : s.id)}>{open === s.id ? 'Hide' : 'Details'}</button>{' '}
                        <button className="sm danger" onClick={() => remove(s.id)}>Delete</button></td>
                    </tr>
                    {open === s.id && (
                      <tr className="detail"><td colSpan="7">
                        <p className="small"><strong>Breakdown:</strong> A {s.a} · B {s.b} · C {s.c} · D {s.d} · E {s.e} &nbsp; <strong>Time:</strong> {s.timeMinutes} min &nbsp; <strong>Speed:</strong> {fmtNum(s.mcqsPerHour)}/hour</p>
                        <p className="small"><strong>Previously learned:</strong> {fmtPct(s.previouslyLearned)} &nbsp; <strong>Retrieval reliability:</strong> {fmtPct(s.retrievalReliability)}</p>
                        <p className="small"><strong>Priorities:</strong> {[s.priority1, s.priority2, s.priority3].filter(Boolean).join(', ') || '—'} &nbsp; <strong>Reassess:</strong> {s.reassessmentDate || '—'}</p>
                      </td></tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
