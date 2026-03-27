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
  const date = now.toLocaleDateString('es-AR', { ...opts, weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = now.toLocaleTimeString('es-AR', { ...opts, hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="header-clock">
      <span className="clock-time">{time}</span>
      <span className="clock-date">{date} ART</span>
    </div>
  );
}

function BCBAStatus() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function calc() {
      const now = new Date();
      const artH = (now.getUTCHours() - 3 + 24) % 24;
      const artM = now.getUTCMinutes();
      const artTime = artH * 60 + artM;
      const day = (now.getUTCDay() + (now.getUTCHours() < 3 ? 6 : 0)) % 7;
      const isWeekday = day >= 1 && day <= 5;
      setOpen(isWeekday && artTime >= 660 && artTime < 1020);
    }
    calc();
    const t = setInterval(calc, 60_000);
    return () => clearInterval(t);
  }, []);

  return (
    <span className={`mkt-badge ${open ? 'open' : 'closed'}`}>
      BCBA {open ? 'ABIERTO' : 'CERRADO'}
    </span>
  );
}

export default function App() {
  const [activePanel, setActivePanel] = useState('macro');

  return (
    <div className="terminal">

      {/* ── Header ── */}
      <header className="terminal-header">
        <div className="header-brand">
          <span className="brand-logo">RFT</span>
          <span className="brand-sep">|</span>
          <span className="brand-sub">RICHARD FINANCIAL TERMINAL</span>
        </div>

        <div className="header-center">
          <div className="badge-live">
            <span className="badge-live-dot" />
            EN VIVO
          </div>
          <BCBAStatus />
        </div>

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
