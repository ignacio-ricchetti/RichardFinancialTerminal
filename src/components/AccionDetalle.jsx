import { useState, useEffect } from 'react';
import {
  COMPANY_NAMES,
  FUNDAMENTALS,
  FUNDAMENTALS_EMPTY,
  fetchMacroParaIA,
} from '../services/mercadosApi';

// ── Helpers ───────────────────────────────────────────────────

function fmt(n) {
  if (n == null) return '--';
  return Number(n).toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ── TradingView iframe ────────────────────────────────────────
// Usa widgetembed para evitar dependencias externas

function TradingViewChart({ ticker }) {
  // Estudios separados por %1F (codificación interna de TradingView)
  const studies = 'RSI%40tv-basicstudies%1FMACD%40tv-basicstudies%1FVolume%40tv-basicstudies';
  const src =
    `https://www.tradingview.com/widgetembed/` +
    `?symbol=BCBA%3A${ticker}` +
    `&interval=D` +
    `&theme=dark` +
    `&style=1` +
    `&locale=es` +
    `&studies=${studies}` +
    `&hide_top_toolbar=0` +
    `&hide_side_toolbar=0` +
    `&allow_symbol_change=0` +
    `&save_image=0`;

  return (
    <div className="tv-container">
      <div className="tv-header">
        <span className="tv-symbol">BCBA:{ticker}</span>
        <span className="tv-timeframe">Diario · RSI · MACD · Volumen</span>
      </div>
      <iframe
        key={ticker}        // remonta el iframe al cambiar ticker
        src={src}
        width="100%"
        height="500"
        frameBorder="0"
        allowTransparency="true"
        scrolling="no"
        allowFullScreen
        title={`Gráfico TradingView ${ticker}`}
      />
    </div>
  );
}

// ── Panel Fundamentales ───────────────────────────────────────

const FUND_LABELS = {
  cap_mercado:  'Capitalización de mercado',
  pe_ratio:     'P/E ratio',
  ev_ebitda:    'EV/EBITDA',
  precio_libro: 'Precio / Valor libro',
  roe:          'ROE',
  roa:          'ROA',
  margen_neto:  'Margen neto',
  deuda_ebitda: 'Deuda neta / EBITDA',
};

function FundamentalesPanel({ ticker, stockData }) {
  const fund = FUNDAMENTALS[ticker] ?? FUNDAMENTALS_EMPTY;
  const variacion = stockData?.changePct;
  const isPos = variacion > 0;
  const isNeg = variacion < 0;

  return (
    <div className="det-panel">
      <div className="det-panel-title">DATOS FUNDAMENTALES</div>
      <table className="fund-table">
        <tbody>
          <tr>
            <td className="fund-label">Precio actual</td>
            <td className="fund-val">
              {stockData?.price != null ? `$ ${fmt(stockData.price)} ARS` : '--'}
              {variacion != null && (
                <span className={`fund-var-badge ${isPos ? 'pos-g' : isNeg ? 'neg-r' : 'neutral'}`}>
                  {isPos ? '+' : ''}{Number(variacion).toFixed(2)}%
                </span>
              )}
            </td>
          </tr>
          {Object.entries(FUND_LABELS).map(([key, label]) => (
            <tr key={key}>
              <td className="fund-label">{label}</td>
              <td className={`fund-val ${fund[key] === 'N/D' ? 'dim' : ''}`}>
                {fund[key]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!FUNDAMENTALS[ticker] && (
        <div className="fund-nd-note">
          Datos fundamentales no disponibles para {ticker}. Próximamente.
        </div>
      )}
    </div>
  );
}

// ── Panel Noticias ────────────────────────────────────────────
// Sin API de noticias disponible (CORS); links directos a búsqueda Ámbito

const NOTICIA_TITULOS = [
  'Análisis y perspectivas bursátiles',
  'Resultados financieros y balances',
  'Novedades corporativas y estrategia',
  'Cobertura de mercado y volumen operado',
  'Contexto sectorial y macro argentina',
];

function NoticiasPanel({ ticker }) {
  const searchUrl = `https://www.ambito.com/buscar?q=${ticker}`;
  const today = new Date().toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  return (
    <div className="det-panel">
      <div className="det-panel-title">
        NOTICIAS
        <a
          href={searchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="noticias-fuente-link"
        >
          Ámbito Financiero ↗
        </a>
      </div>
      <div className="noticias-list">
        {NOTICIA_TITULOS.map((titulo, i) => (
          <a
            key={i}
            href={searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="noticia-item"
          >
            <div className="noticia-titulo">
              {titulo} — {ticker}
            </div>
            <div className="noticia-meta">
              <span className="noticia-fuente">Ámbito Financiero</span>
              <span className="noticia-sep">·</span>
              <span className="noticia-fecha">{today}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

// ── Panel Análisis IA ─────────────────────────────────────────

function recColor(rec) {
  const u = (rec ?? '').toUpperCase();
  if (u.includes('COMPRA'))  return '#22C55E';
  if (u.includes('VENTA'))   return '#EF4444';
  return '#FFB300';
}

function parseIAText(text) {
  return text.split('\n').map(line => {
    const trimmed = line.trim();
    if (!trimmed) return { type: 'spacer' };

    const recMatch = trimmed.match(/^RECOMENDACI[ÓO]N:\s*\[?(.+?)\]?\s*$/i);
    if (recMatch) return { type: 'rec', value: recMatch[1].trim() };

    const isHeader = /^(RESUMEN|CORTO PLAZO|MEDIANO PLAZO|LARGO PLAZO|RIESGOS|CATALIZADORES)[\s(:]/.test(trimmed);
    if (isHeader) return { type: 'header', value: trimmed };

    return { type: 'text', value: trimmed };
  });
}

function IAPanel({ ticker, stockData, macro }) {
  // idle → confirming → loading → done | error
  const [state,   setState]   = useState('idle');
  const [iaText,  setIaText]  = useState('');
  const [iaError, setIaError] = useState('');
  const [iaTs,    setIaTs]    = useState(null);

  async function runAnalysis() {
    setState('loading');
    setIaText('');
    setIaError('');

    const fund = FUNDAMENTALS[ticker] ?? FUNDAMENTALS_EMPTY;
    const fundamentalsStr = Object.entries(fund)
      .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
      .join(', ');

    const precio    = stockData?.price != null ? fmt(stockData.price) : 'N/D';
    const variacion = stockData?.changePct != null
      ? `${stockData.changePct > 0 ? '+' : ''}${Number(stockData.changePct).toFixed(2)}`
      : 'N/D';

    const prompt =
`Analizá la acción ${ticker} de Argentina con estos datos:

DATOS FUNDAMENTALES: ${fundamentalsStr}
PRECIO ACTUAL: ${precio} ARS (${variacion}% hoy)
CONTEXTO MACRO ARG: Dólar blue ${macro.dolarBlue}, Inflación ${macro.inflacion}%, Riesgo país ${macro.riesgoPais}

Respondé en español con este formato exacto:

RECOMENDACIÓN: [COMPRA / MANTENER / VENTA]

RESUMEN: [2 párrafos de análisis]

CORTO PLAZO (1-3 meses): [análisis]
MEDIANO PLAZO (3-12 meses): [análisis]
LARGO PLAZO (1-3 años): [análisis]

RIESGOS: [lista de 3 riesgos principales]
CATALIZADORES: [lista de 3 catalizadores positivos]`;

    try {
      const res = await fetch('/api/anthropic/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key':         import.meta.env.VITE_ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type':      'application/json',
        },
        body: JSON.stringify({
          model:      'claude-opus-4-5',
          max_tokens: 1000,
          messages:   [{ role: 'user', content: prompt }],
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error?.message ?? `HTTP ${res.status}`);
      }

      const data = await res.json();
      const text = data?.content?.[0]?.text ?? '';
      if (!text) throw new Error('La API devolvió una respuesta vacía');

      setIaText(text);
      setIaTs(new Date());
      setState('done');
    } catch (err) {
      setIaError(err.message ?? 'Error desconocido');
      setState('error');
    }
  }

  const parsed = iaText ? parseIAText(iaText) : [];
  const recLine = parsed.find(l => l.type === 'rec');

  return (
    <div className="det-panel ia-panel">
      <div className="det-panel-title">ANÁLISIS IA</div>

      {/* ── Idle ── */}
      {state === 'idle' && (
        <div className="ia-idle">
          <div className="ia-warning">
            ⚠ Este análisis consume créditos de API de Anthropic.
            Asegurate de tener saldo disponible antes de continuar.
          </div>
          <button className="ia-btn" onClick={() => setState('confirming')}>
            🤖 Analizar con IA
          </button>
        </div>
      )}

      {/* ── Confirming ── */}
      {state === 'confirming' && (
        <div className="ia-confirming">
          <div className="ia-confirm-msg">
            ¿Confirmar análisis de <strong>{ticker}</strong> con Claude?
            <br />
            Se consumirán créditos de tu cuenta de Anthropic.
          </div>
          <div className="ia-confirm-btns">
            <button className="ia-btn" onClick={runAnalysis}>
              Confirmar
            </button>
            <button className="ia-btn-cancel" onClick={() => setState('idle')}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Loading ── */}
      {state === 'loading' && (
        <div className="ia-loading">
          <div className="loading-spinner" />
          <div className="ia-loading-text">
            Consultando Claude para {ticker}…
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {state === 'error' && (
        <div className="ia-error">
          <div className="ia-error-msg">Error: {iaError}</div>
          <button className="ia-btn" onClick={() => setState('idle')}>
            Reintentar
          </button>
        </div>
      )}

      {/* ── Done ── */}
      {state === 'done' && (
        <div className="ia-resultado">
          {recLine && (
            <div className="ia-recomendacion" style={{ '--rec-color': recColor(recLine.value) }}>
              <span className="ia-rec-label">RECOMENDACIÓN</span>
              <span className="ia-rec-value" style={{ color: recColor(recLine.value) }}>
                {recLine.value}
              </span>
            </div>
          )}

          <div className="ia-content">
            {parsed.map((item, i) => {
              if (item.type === 'rec')    return null;
              if (item.type === 'spacer') return <div key={i} className="ia-spacer" />;
              if (item.type === 'header') return (
                <div key={i} className="ia-sec-title">{item.value}</div>
              );
              return <div key={i} className="ia-text">{item.value}</div>;
            })}
          </div>

          {iaTs && (
            <div className="ia-timestamp">
              Análisis: {iaTs.toLocaleDateString('es-AR')}{' '}
              {iaTs.toLocaleTimeString('es-AR')} · claude-opus-4-5
            </div>
          )}

          <button
            className="ia-btn-small"
            onClick={() => { setState('idle'); setIaText(''); }}
          >
            Nuevo análisis
          </button>
        </div>
      )}
    </div>
  );
}

// ── AccionDetalle (export principal) ──────────────────────────

export default function AccionDetalle({ ticker, stockData, onBack }) {
  const [macro, setMacro] = useState({
    dolarBlue: 'N/D', inflacion: 'N/D', riesgoPais: 'N/D',
  });

  useEffect(() => {
    fetchMacroParaIA().then(setMacro);
  }, []);

  const variacion = stockData?.changePct;
  const isPos = variacion > 0;
  const isNeg = variacion < 0;

  return (
    <div className="accion-detalle">

      {/* ── Header ── */}
      <div className="accion-header">
        <button className="accion-back-btn" onClick={onBack}>
          ← MERCADOS
        </button>

        <div className="accion-info">
          <span className="accion-ticker">{ticker}</span>
          <span className="accion-name">{COMPANY_NAMES[ticker] ?? ticker}</span>
          {stockData?.price != null && (
            <span className="accion-precio">$ {fmt(stockData.price)} ARS</span>
          )}
          {variacion != null && (
            <span className={`accion-var ${isPos ? 'pos-g' : isNeg ? 'neg-r' : 'neutral'}`}>
              {isPos ? '+' : ''}{Number(variacion).toFixed(2)}%
            </span>
          )}
        </div>

        <span className="accion-exchange">BCBA · 20 min delay</span>
      </div>

      {/* ── Layout dos columnas ── */}
      <div className="accion-grid">

        {/* Izquierda: gráfico TradingView */}
        <div className="accion-col-chart">
          <TradingViewChart ticker={ticker} />
        </div>

        {/* Derecha: 3 paneles apilados */}
        <div className="accion-col-panels">
          <FundamentalesPanel ticker={ticker} stockData={stockData} />
          <NoticiasPanel ticker={ticker} />
          <IAPanel ticker={ticker} stockData={stockData} macro={macro} />
        </div>

      </div>
    </div>
  );
}
