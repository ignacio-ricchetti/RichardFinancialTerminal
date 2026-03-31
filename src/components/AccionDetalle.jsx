import { useState, useEffect } from 'react';
import {
  COMPANY_NAMES,
  fetchMacroParaIA,
  fetchFundamentals,
  fetchStockVariations,
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

// Colores basados en valores crudos de Yahoo Finance
function fundColorClass(key, rawVal) {
  if (rawVal == null) return 'dim';
  switch (key) {
    case 'pe_ratio':     return rawVal < 15 ? 'pos-g' : rawVal > 30 ? 'neg-r' : 'dim';
    case 'ev_ebitda':    return rawVal < 10 ? 'pos-g' : rawVal > 20 ? 'neg-r' : 'dim';
    case 'precio_libro': return rawVal < 2  ? 'pos-g' : rawVal > 5  ? 'neg-r' : 'dim';
    case 'roe':          return rawVal > 0.15 ? 'pos-g' : rawVal < 0.05 ? 'neg-r' : 'dim';
    case 'roa':          return rawVal > 0.05 ? 'pos-g' : rawVal < 0.01 ? 'neg-r' : 'dim';
    case 'margen_neto':  return rawVal > 0.10 ? 'pos-g' : rawVal < 0    ? 'neg-r' : 'dim';
    case 'deuda_ebitda': return rawVal < 2    ? 'pos-g' : rawVal > 4    ? 'neg-r' : 'dim';
    case 'rev_growth':   return rawVal > 0    ? 'pos-g' : rawVal < -0.1 ? 'neg-r' : 'dim';
    default:             return 'dim';
  }
}

const FUND_SECTIONS = [
  {
    title: 'VALUACIÓN',
    items: [
      { key: 'pe_ratio',     label: 'P/E Ratio' },
      { key: 'ev_ebitda',    label: 'EV/EBITDA' },
      { key: 'precio_libro', label: 'Precio / Valor libro' },
    ],
  },
  {
    title: 'RENTABILIDAD',
    items: [
      { key: 'roe',        label: 'ROE' },
      { key: 'roa',        label: 'ROA' },
      { key: 'margen_neto', label: 'Margen neto' },
      { key: 'rev_growth', label: 'Crecimiento ingresos' },
    ],
  },
  {
    title: 'SOLIDEZ FINANCIERA',
    items: [
      { key: 'deuda_ebitda', label: 'Deuda neta / EBITDA' },
      { key: 'cap_mercado',  label: 'Capitalización de mercado' },
    ],
  },
];

function FundamentalesPanel({ ticker, stockData, fundamentals, fundLoading }) {
  const variacion = stockData?.changePct;
  const isPos = variacion > 0;
  const isNeg = variacion < 0;
  const isYahoo = fundamentals?._source === 'yahoo';
  const raw = fundamentals?._raw ?? {};

  const ts = fundamentals?._timestamp
    ? new Date(fundamentals._timestamp).toLocaleDateString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      })
    : new Date().toLocaleDateString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      });

  return (
    <div className="det-panel">
      <div className="det-panel-title">DATOS FUNDAMENTALES</div>

      {/* Precio actual */}
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
        </tbody>
      </table>

      {/* Secciones: Valuación / Rentabilidad / Solidez */}
      {fundLoading ? (
        <div className="fund-loading">Cargando fundamentales…</div>
      ) : (
        FUND_SECTIONS.map(section => (
          <div key={section.title} className="fund-section">
            <div className="fund-section-title">{section.title}</div>
            <table className="fund-table">
              <tbody>
                {section.items.map(({ key, label }) => {
                  const displayVal = fundamentals?.[key] ?? 'N/D';
                  const colorClass = isYahoo
                    ? (displayVal === 'N/D' ? 'dim' : fundColorClass(key, raw[key]))
                    : (displayVal === 'N/D' ? 'dim' : '');
                  return (
                    <tr key={key}>
                      <td className="fund-label">{label}</td>
                      <td className={`fund-val ${colorClass}`}>{displayVal}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))
      )}

      {/* Timestamp */}
      <div className="fund-timestamp">
        Datos: {isYahoo ? 'Yahoo Finance' : 'Datos estáticos'} · Actualizado: {ts}
      </div>
    </div>
  );
}

// ── Panel Rava ────────────────────────────────────────────────

const RAVA_SECTIONS = [
  { label: 'Análisis técnico',     anchor: '#analisis',    desc: 'Indicadores y señales técnicas' },
  { label: 'Noticias',             anchor: '#noticias',    desc: 'Últimas noticias de la empresa' },
  { label: 'Balances y resultados',anchor: '#balances',    desc: 'Estados financieros trimestrales' },
  { label: 'Opinión de analistas', anchor: '#opinion',     desc: 'Recomendaciones del mercado' },
  { label: 'Chat / Foro',          anchor: '#chat',        desc: 'Debate de inversores' },
  { label: 'Cotización histórica', anchor: '#historico',   desc: 'Serie histórica de precios' },
];

function RavaPanel({ ticker }) {
  const baseUrl = `https://www.rava.com/perfil/${ticker}`;

  return (
    <div className="det-panel rava-panel">
      <div className="det-panel-title">
        ANÁLISIS Y OPINIÓN
        <a
          href={baseUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="noticias-fuente-link"
        >
          Rava Bursátil ↗
        </a>
      </div>

      <div className="rava-intro">
        Perfil completo de <strong>{ticker}</strong> en Rava Bursátil —
        análisis técnico, noticias, balances y opiniones de analistas.
      </div>

      <div className="rava-links">
        {RAVA_SECTIONS.map(({ label, anchor, desc }) => (
          <a
            key={anchor}
            href={`${baseUrl}${anchor}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rava-link-item"
          >
            <span className="rava-link-label">{label}</span>
            <span className="rava-link-desc">{desc}</span>
          </a>
        ))}
      </div>

      <div className="rava-cta-row">
        <a
          href={baseUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rava-cta-btn"
        >
          Ver perfil completo en Rava →
        </a>
      </div>

      <div className="fund-timestamp">
        Fuente: Rava Bursátil · rava.com/perfil/{ticker}
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

function IAPanel({ ticker, stockData, macro, fund }) {
  // idle → confirming → loading → done | error
  const [state,   setState]   = useState('idle');
  const [iaText,  setIaText]  = useState('');
  const [iaError, setIaError] = useState('');
  const [iaTs,    setIaTs]    = useState(null);

  async function runAnalysis() {
    setState('loading');
    setIaText('');
    setIaError('');

    const fundamentalsStr = fund
      ? Object.entries(fund)
          .filter(([k]) => !k.startsWith('_'))
          .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
          .join(', ')
      : 'N/D';

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
  const [fundamentals, setFundamentals] = useState(null);
  const [fundLoading,  setFundLoading]  = useState(true);
  const [variations,   setVariations]   = useState(null);

  useEffect(() => {
    fetchMacroParaIA().then(setMacro);
  }, []);

  useEffect(() => {
    setFundLoading(true);
    setFundamentals(null);
    setVariations(null);
    fetchFundamentals(ticker).then(data => {
      setFundamentals(data);
      setFundLoading(false);
    });
    fetchStockVariations(ticker).then(setVariations);
  }, [ticker]);

  const variacion = stockData?.changePct;
  const isPos = variacion > 0;
  const isNeg = variacion < 0;

  function varBadge(val, label) {
    if (val == null) return null;
    const pos = val > 0;
    const neg = val < 0;
    return (
      <span className={`accion-var-badge ${pos ? 'pos-g' : neg ? 'neg-r' : 'neutral'}`}>
        {label}&nbsp;{pos ? '+' : ''}{val.toFixed(1)}%
      </span>
    );
  }

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
          {varBadge(variations?.monthlyChange, '1M')}
          {varBadge(variations?.annualChange,  '1A')}
          {variations?.weekHigh != null && (
            <span className="accion-52w">
              52W&nbsp;
              <span className="pos-g">{fmt(variations.weekHigh)}</span>
              &nbsp;/&nbsp;
              <span className="neg-r">{fmt(variations.weekLow)}</span>
            </span>
          )}
        </div>

        <span className="accion-exchange">BCBA · Yahoo Finance</span>
      </div>

      {/* ── Layout dos columnas ── */}
      <div className="accion-grid">

        {/* Izquierda: gráfico TradingView */}
        <div className="accion-col-chart">
          <TradingViewChart ticker={ticker} />
        </div>

        {/* Derecha: 3 paneles apilados */}
        <div className="accion-col-panels">
          <FundamentalesPanel
            ticker={ticker}
            stockData={stockData}
            fundamentals={fundamentals}
            fundLoading={fundLoading}
          />
          <RavaPanel ticker={ticker} />
          <IAPanel ticker={ticker} stockData={stockData} macro={macro} fund={fundamentals} />
        </div>

      </div>
    </div>
  );
}
