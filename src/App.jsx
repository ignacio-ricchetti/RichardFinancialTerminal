import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import MacroPanel from './components/MacroPanel';
import './index.css';

function LiveClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const opts = { timeZone: 'America/Argentina/Buenos_Aires' };
  const date = now.toLocaleDateString('es-AR', { ...opts, day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = now.toLocaleTimeString('es-AR', { ...opts, hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="header-clock">
      <span className="clock-time">{time}</span>
      <span className="clock-date dim">{date} ART</span>
    </div>
  );
}

function MarketStatus() {
  const [status, setStatus] = useState({ bcba: false, nyse: false });

  useEffect(() => {
    function calc() {
      const now = new Date();
      // ART = UTC-3
      const artH = (now.getUTCHours() - 3 + 24) % 24;
      const artM = now.getUTCMinutes();
      const artTime = artH * 60 + artM;
      const day = (now.getUTCDay() + (now.getUTCHours() < 3 ? -1 + 7 : 0)) % 7; // approximate ART day

      const isWeekday = day >= 1 && day <= 5;
      // BCBA: 11:00 – 17:00 ART (Mon–Fri)
      const bcba = isWeekday && artTime >= 660 && artTime < 1020;
      // NYSE: 9:30 – 16:00 ET = 11:30 – 18:00 ART (summer, UTC-4) approx.
      const nyse = isWeekday && artTime >= 690 && artTime < 1080;

      setStatus({ bcba, nyse });
    }
    calc();
    const t = setInterval(calc, 60_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="market-status-row">
      <span className={`mkt-badge ${status.bcba ? 'open' : 'closed'}`}>
        BCBA {status.bcba ? 'ABIERTO' : 'CERRADO'}
      </span>
      <span className={`mkt-badge ${status.nyse ? 'open' : 'closed'}`}>
        NYSE {status.nyse ? 'OPEN' : 'CLOSED'}
      </span>
    </div>
  );
}

export default function App() {
  const [activePanel, setActivePanel] = useState('macro');

  return (
    <div className="terminal">

      {/* ── Header ── */}
      <header className="terminal-header">
        <div className="header-brand">
          <span className="brand-name">RICHARD</span>
          <span className="brand-sep">|</span>
          <span className="brand-sub">FINANCIAL TERMINAL</span>
        </div>
        <MarketStatus />
        <LiveClock />
      </header>

      {/* ── Body ── */}
      <div className="terminal-body">
        <Sidebar activePanel={activePanel} setActivePanel={setActivePanel} />
        <main className="terminal-main">
          {activePanel === 'macro' && <MacroPanel />}
        </main>
      </div>

    </div>
  );
}
