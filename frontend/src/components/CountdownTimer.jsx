import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export default function CountdownTimer({ targetDate, onExpire }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, isExpired: false });

  useEffect(() => {
    const calculateTime = () => {
      const difference = new Date(targetDate) - new Date();
      if (difference <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isExpired: true });
        if (onExpire) onExpire();
        return;
      }

      const hours = Math.floor((difference / (1000 * 60 * 60)));
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft({ hours, minutes, seconds, isExpired: false });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [targetDate, onExpire]);

  if (timeLeft.isExpired) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-950/50 border border-rose-800/50 text-rose-300 font-mono text-sm font-semibold">
        <Clock className="w-4 h-4 text-rose-400" />
        <span>TIME EXPIRED</span>
      </div>
    );
  }

  const pad = (num) => String(num).padStart(2, '0');

  return (
    <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-slate-900/90 border border-indigo-500/30 text-indigo-200 font-mono font-bold text-base shadow-inner">
      <Clock className="w-4 h-4 text-indigo-400 animate-spin-slow" />
      <span>
        {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
      </span>
      <span className="text-xs text-indigo-400 font-sans uppercase font-medium ml-1">Remaining</span>
    </div>
  );
}
