export default function ConcernFlags({ flags }) {
  if (!flags || flags.length === 0) return null;
  const safety = flags.filter((f) => f.severity === 'safety');
  const others = flags.filter((f) => f.severity !== 'safety');
  return (
    <div className="space-y-2">
      {safety.map((f, i) => (
        <div key={`s${i}`} className="bg-rose-50 border-l-4 border-rose-500 p-3 rounded">
          <div className="flex items-start gap-2">
            <span className="text-rose-600 font-bold">⚠ Safety</span>
            <div className="text-sm text-slate-700 flex-1">
              <p>{f.description}</p>
              <p className="text-xs text-slate-500 mt-1">Mentioned in {f.frequency} review(s) — IDs: {f.review_ids.join(', ')}</p>
            </div>
          </div>
        </div>
      ))}
      {others.map((f, i) => (
        <div key={`o${i}`} className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded text-sm text-slate-700">
          <span className="font-semibold capitalize">{f.severity}: </span>{f.description}
          <span className="text-xs text-slate-500 block mt-1">×{f.frequency} (IDs: {f.review_ids.join(', ')})</span>
        </div>
      ))}
    </div>
  );
}
