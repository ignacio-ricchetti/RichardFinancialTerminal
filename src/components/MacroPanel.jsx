import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchAll } from '../services/api';

// ── Formatters ──────────────────────────────────────────────────
const fmt = {
  ars:    (v) => v == null ? '—' : new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(v),
  usd:    (v) => v == null ? '—' : new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v),
  pct:    (v) => v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`,
  change: (v) => v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}`,
};

const colorOf = (v) => {
  if (v == null) return '';
  return v > 0 ? 'pos' : v < 0 ? 'neg' : 'neutral';
};

const DOLAR_TYPES = [
  { key: 'blue',            label: 'BLUE',    accent: '#00FF41' },
  { key: 'oficial',         label: 'OFICIAL', accent: '#00BFFF' },
  { key: 'bolsa',           label: 'MEP',     accent: '#FFB300' },
  { key: 'contadoconliqui', label: 'CCL',     accent: '#FF8C00' },
  { key: 'tarjeta',         label: 'TARJETA', accent: '#CC44FF' },
];

const USA_CHARTS = [
  { symbol: 'SP:SPX',     label: 'S&P 500',   color: '#00FF41' },
  { symbol: 'NASDAQ:NDX', label: 'NASDAQ 100', color: '#00BFFF' },
  { symbol: 'DJ:DJI',     label: 'DOW JONES', color: '#FFB300' },
];

// ── Merge helper — mantiene último valor conocido por sección ──
function mergeWithCache(prev, next) {
  if (!prev) return next;
  return {
    dolares:  next.dolares  ?? prev.dolares,
    merval:   next.merval   ?? prev.merval,
    acciones: next.acciones ?? prev.acciones,
    macro: {
      reservas:   next.macro?.reservas   ?? prev.macro?.reservas,
      tasa:       next.macro?.tasa       ?? prev.macro?.tasa,
      riesgoPais: next.macro?.riesgoPais ?? prev.macro?.riesgoPais,
      inflacion:  next.macro?.inflacion  ?? prev.macro?.inflacion,
    },
    // si la sección vino con error pero teníamos datos, marcamos como "anterior"
    _stale: {
      dolares:  !next.dolares  && !!prev.dolares,
      merval:   !next.merval   && !!prev.merval,
      acciones: !next.acciones && !!prev.acciones,
      macro:    !next.macro    && !!prev.macro,
    },
    errors: next.errors,
  };
}

// ── TradingView Mini Chart (embed oficial, sin paquete npm) ────

function TradingViewMiniChart({ symbol, color }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';

    const widget = document.createElement('div');
    ref.current.appendChild(widget);

    const script = document.createElement('script');
    script.type  = 'text/javascript';
    script.src   =
      'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol,
      width:                   '100%',
      height:                  '100%',
      locale:                  'en',
      dateRange:               '1D',
      colorTheme:              'dark',
      trendLineColor:          color,
      underLineColor:          color.replace(')', ', 0.06)').replace('rgb', 'rgba'),
      underLineBottomColor:    'rgba(0,0,0,0)',
      isTransparent:           true,
      autosize:                true,
      largeChartUrl:           '',
    });
    ref.current.appendChild(script);

    return () => {
      if (ref.current) ref.current.innerHTML = '';
    };
  }, [symbol, color]);

  return (
    <div
      ref={ref}
      className="tradingview-widget-container"
      style={{ height: '100%', minHeight: 0 }}
    />
  );
}

// ── Sub-components ─────────────────────────────────────────────

function SectionHeader({ title, badge, stale }) {
  return (
    <div className="section-header">
      <span className="section-title">{title}</span>
      {badge && <span className="section-badge">{badge}</span>}
      {stale && <span className="section-stale">ANT.</span>}
      <div className="section-line" />
    </div>
  );
}

function DolarCard({ type, data, stale }) {
  if (!data) {
    return (
      <div className="dolar-card error-card">
        <div className="dolar-label" style={{ color: type.accent }}>{type.label}</div>
        <div className="dolar-main dim">—</div>
        <div className="dolar-sub dim">SIN DATOS</div>
      </div>
    );
  }

  const spread = data.venta && data.compra ? (data.venta - data.compra).toFixed(0) : null;

  return (
    <div className={`dolar-card${stale ? ' stale' : ''}`}>
      <div className="dolar-label" style={{ color: type.accent }}>
        {type.label}
        {stale && <span className="stale-badge">ANT</span>}
      </div>
      <div className="dolar-main">
        <span className="dolar-peso">$</span>
        {fmt.ars(data.venta)}
      </div>
      <div className="dolar-row">
        <span className="dim">COMPRA</span>
        <span>${fmt.ars(data.compra)}</span>
      </div>
      <div className="dolar-row">
        <span className="dim">SPREAD</span>
        <span>{spread ? `$${spread}` : '—'}</span>
      </div>
      {data.fechaActualizacion && (
        <div className="dolar-time dim">
          {new Date(data.fechaActualizacion).toLocaleTimeString('es-AR', {
            hour: '2-digit', minute: '2-digit',
            timeZone: 'America/Argentina/Buenos_Aires',
          })}
        </div>
      )}
    </div>
  );
}

