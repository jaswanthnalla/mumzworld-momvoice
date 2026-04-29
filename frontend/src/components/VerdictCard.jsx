import ConfidenceBar from './ConfidenceBar.jsx';
import ConcernFlags from './ConcernFlags.jsx';

export default function VerdictCard({ verdict }) {
  return (
    <div className="bg-white rounded-2xl shadow-md p-6 border border-slate-200">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-500 tracking-widest uppercase">Moms Verdict — EN</span>
        <span className="text-xs text-slate-400">{verdict.review_count} reviews</span>
      </div>

      {!verdict.verdict_is_reliable && (
        <div className="bg-amber-100 border border-amber-300 text-amber-900 p-3 rounded-lg mb-4 text-sm">
          <strong>⚠ Verdict not reliable.</strong> {verdict.unreliable_reason}
        </div>
      )}

      <h2 className="text-2xl font-bold text-slate-900 leading-snug mb-3">{verdict.headline_en}</h2>
      <ConfidenceBar value={verdict.overall_confidence} />
      <p className="text-xs text-slate-500 mt-1 mb-4 italic">{verdict.confidence_reason}</p>

      <p className="text-slate-700 leading-relaxed mb-4">{verdict.summary_en}</p>

      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
        <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Best for</span>
        <p className="text-slate-800 mt-1">{verdict.best_for_en}</p>
      </div>

      {verdict.age_suitability?.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {verdict.age_suitability.map((a) => (
            <span key={a} className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full">{a}</span>
          ))}
        </div>
      )}

      <ConcernFlags flags={verdict.concern_flags} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
        <div>
          <h3 className="text-sm font-semibold text-emerald-700 mb-2">✓ Top positives</h3>
          <ul className="space-y-2">
            {verdict.top_positives?.map((p, i) => (
              <li key={i} className="text-sm text-slate-700">
                <span className="font-medium">{p.aspect}</span>
                {p.quote && <span className="block text-slate-500 text-xs italic">"{p.quote}"</span>}
                <span className="text-xs text-slate-400">IDs: {p.supporting_review_ids?.join(', ')}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-rose-700 mb-2">⚠ Top concerns</h3>
          <ul className="space-y-2">
            {verdict.top_concerns?.map((p, i) => (
              <li key={i} className="text-sm text-slate-700">
                <span className="font-medium">{p.aspect}</span>
                {p.quote && <span className="block text-slate-500 text-xs italic">"{p.quote}"</span>}
                <span className="text-xs text-slate-400">IDs: {p.supporting_review_ids?.join(', ')}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {verdict.data_gaps?.length > 0 && (
        <div className="mt-5 pt-4 border-t border-slate-200">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Data gaps</h4>
          <ul className="text-xs text-slate-500 list-disc list-inside space-y-1">
            {verdict.data_gaps.map((g, i) => (<li key={i}>{g}</li>))}
          </ul>
        </div>
      )}
    </div>
  );
}
