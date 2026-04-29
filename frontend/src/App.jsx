import { useEffect, useState } from 'react';
import VerdictCard from './components/VerdictCard.jsx';
import ArabicCard from './components/ArabicCard.jsx';

const API = 'http://localhost:8000';

export default function App() {
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState('');
  const [verdict, setVerdict] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reviewCount, setReviewCount] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/products`)
      .then((r) => r.json())
      .then((d) => {
        setProducts(d);
        if (d[0]) setSelected(d[0].product_id);
      })
      .catch(() => setError('Failed to reach backend at localhost:8000'));
  }, []);

  useEffect(() => {
    if (!selected) return;
    fetch(`${API}/api/products/${selected}/reviews`).then((r) => r.json()).then((d) => setReviewCount(d.review_count));
  }, [selected]);

  async function generate() {
    if (!selected) return;
    setLoading(true);
    setError('');
    setVerdict(null);
    try {
      const dataset = await fetch(`${API}/api/products/${selected}/reviews`).then((r) => r.json());
      const resp = await fetch(`${API}/api/verdict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_name: dataset.product_name, reviews: dataset.reviews }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(`HTTP ${resp.status}: ${JSON.stringify(err).slice(0, 200)}`);
      }
      setVerdict(await resp.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">MomVoice</h1>
            <p className="text-sm text-slate-500">Bilingual review intelligence for Mumzworld</p>
          </div>
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">Track A · AI Engineering</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 grid md:grid-cols-[280px,1fr] gap-6">
        <aside className="bg-white rounded-2xl shadow-md p-5 h-fit border border-slate-200">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Choose a product</h2>
          <select
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
            value={selected}
            onChange={(e) => { setSelected(e.target.value); setVerdict(null); }}
          >
            {products.map((p) => (
              <option key={p.product_id} value={p.product_id}>{p.product_name}</option>
            ))}
          </select>
          {reviewCount != null && (
            <p className="text-xs text-slate-500 mt-2">{reviewCount} raw reviews available</p>
          )}
          <button
            onClick={generate}
            disabled={loading || !selected}
            className="mt-4 w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition"
          >
            {loading ? 'Synthesizing…' : 'Generate Verdict'}
          </button>
          {error && <p className="text-xs text-rose-600 mt-3">{error}</p>}
          <div className="mt-6 pt-4 border-t border-slate-200 text-xs text-slate-500 leading-relaxed">
            <p className="font-semibold text-slate-700 mb-1">How it works</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Extract signals (Llama 3.3)</li>
              <li>EN synthesis (Llama 3.3)</li>
              <li>Native AR (Qwen 2.5)</li>
              <li>Pydantic validate</li>
            </ol>
          </div>
        </aside>

        <section className="space-y-6">
          {!verdict && !loading && (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-400">
              Select a product and click <strong>Generate Verdict</strong>.
            </div>
          )}
          {loading && (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
              Reading reviews and synthesizing… (~6–10 seconds)
            </div>
          )}
          {verdict && (
            <>
              <VerdictCard verdict={verdict} />
              <ArabicCard verdict={verdict} />
            </>
          )}
        </section>
      </main>

      <footer className="text-center text-xs text-slate-400 py-6">
        Synthetic data · OpenRouter free tier · No customer reviews scraped from Mumzworld
      </footer>
    </div>
  );
}