function MervalBox({ data, stale }) {
  if (!data) {
    return (
      <div className="merval-box error-box">
        <div className="merval-label">S&P MERVAL</div>
        <div className="merval-value dim">—</div>
        <div className="dim small">BYMA sin respuesta</div>
      </div>
    );
  }

  return (
    <div className={`merval-box${stale ? ' stale' : ''}`}>
      <div className="merval-label">
        S&P MERVAL
        {stale && <span className="stale-badge">ANT</span>}
      </div>
      <div className={`merval-value ${colorOf(data.change)}`}>
        {fmt.ars(data.price)}
      </div>
      <div className={`merval-change ${colorOf(data.change)}`}>
        {fmt.change(data.change)} &nbsp;({fmt.pct(data.changePct)})
      </div>
      <div className="merval-state dim small">BYMA · ARS · 20 min delay</div>
    </div>
  );
}

function StocksTable({ acciones, stale }) {
  if (!acciones?.length) return <div className="dim small">Sin datos</div>;

  return (
    <table className="stocks-table">
      <thead>
        <tr>
          <th>TICKER</th>
          <th className="right">PRECIO</th>
          <th className="right">CAMBIO</th>
          <th className="right">VAR %</th>
        </tr>
      </thead>
      <tbody>
        {acciones.map(({ symbol, data, error }) => (
          <tr key={symbol} className={error && !data ? 'row-error' : ''}>
            <td className="ticker-cell">{symbol}</td>
            {data ? (
              <>
                <td className="right">${fmt.ars(data.price)}</td>
                <td className={`right ${colorOf(data.change)}`}>
                  {fmt.change(data.change)}
                </td>
                <td className={`right ${colorOf(data.changePct)}`}>
                  {fmt.pct(data.changePct)}
                </td>
              </>
            ) : (
              <td colSpan={3} className="right dim small">{error ?? 'N/D'}</td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MacroCard({ label, value, unit, sub, color, stale }) {
  return (
    <div className={`macro-card${stale ? ' stale' : ''}`}>
      <div className="macro-card-label">
        {label}
        {stale && <span className="stale-badge">ANT</span>}
      </div>
      <div className="macro-card-value" style={{ color: color ?? 'inherit' }}>
        {value ?? <span className="dim">—</span>}
        {value && unit && <span className="macro-card-unit"> {unit}</span>}
      </div>
      {sub && <div className="macro-card-sub dim">{sub}</div>}
    </div>
  );
}

function TickerTape({ dolares, merval }) {
  const items = [];

  if (merval) {
    const c = merval.change >= 0 ? '#00FF41' : '#FF3131';
    items.push(
      <span key="merval" className="ticker-item">
        <span className="ticker-sym">MERVAL</span>
        <span style={{ color: c }}>{fmt.ars(merval.price)}</span>
        <span style={{ color: c }}>{fmt.pct(merval.changePct)}</span>
      </span>
    );
  }

  if (dolares) {
    for (const { key, label } of DOLAR_TYPES) {
      const d = dolares[key];
      if (d?.venta) {
        items.push(
          <span key={key} className="ticker-item">
            <span className="ticker-sym">USD {label}</span>
            <span>${fmt.ars(d.venta)}</span>
          </span>
        );
      }
    }
  }

  if (!items.length) return null;

  // Duplicamos para loop continuo sin salto
  const doubled = [
    ...items,
    ...items.map(el => <span key={el.key + '_2'}>{el.props.children}</span>),
  ];

  return (
    <div className="ticker-wrap">
      <div className="ticker-track">{doubled}</div>
    </div>
  );
}

// ── Main Panel ─────────────────────────────────────────────────

const REFRESH_INTERVAL = 30_000;

export default function MacroPanel() {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [countdown,  setCountdown]  = useState(REFRESH_INTERVAL / 1000);

  const intervalRef  = useRef(null);
  const countdownRef = useRef(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const result = await fetchAll();
      // Merge con datos anteriores — sección sin respuesta conserva último valor
      setData(prev => mergeWithCache(prev, result));
      setLastUpdate(new Date());
      setCountdown(REFRESH_INTERVAL / 1000);
    } catch {
      // Error total de red — no tocamos el estado existente
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(false);
    intervalRef.current  = setInterval(() => load(true), REFRESH_INTERVAL);
    countdownRef.current = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    return () => {
      clearInterval(intervalRef.current);
      clearInterval(countdownRef.current);
    };
  }, [load]);

  if (loading) {
    return (
      <div className="panel-loading">
        <div className="loading-spinner" />
        <div className="loading-text">CONECTANDO CON MERCADOS...</div>
        <div className="loading-sub dim">BYMA · BCRA · dolarapi.com · INDEC</div>
      </div>
    );
  }

  const { dolares, merval, acciones, macro, _stale } = data ?? {};

  return (
    <div className="macro-panel">

      {/* ── Ticker tape ── */}
      <TickerTape dolares={dolares} merval={merval} />

      {/* ── Status bar ── */}
      <div className="status-bar">
        <span className={`status-dot ${refreshing ? 'pulse' : 'live'}`} />
        <span className="dim small">{refreshing ? 'ACTUALIZANDO...' : 'EN VIVO'}</span>
        {lastUpdate && (
          <span className="dim small">
            &nbsp;· ACT. {lastUpdate.toLocaleTimeString('es-AR', {
              hour: '2-digit', minute: '2-digit', second: '2-digit',
              timeZone: 'America/Argentina/Buenos_Aires',
            })}
          </span>
        )}
        <span className="dim small">&nbsp;· PRÓX. {countdown}s</span>
        <span className="status-source dim small">
          dolarapi.com · BYMA Open Data · BCRA · INDEC · TradingView
        </span>
      </div>

      {/* ── Sección 1: Tipos de cambio ── */}
      <section className="panel-section">
        <SectionHeader title="TIPOS DE CAMBIO" badge="USD/ARS" stale={_stale?.dolares} />
        <div className="dolar-grid">
          {DOLAR_TYPES.map(type => (
            <DolarCard
              key={type.key}
              type={type}
              data={dolares?.[type.key] ?? null}
              stale={_stale?.dolares}
            />
          ))}
        </div>
      </section>

      {/* ── Sección 2: Mercados ARG + USA ── */}
      <section className="panel-section markets-row">

        {/* Left: Argentina */}
        <div className="arg-market">
          <SectionHeader title="MERCADO ARGENTINO" badge="BYMA" stale={_stale?.merval} />
          <MervalBox data={merval} stale={_stale?.merval} />
          <div className="stocks-title dim small">— ACCIONES LÍDERES —</div>
          <StocksTable acciones={acciones} stale={_stale?.acciones} />
        </div>

        {/* Right: USA — TradingView widgets */}
        <div className="usa-market">
          <SectionHeader title="MERCADOS GLOBALES" badge="NYSE · NASDAQ" />
          <div className="tv-charts-grid">
            {USA_CHARTS.map(({ symbol, label, color }) => (
              <div key={symbol} className="tv-chart-card">
                <div className="tv-chart-label" style={{ color }}>
                  {label}
                  <span className="tv-badge dim">TradingView</span>
                </div>
                <div className="tv-chart-body">
                  <TradingViewMiniChart symbol={symbol} color={color} />
                </div>
              </div>
            ))}
          </div>
        </div>

      </section>

      {/* ── Sección 3: Indicadores Macro ── */}
      <section className="panel-section">
        <SectionHeader
          title="INDICADORES MACROECONÓMICOS"
          badge="ARG"
          stale={_stale?.macro}
        />
        <div className="macro-indicators-grid">

          <MacroCard
            label="INFLACIÓN MENSUAL"
            value={macro?.inflacion ? fmt.pct(macro.inflacion.valor).replace('+', '') : null}
            sub={macro?.inflacion ? `IPC INDEC — ${macro.inflacion.fecha}` : 'INDEC'}
            color="#FF3131"
            stale={_stale?.macro && !macro?.inflacion}
          />

          <MacroCard
            label="TASA BCRA"
            value={macro?.tasa ? macro.tasa.valor.toFixed(2) : null}
            unit="% TNA"
            sub={macro?.tasa ? `${macro.tasa.desc?.substring(0, 28) ?? 'Política Monetaria'} — ${macro.tasa.fecha}` : 'BCRA'}
            color="#FFB300"
            stale={_stale?.macro && !macro?.tasa}
          />

          <MacroCard
            label="RIESGO PAÍS"
            value={macro?.riesgoPais ? fmt.ars(macro.riesgoPais.valor) : null}
            unit="bps"
            sub={macro?.riesgoPais
              ? `EMBI+ ARG — ${macro.riesgoPais.fecha}`
              : 'estadisticasbcra.com · requiere token'}
            color="#FF8C00"
            stale={_stale?.macro && !macro?.riesgoPais}
          />

          <MacroCard
            label="RESERVAS BCRA"
            value={macro?.reservas
              ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(macro.reservas.valor)
              : null}
            unit="M USD"
            sub={macro?.reservas ? `BCRA — ${macro.reservas.fecha}` : 'BCRA'}
            color="#00BFFF"
            stale={_stale?.macro && !macro?.reservas}
          />

        </div>
      </section>

    </div>
  );
}
