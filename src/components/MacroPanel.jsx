import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchAll, GRANOS_REF } from '../services/api';

// ── Formatters ──────────────────────────────────────────────────
const fmt = {
  ars:    (v) => v == null ? '—' : new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(v),
  usd:    (v) => v == null ? '—' : new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v),
  pct:    (v) => v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`,
  pctAbs: (v) => v == null ? '—' : `${Math.abs(v).toFixed(1)}%`,
  change: (v) => v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}`,
};

const colorOf = (v) => {
  if (v == null) return '';
  return v > 0 ? 'pos' : v < 0 ? 'neg' : 'neutral';
};

const DOLAR_TYPES = [
  { key: 'blue',            label: 'BLUE'    },
  { key: 'oficial',         label: 'OFICIAL' },
  { key: 'bolsa',           label: 'MEP'     },
  { key: 'contadoconliqui', label: 'CCL'     },
  { key: 'tarjeta',         label: 'TARJETA' },
];

const REFRESH_INTERVAL = 60_000;

// ── Merge helper ────────────────────────────────────────────────
function mergeWithCache(prev, next) {
  if (!prev) return next;
  return {
    dolares:   next.dolares   ?? prev.dolares,
    merval:    next.merval    ?? prev.merval,
    acciones:  next.acciones  ?? prev.acciones,
    macro:     next.macro     ?? prev.macro,
    cauciones: next.cauciones ?? prev.cauciones,
    dolarAgro: next.dolarAgro ?? prev.dolarAgro,
    _stale: {
      dolares:   !next.dolares   && !!prev.dolares,
      merval:    !next.merval    && !!prev.merval,
      acciones:  !next.acciones  && !!prev.acciones,
      macro:     !next.macro     && !!prev.macro,
      cauciones: !next.cauciones && !!prev.cauciones,
    },
    errors: next.errors,
  };
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

// ── Dólar Grid ──────────────────────────────────────────────────

function DolarCard({ type, data, stale }) {
  if (!data) {
    return (
      <div className="dolar-card error-card">
        <div className="dolar-label">{type.label}</div>
        <div className="dolar-main dim">—</div>
        <div className="dolar-row"><span className="dim">SIN DATOS</span></div>
      </div>
    );
  }

  const spread = data.venta && data.compra ? (data.venta - data.compra).toFixed(0) : null;

  return (
    <div className={`dolar-card${stale ? ' stale' : ''}`}>
      <div className="dolar-label">
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

// ── Macro Cards ─────────────────────────────────────────────────

function MacroCard({ label, value, unit, sub, color, stale, link }) {
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
      {sub && <div className="macro-card-sub">{sub}</div>}
      {!value && link && (
        <a
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="macro-card-link"
        >
          {link.label} →
        </a>
      )}
    </div>
  );
}

// ── Inflación Card (mensual + anual) ────────────────────────────

function InflacionCard({ inflacion, stale }) {
  const mensual = inflacion?.mensual;
  const anual   = inflacion?.anual;
  const fecha   = inflacion?.fecha;

  return (
    <div className={`macro-card${stale ? ' stale' : ''}`}>
      <div className="macro-card-label">
        INFLACIÓN
        {stale && <span className="stale-badge">ANT</span>}
      </div>

      {mensual != null ? (
        <>
          <div className="macro-card-value" style={{ color: 'var(--neg)' }}>
            {mensual.toFixed(1)}<span className="macro-card-unit">% mensual</span>
          </div>
          <div className="inflacion-anual">
            {anual != null ? (
              <span style={{ color: 'var(--neg)' }}>{anual.toFixed(1)}%</span>
            ) : '—'}
            <span className="dim"> acum. 12m</span>
          </div>
          <div className="macro-card-sub">{inflacion.serie ?? 'IPC'} · INDEC · {fecha}</div>
        </>
      ) : (
        <>
          <div className="macro-card-value"><span className="dim">—</span></div>
          <div className="macro-card-sub">INDEC · datos.gob.ar</div>
        </>
      )}
    </div>
  );
}

// ── Mercado Argentino ───────────────────────────────────────────

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
        {fmt.change(data.change)}&nbsp;({fmt.pct(data.changePct)})
      </div>
      <div className="merval-state dim small">BYMA · ARS · 20 min delay</div>
    </div>
  );
}

