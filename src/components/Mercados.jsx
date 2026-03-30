import { useState, useEffect } from 'react';
import { MERVAL_TICKERS, COMPANY_NAMES, fetchLeadingEquities } from '../services/mercadosApi';
import AccionDetalle from './AccionDetalle';

// ── Formatters ────────────────────────────────────────────────

function fmt(n) {
  if (n == null) return '--';
  return Number(n).toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtVol(n) {
  if (n == null || isNaN(n)) return '--';
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1)     + 'M';
  if (n >= 1_000)         return (n / 1_000).toFixed(0)         + 'K';
  return Number(n).toLocaleString('es-AR');
}

// ── Stock Card ────────────────────────────────────────────────

function StockCard({ ticker, data, onClick }) {
  const hasData = Boolean(data?.ok);
  const variacion = data?.changePct;
  const isPos = variacion > 0;
  const isNeg = variacion < 0;

  return (
    <button className="mercado-card" onClick={() => onClick(ticker)}>
      <div className="mercado-card-top">
        <span className="mercado-ticker">{ticker}</span>
        {!hasData && <span className="sin-datos-badge">SIN DATOS</span>}
        {hasData && variacion != null && (
          <span className={`mercado-variacion ${isPos ? 'pos-g' : isNeg ? 'neg-r' : 'neutral'}`}>
            {isPos ? '+' : ''}{Number(variacion).toFixed(2)}%
          </span>
        )}
      </div>

      <div className="mercado-empresa">{COMPANY_NAMES[ticker] ?? ticker}</div>

      <div className="mercado-precio">
        {hasData && data.price != null ? `$ ${fmt(data.price)}` : '--'}
      </div>

      <div className="mercado-volumen">
        VOL&nbsp;<span className="mercado-vol-val">
          {hasData ? fmtVol(data.volume) : '--'}
        </span>
      </div>
    </button>
  );
}

// ── Mercados Panel ────────────────────────────────────────────

export default function Mercados() {
  const [equities,   setEquities]   = useState({});
  const [loading,    setLoading]    = useState(true);
  const [selected,   setSelected]   = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await fetchLeadingEquities();
      setEquities(data);
      setLastUpdate(new Date());
      setLoading(false);
    }
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  // Contar cuántas acciones tienen datos
  const withData = MERVAL_TICKERS.filter(t => equities[t]?.ok).length;

  if (selected) {
    return (
      <AccionDetalle
        ticker={selected}
        stockData={equities[selected]}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <div className="mercados-panel">

      {/* ── Header ── */}
      <div className="mercados-header">
        <div className="mercados-title-block">
          <span className="section-eyebrow">PANEL DE</span>
          <h2 className="mercados-title">MERCADOS</h2>
        </div>

        <div className="mercados-meta">
          {loading ? (
            <span className="mkt-updating">
              <span className="mkt-update-dot" />
              Actualizando datos...
            </span>
          ) : (
            <span className="mkt-last-update">
              Últ. actualiz.:&nbsp;
              <strong>{lastUpdate?.toLocaleTimeString('es-AR')}</strong>
              <span className="mkt-delay">&nbsp;· 20 min delay BYMA</span>
            </span>
          )}
          <span className="mkt-count">
            {withData}/{MERVAL_TICKERS.length} con datos
          </span>
        </div>
      </div>

      {/* ── Grid 20 cards ── */}
      <div className="mercados-grid">
        {MERVAL_TICKERS.map(ticker => (
          <StockCard
            key={ticker}
            ticker={ticker}
            data={equities[ticker]}
            onClick={setSelected}
          />
        ))}
      </div>

    </div>
  );
}
