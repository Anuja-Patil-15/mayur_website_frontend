import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { adviceFor, computeScores, fmtNum, fmtPct } from '../scoring.js';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const inTwoDays = () => {
  const d = new Date(); d.setDate(d.getDate() + 2);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const CATS = [
  ['a', 'A. Conceptually correct', 'Correct and you can explain why'],
  ['b', 'B. Retrieval failure', "Studied before, but couldn't recall"],
  ['c', 'C. Conceptual error', 'Misunderstood the underlying concept'],
  ['d', 'D. New learning', 'Genuinely unfamiliar information'],
  ['e', 'E. Confusion / decision failure', 'Similar options, uncertain choice, or left unanswered'],
];

export default function NewSession() {
  const navigate = useNavigate();
  const [f, setF] = useState({
    sessionDate: today(), subject: '', total: '', timeMinutes: '',
    a: '0', b: '0', c: '0', d: '0', e: '0',
    priority1: '', priority2: '', priority3: '', reassessmentDate: inTwoDays(), mistakesReviewed: false,
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const n = (v) => (v === '' ? NaN : Number(v));
  const nums = useMemo(() => ({
    total: n(f.total), timeMinutes: f.timeMinutes === '' ? 0 : n(f.timeMinutes),
    a: n(f.a), b: n(f.b), c: n(f.c), d: n(f.d), e: n(f.e),
  }), [f]);
  const sum = nums.a + nums.b + nums.c + nums.d + nums.e;
  const valid = Object.values(nums).every((x) => Number.isInteger(x) && x >= 0) && nums.total >= 1 && sum === nums.total;
  const scores = valid ? computeScores(nums) : null;

  let hint = 'Enter your total and category counts to see results.';
  if (Number.isFinite(sum) && Number.isInteger(nums.total) && sum !== nums.total) hint = `Your category counts add up to ${sum}, but total MCQs is ${nums.total}. Adjust them to match.`;
  if (valid) hint = `All ${nums.total} questions are classified.`;

  async function save(e) {
    e.preventDefault();
    if (!valid) { setError(hint); return; }
    setError(''); setBusy(true);
    try {
      await api.createSession({ ...f, ...nums });
      navigate('/');
    } catch (err) { setError(err.message); setBusy(false); }
  }

  return (
    <form onSubmit={save}>
      <h1>New session</h1>
      <section className="card">
        <h2>Session details</h2>
        <div className="grid">
          <div><label htmlFor="date">Date</label><input id="date" type="date" value={f.sessionDate} onChange={set('sessionDate')} required /></div>
          <div><label htmlFor="subject">Subject / topic</label><input id="subject" placeholder="e.g. Pediatrics — Neonatology" value={f.subject} onChange={set('subject')} /></div>
          <div><label htmlFor="total">Total MCQs solved</label><input id="total" type="number" min="1" step="1" placeholder="e.g. 100" value={f.total} onChange={set('total')} required /></div>
          <div><label htmlFor="time">Time spent (minutes)</label><input id="time" type="number" min="0" step="1" placeholder="e.g. 90" value={f.timeMinutes} onChange={set('timeMinutes')} /></div>
        </div>
      </section>

      <section className="card">
        <h2>Classify every question</h2>
        <p className="small muted">Enter counts so that A + B + C + D + E equals your total MCQs. Choose the main reason for each question.</p>
        {CATS.map(([k, title, desc]) => (
          <div className="row" key={k}>
            <div><strong>{title}</strong><div className="small muted">{desc}</div></div>
            <input aria-label={title} type="number" min="0" step="1" value={f[k]} onChange={set(k)} />
          </div>
        ))}
        <p className={'small ' + (valid ? 'ok' : 'muted')} role="status">{hint}</p>
      </section>

      <section>
        <h2>Your results</h2>
        <div className="metrics">
          <Metric label="Daily learning score" value={scores ? fmtPct(scores.learningScore) : '—'} sub="Weighted score / 100" />
          <Metric label="Conceptual clarity" value={scores ? fmtPct(scores.conceptualClarity) : '—'} bar={scores?.conceptualClarity} />
          <Metric label="Previously learned knowledge" value={scores ? fmtPct(scores.previouslyLearned) : '—'} />
          <Metric label="Retrieval reliability" value={scores ? fmtPct(scores.retrievalReliability) : '—'} />
          <Metric label="MCQs per hour" value={scores ? fmtNum(scores.mcqsPerHour) : '—'} />
          <Metric label="Conceptually correct count" value={valid ? nums.a : '—'} />
        </div>
        <div className="card">
          <h2>Recommended next steps</h2>
          {valid ? adviceFor(nums).map((t) => <p key={t}>{t}</p>) : <p className="muted">Your recommendations will appear once the counts add up.</p>}
        </div>
      </section>

      <section className="card">
        <h2>Revision plan</h2>
        <div className="grid">
          <div><label htmlFor="p1">Priority topic 1</label><input id="p1" placeholder="Most important weak concept" value={f.priority1} onChange={set('priority1')} /></div>
          <div><label htmlFor="p2">Priority topic 2</label><input id="p2" placeholder="Second concept" value={f.priority2} onChange={set('priority2')} /></div>
          <div><label htmlFor="p3">Priority topic 3</label><input id="p3" placeholder="Third concept" value={f.priority3} onChange={set('priority3')} /></div>
          <div><label htmlFor="review">Reassessment date</label><input id="review" type="date" value={f.reassessmentDate} onChange={set('reassessmentDate')} /></div>
          <div><label htmlFor="reviewed">Reviewed today's mistakes?</label>
            <select id="reviewed" value={f.mistakesReviewed ? 'yes' : 'no'} onChange={(e) => setF({ ...f, mistakesReviewed: e.target.value === 'yes' })}>
              <option value="no">No — not yet</option><option value="yes">Yes</option></select></div>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="primary" style={{ marginTop: 14 }} disabled={busy}>{busy ? 'Saving…' : 'Save session'}</button>
      </section>
    </form>
  );
}

export function Metric({ label, value, sub, bar }) {
  return (
    <div className="metric">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub && <div className="small muted">{sub}</div>}
      {bar !== undefined && bar !== null && <div className="bar"><div className="fill" style={{ width: bar + '%' }} /></div>}
    </div>
  );
}