function StocksTable({ acciones }) {
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
                <td className={`right ${colorOf(data.change)}`}>{fmt.change(data.change)}</td>
                <td className={`right ${colorOf(data.changePct)}`}>{fmt.pct(data.changePct)}</td>
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

// ── Variables Financieras: Brecha, Exportación, Cauciones ───────

function BrechaCard({ dolares }) {
  const blue    = dolares?.blue?.venta;
  const oficial = dolares?.oficial?.venta;

  if (!blue || !oficial) {
    return (
      <div className="finvar-card">
        <div className="finvar-label">BRECHA CAMBIARIA</div>
        <div className="finvar-value dim">—</div>
        <div className="finvar-sub">Blue vs Oficial · dolarapi.com</div>
      </div>
    );
  }

  const brecha = ((blue - oficial) / oficial) * 100;
  // Color según nivel: dorado < 15%, ámbar 15-30%, rojo > 30%
  const color   = brecha < 15 ? 'var(--pos)' : brecha < 30 ? 'var(--amber)' : 'var(--neg)';
  const nivel   = brecha < 15 ? 'BAJA' : brecha < 30 ? 'MODERADA' : 'ALTA';

  return (
    <div className="finvar-card">
      <div className="finvar-label">BRECHA CAMBIARIA</div>
      <div className="finvar-value" style={{ color }}>{brecha.toFixed(1)}%</div>
      <div className="finvar-nivel" style={{ color }}>
        ● {nivel}
      </div>
      <div className="finvar-sub">
        Blue ${fmt.ars(blue)} vs Oficial ${fmt.ars(oficial)}
      </div>
    </div>
  );
}

function ExportacionCard({ dolarAgro }) {
  if (!dolarAgro) {
    return (
      <div className="finvar-card">
        <div className="finvar-label">USD EXPORTACIÓN</div>
        <div className="finvar-value dim">—</div>
        <div className="finvar-sub">Dólar Agro / Soja · dolarapi.com</div>
      </div>
    );
  }

  const isFallback = dolarAgro._source === 'fallback';

  return (
    <div className="finvar-card">
      <div className="finvar-label">
        USD EXPORTACIÓN
        {isFallback && <span className="stale-badge" style={{ marginLeft: 8 }}>CALC.</span>}
      </div>
      <div className="finvar-value">
        <span style={{ fontSize: 14, color: 'var(--text2)' }}>$</span>
        {fmt.ars(dolarAgro.venta)}
      </div>
      <div className="finvar-row">
        <span className="dim">COMPRA</span>
        <span>${fmt.ars(dolarAgro.compra)}</span>
      </div>
      <div className="finvar-sub">
        {isFallback
          ? 'Estimado: Oficial × 0.75 · sin dato en API'
          : `Dólar Agro / Soja · ${dolarAgro.nombre ?? 'dolarapi.com'}`}
      </div>
    </div>
  );
}

function CaucionesCard({ cauciones, tasaBCRA }) {
  // Estado sin datos de ninguna fuente
  if (!cauciones && !tasaBCRA) {
    return (
      <div className="finvar-card">
        <div className="finvar-label">CAUCIONES BYMA</div>
        <div className="finvar-value dim">—</div>
        <div className="finvar-sub">BYMA Open Data · sin respuesta</div>
      </div>
    );
  }

  if (cauciones) {
    const rows = [
      { label: '1 día',   data: cauciones.d1  },
      { label: '7 días',  data: cauciones.d7  },
      { label: '30 días', data: cauciones.d30 },
    ];
    return (
      <div className="finvar-card">
        <div className="finvar-label">CAUCIONES BYMA</div>
        <table className="cauciones-table">
          <thead>
            <tr>
              <th>PLAZO</th>
              <th className="right">TNA</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ label, data }) => (
              <tr key={label}>
                <td className="dim">{label}</td>
                <td className="right cauciones-tna">
                  {data?.tna != null ? `${data.tna.toFixed(2)}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="finvar-sub">TNA · BYMA Open Data</div>
      </div>
    );
  }

  // Fallback: tasa BCRA como referencia
  return (
    <div className="finvar-card">
      <div className="finvar-label">
        CAUCIONES BYMA
        <span className="stale-badge" style={{ marginLeft: 8 }}>REF.</span>
      </div>
      <table className="cauciones-table">
        <tbody>
          <tr>
            <td className="dim">Política Mon.</td>
            <td className="right cauciones-tna">
              {tasaBCRA?.valor != null ? `${tasaBCRA.valor.toFixed(2)}%` : '—'}
            </td>
          </tr>
        </tbody>
      </table>
      <div className="finvar-sub">Tasa BCRA como referencia · BYMA sin datos</div>
    </div>
  );
}

// ── Grain Section ───────────────────────────────────────────────

function GrainCard({ grano, dolarAgroVenta }) {
  const arsPrice = dolarAgroVenta ? Math.round(grano.usd * dolarAgroVenta) : null;
  return (
    <div className="grain-card">
      <div className="grain-label">
        {grano.label}
        <span style={{ color: 'var(--text2)', fontWeight: 400, fontSize: 9 }}> · {grano.posicion}</span>
      </div>
      <div className="grain-price-usd">
        USD {fmt.ars(grano.usd)}
        <span style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 400 }}>/tn</span>
      </div>
      {arsPrice && (
        <div className="grain-price-ars">
          ${fmt.ars(arsPrice)}
          <span style={{ fontSize: 9, color: 'var(--text2)' }}>/tn</span>
        </div>
      )}
      <div className="grain-sub">Bolsa de Rosario — BCR</div>
    </div>
  );
}

function GrainSection({ dolarAgro, onRefresh, refreshing }) {
  const agroVenta = dolarAgro?.venta ?? null;
  return (
    <>
      <div className="grain-dolar-row">
        <div className="dolar-agro-card">
          <div>
            <div className="dolar-agro-label">DÓLAR EXPORTACIÓN / AGRO</div>
            <div style={{ fontSize: 9, color: 'var(--text2)', fontFamily: 'var(--font-data)', marginTop: 2 }}>
              Tipo de cambio diferencial · dolarapi.com
            </div>
          </div>
          <div className="dolar-agro-value">
            {agroVenta ? `$${fmt.ars(agroVenta)}` : <span className="dim">—</span>}
          </div>
          {agroVenta && (
            <div style={{ fontSize: 9, color: 'var(--text2)', fontFamily: 'var(--font-data)' }}>
              VENTA ARS/USD
            </div>
          )}
        </div>
        <button
          className="grain-refresh-btn"
          onClick={onRefresh}
          disabled={refreshing}
          title="Precios BCR sin API pública — valores USD son de referencia"
        >
          {refreshing ? '↻ ACTUALIZANDO...' : '↻ ACTUALIZAR'}
        </button>
      </div>

      <div className="grain-ref-notice">
        <span className="grain-ref-badge">DATOS REF. — {GRANOS_REF.fecha}</span>
        <span>Precios de pizarra BCR · sin API pública. ARS calculado con dólar exportación.</span>
      </div>

      <div className="grain-grid">
        {GRANOS_REF.granos.map(grano => (
          <GrainCard key={grano.key} grano={grano} dolarAgroVenta={agroVenta} />
        ))}
      </div>
    </>
  );
}

// ── Ticker Tape ─────────────────────────────────────────────────

function TickerTape({ dolares, merval, brecha }) {
  const items = [];

  if (merval) {
    const isPos = merval.change >= 0;
    items.push(
      <span key="merval" className="ticker-item">
        <span className="ticker-sym">S&P MERVAL</span>
        <span style={{ color: isPos ? 'var(--pos)' : 'var(--neg)' }}>{fmt.ars(merval.price)}</span>
        <span style={{ color: isPos ? 'var(--pos)' : 'var(--neg)' }}>{fmt.pct(merval.changePct)}</span>
      </span>
    );
  }

  if (brecha != null) {
    const bc = brecha < 15 ? 'var(--pos)' : brecha < 30 ? 'var(--amber)' : 'var(--neg)';
    items.push(
      <span key="brecha" className="ticker-item">
        <span className="ticker-sym">BRECHA</span>
        <span style={{ color: bc }}>{brecha.toFixed(1)}%</span>
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
    if (dolares['_agro']?.venta || dolares['exportacion']?.venta) {
      const agro = dolares['_agro'] ?? dolares['exportacion'];
      items.push(
        <span key="agro" className="ticker-item">
          <span className="ticker-sym">USD AGRO</span>
          <span>${fmt.ars(agro.venta)}</span>
        </span>
      );
    }
  }

  if (!items.length) return null;

  const doubled = [
    ...items,
    ...items.map((el, i) => <span key={`d${i}`}>{el.props.children}</span>),
  ];

  return (
    <div className="ticker-wrap">
      <div className="ticker-track">{doubled}</div>
    </div>
  );
}

// ── Main Panel ──────────────────────────────────────────────────

export default function MacroPanel() {
  const [data,            setData]            = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [refreshing,      setRefreshing]      = useState(false);
  const [grainRefreshing, setGrainRefreshing] = useState(false);
  const [lastUpdate,      setLastUpdate]      = useState(null);
  const [countdown,       setCountdown]       = useState(REFRESH_INTERVAL / 1000);

  const intervalRef  = useRef(null);
  const countdownRef = useRef(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const result = await fetchAll();
      setData(prev => mergeWithCache(prev, result));
      setLastUpdate(new Date());
      setCountdown(REFRESH_INTERVAL / 1000);
    } catch { /* Error total de red — conserva estado */ }
    finally {
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

  const handleGrainRefresh = useCallback(async () => {
    setGrainRefreshing(true);
    await new Promise(r => setTimeout(r, 800));
    setGrainRefreshing(false);
  }, []);

  if (loading) {
    return (
      <div className="panel-loading">
        <div className="loading-spinner" />
        <div className="loading-text">CONECTANDO CON MERCADOS...</div>
        <div className="loading-sub dim">BCRA · dolarapi.com · INDEC · BYMA</div>
      </div>
    );
  }

  const { dolares, merval, acciones, macro, cauciones, dolarAgro, _stale } = data ?? {};

  // Brecha calculada en el cliente
  const brechaValor = dolares?.blue?.venta && dolares?.oficial?.venta
    ? ((dolares.blue.venta - dolares.oficial.venta) / dolares.oficial.venta) * 100
    : null;

  return (
    <div className="macro-panel">

      {/* ── Ticker ── */}
      <TickerTape dolares={dolares} merval={merval} brecha={brechaValor} />

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
          dolarapi.com · BYMA · BCRA · INDEC
        </span>
      </div>

      {/* ── Sección 1: Tipos de Cambio ── */}
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

      {/* ── Sección 2: Indicadores Macro ── */}
      <section className="panel-section">
        <SectionHeader title="INDICADORES MACROECONÓMICOS" badge="ARG" stale={_stale?.macro} />
        <div className="macro-indicators-grid">

          <InflacionCard
            inflacion={macro?.inflacion}
            stale={_stale?.macro && !macro?.inflacion}
          />

          <MacroCard
            label="TASA BCRA"
            value={macro?.tasa ? macro.tasa.valor.toFixed(2) : null}
            unit="% TNA"
            sub={macro?.tasa
              ? `${macro.tasa.desc?.substring(0, 32) ?? 'Política Monetaria'} · ${macro.tasa.fecha}`
              : 'BCRA · principales variables'}
            color="var(--amber)"
            stale={_stale?.macro && !macro?.tasa}
          />

          <MacroCard
            label="RIESGO PAÍS"
            value={macro?.riesgoPais ? fmt.ars(macro.riesgoPais.valor) : null}
            unit="bps"
            sub={macro?.riesgoPais
              ? `EMBI+ ARG · ${macro.riesgoPais.fecha}${macro.riesgoPais.fuente === 'ambito' ? ' · Ambito' : ''}`
              : 'Sin datos · configurar ESTADISTICAS_BCRA_TOKEN'}
            color="var(--text1)"
            stale={_stale?.macro && !macro?.riesgoPais}
            link={!macro?.riesgoPais
              ? { href: 'https://www.bcra.gob.ar/PublicacionesEstadisticas/Cuadros_estadisticos_diarios.asp', label: 'Ver bcra.gob.ar' }
              : null}
          />

          <MacroCard
            label="RESERVAS BCRA"
            value={macro?.reservas
              ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(macro.reservas.valor)
              : null}
            unit="M USD"
            sub={macro?.reservas
              ? `Reservas internacionales · BCRA · ${macro.reservas.fecha}`
              : 'BCRA · principales variables'}
            color="var(--gold)"
            stale={_stale?.macro && !macro?.reservas}
          />

        </div>
      </section>

      {/* ── Sección 3: Variables Financieras (Brecha / Exportación / Cauciones) ── */}
      <section className="panel-section">
        <SectionHeader title="VARIABLES FINANCIERAS" badge="ARG" />
        <div className="finvar-grid">
          <BrechaCard dolares={dolares} />
          <ExportacionCard dolarAgro={dolarAgro} />
          <CaucionesCard cauciones={cauciones} tasaBCRA={macro?.tasa} />
        </div>
      </section>

      {/* ── Sección 4: Mercado Argentino ── */}
      <section className="panel-section">
        <SectionHeader title="MERCADO ARGENTINO" badge="BYMA · 20 min delay" stale={_stale?.merval} />
        <div className="arg-market-full">
          <div>
            <MervalBox data={merval} stale={_stale?.merval} />
          </div>
          <div>
            <div className="stocks-title">— ACCIONES LÍDERES —</div>
            <StocksTable acciones={acciones} />
          </div>
        </div>
      </section>

      {/* ── Sección 5: Mercado Granario ── */}
      <section className="panel-section">
        <SectionHeader title="MERCADO GRANARIO — ROSARIO" badge="BCR" />
        <GrainSection
          dolarAgro={dolarAgro}
          onRefresh={handleGrainRefresh}
          refreshing={grainRefreshing}
        />
      </section>

    </div>
  );
}
