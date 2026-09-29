import React from 'react';

export default function StatusBadge({ status, text }) {
  const label = text || status;

  let colorClasses = 'bg-slate-800 text-slate-300 border-slate-700';

  switch (status) {
    case 'ACTIVE':
    case 'ROUND1_ACTIVE':
    case 'ROUND2_ACTIVE':
    case 'ROUND3_ACTIVE':
    case 'QUALIFIED':
    case 'ROUND1_QUALIFIED':
    case 'ROUND2_QUALIFIED':
    case 'COMPLETED':
      colorClasses = 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 glow-emerald';
      break;
    case 'SCHEDULED':
    case 'READY':
    case 'SUBMITTED':
      colorClasses = 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40 glow-cyan';
      break;
    case 'PENDING':
    case 'TERMS_PENDING':
    case 'ROUND1_EVALUATION':
    case 'ROUND2_EVALUATION':
    case 'FINAL_EVALUATION':
    case 'PAUSED':
      colorClasses = 'bg-amber-950/80 text-amber-300 border-amber-500/40';
      break;
    case 'NOT_QUALIFIED':
    case 'ROUND1_NOT_QUALIFIED':
    case 'ROUND2_NOT_QUALIFIED':
    case 'DISQUALIFIED':
      colorClasses = 'bg-rose-950/80 text-rose-300 border-rose-500/40';
      break;
    case 'CLOSED':
    case 'DRAFT':
      colorClasses = 'bg-slate-900 text-slate-400 border-slate-800';
      break;
    default:
      break;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border transition-all ${colorClasses}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      {label}
    </span>
  );
}
