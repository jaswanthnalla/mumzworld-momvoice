import ConfidenceBar from './ConfidenceBar.jsx';

export default function ArabicCard({ verdict }) {
  return (
    <div dir="rtl" className="bg-white rounded-2xl shadow-md p-6 border border-slate-200 relative">
      <span className="absolute top-4 left-4 text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">AR</span>
      <div className="mb-3">
        <span className="text-xs font-semibold text-slate-500 tracking-widest uppercase">حكم الأمهات</span>
      </div>

      {!verdict.verdict_is_reliable && (
        <div className="bg-amber-100 border border-amber-300 text-amber-900 p-3 rounded-lg mb-4 text-sm">
          <strong>⚠ الحكم غير موثوق.</strong> {verdict.unreliable_reason}
        </div>
      )}

      <h2 className="text-2xl font-bold text-slate-900 leading-snug mb-3">{verdict.headline_ar}</h2>
      <ConfidenceBar value={verdict.overall_confidence} />

      <p className="text-slate-700 leading-relaxed mt-4 mb-4">{verdict.summary_ar}</p>

      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
        <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">الأنسب لـ</span>
        <p className="text-slate-800 mt-1">{verdict.best_for_ar}</p>
      </div>
    </div>
  );
}
