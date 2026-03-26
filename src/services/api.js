// ============================================================
// Richard Financial Terminal — API Service Layer
// ============================================================

const DOLAR_API    = 'https://dolarapi.com/v1';
const BYMA_PROXY   = '/api/byma';
const BCRA_PROXY   = '/api/bcra';
const ESTBCRA      = '/api/estadisticas';
const DATOS_PROXY  = '/api/datos';

// ── Helpers ────────────────────────────────────────────────────

async function apiFetch(url, timeout = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
    return res.json();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// Extrae el primer objeto de respuestas BYMA (acepta {data:[…]} o […])
function bymaFirst(raw) {
  if (Array.isArray(raw)) return raw[0] ?? null;
  if (Array.isArray(raw?.data)) return raw.data[0] ?? null;
  if (Array.isArray(raw?.content)) return raw.content[0] ?? null;
  return null;
}

function bymaList(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.content)) return raw.content;
  return [];
}

// Extrae precio y variación de un objeto BYMA (campo names varían entre endpoints)
function bymaPrice(item) {
  if (!item) return null;
  const price      = item.trade            ?? item.ultimoPrecio  ?? item.importe
                  ?? item.precio           ?? item.last          ?? item.c ?? 0;
  const changePct  = item.percentualVariation ?? item.variacion  ?? item.var
                  ?? item.variacionPorcentual ?? item.pctChange  ?? 0;
  const change     = item.numericalVariation  ?? item.variacionAbsoluta
                  ?? item.variacionNumerica   ?? item.dif        ?? 0;
  return { price: Number(price), changePct: Number(changePct), change: Number(change) };
}

// ── DÓLAR ──────────────────────────────────────────────────────

export async function fetchDolares() {
  const data = await apiFetch(`${DOLAR_API}/dolares`);
  const map = {};
  for (const item of data) {
    map[item.casa] = item;
  }
  return map;
}

// ── MERVAL (BYMA) ──────────────────────────────────────────────

export async function fetchMerval() {
  const raw  = await apiFetch(`${BYMA_PROXY}/index?index=MERVAL`);
  const item = bymaFirst(raw);
  if (!item) throw new Error('BYMA: sin datos Merval');

  const nums = bymaPrice(item);
  return {
    symbol:     'MERVAL',
    shortName:  item.descripcion ?? item.description ?? 'S&P MERVAL',
    price:      nums.price,
    changePct:  nums.changePct,
    change:     nums.change,
    currency:   'ARS',
    marketState:'BYMA',
  };
}

// ── ACCIONES ARGENTINAS (BYMA leading-equities) ────────────────

const TARGET_TICKERS = ['YPF', 'GGAL', 'BMA', 'PAMP', 'TXAR'];

export async function fetchAccionesArg() {
  const raw   = await apiFetch(`${BYMA_PROXY}/leading-equities`);
  const items = bymaList(raw);

  return TARGET_TICKERS.map(sym => {
    const item = items.find(
      i => (i.symbol ?? i.simbolo ?? i.ticker ?? '').toUpperCase() === sym
    );

    if (!item) {
      return { symbol: sym, data: null, error: 'No disponible en BYMA' };
    }

    const nums = bymaPrice(item);
    return {
      symbol: sym,
      data: {
        price:     nums.price,
        changePct: nums.changePct,
        change:    nums.change,
        currency:  'ARS',
      },
    };
  });
}

// ── BCRA — principales variables monetarias ────────────────────

async function fetchBCRAVars() {
  const data = await apiFetch(
    `${BCRA_PROXY}/estadisticas/v3.0/monetarias/principales-variables`
  );
  return data?.results ?? [];
}

// Busca en el array de variables por idVariable numérico
function findVar(vars, id) {
  const v = vars.find(x => x.idVariable === id || x.id === id);
  if (!v) return null;
  return { fecha: v.fecha, valor: Number(v.valor) };
}

// Busca tasa de política monetaria por descripción (el ID puede cambiar)
function findTasa(vars) {
  const keywords = ['política monetaria', 'pases pasivos', 'leliq', 'tasa de referencia'];
  const v = vars.find(x =>
    keywords.some(kw => (x.descripcion ?? '').toLowerCase().includes(kw))
  );
  if (!v) return null;
  return { fecha: v.fecha, valor: Number(v.valor), desc: v.descripcion };
}

// ── RIESGO PAÍS (estadisticasbcra.com) ────────────────────────
// Requiere token JWT en .env.local → ESTADISTICAS_BCRA_TOKEN=...
// Registro gratuito: https://estadisticasbcra.com

async function fetchRiesgoPais() {
  const data = await apiFetch(`${ESTBCRA}/riesgo_pais`);
  if (!Array.isArray(data) || !data.length) throw new Error('Sin datos riesgo país');
  const latest = data[data.length - 1];
  return { fecha: latest.d, valor: Number(latest.v) };
}

// ── INFLACIÓN IPC — INDEC vía datos.gob.ar ────────────────────

async function fetchInflacion() {
  const data = await apiFetch(
    `${DATOS_PROXY}/series/api/series/?ids=148.3_INIVELNAL_DICI_M_26:percent_change&limit=3&sort=desc&format=json`
  );
  const row = data?.data?.[0];
  if (!row) throw new Error('Sin datos IPC');
  return { fecha: row[0], valor: row[1] * 100 };
}

// ── MACRO INDICATORS ───────────────────────────────────────────

export async function fetchMacroIndicators() {
  const [bcraVars, riesgoPais, inflacion] = await Promise.allSettled([
    fetchBCRAVars(),
    fetchRiesgoPais(),
    fetchInflacion(),
  ]);

  let reservas = null;
  let tasa     = null;

  if (bcraVars.status === 'fulfilled') {
    const vars = bcraVars.value;
    reservas = findVar(vars, 1);   // Reservas internacionales (mill. USD)
    tasa     = findTasa(vars);     // Tasa de política monetaria (TNA)
  }

  return {
    reservas,
    tasa,
    riesgoPais: riesgoPais.status === 'fulfilled' ? riesgoPais.value : null,
    inflacion:  inflacion.status  === 'fulfilled' ? inflacion.value  : null,
  };
}

// ── MASTER FETCH ───────────────────────────────────────────────

export async function fetchAll() {
  const [dolares, merval, acciones, macro] = await Promise.allSettled([
    fetchDolares(),
    fetchMerval(),
    fetchAccionesArg(),
    fetchMacroIndicators(),
  ]);

  return {
    dolares:  dolares.status  === 'fulfilled' ? dolares.value  : null,
    merval:   merval.status   === 'fulfilled' ? merval.value   : null,
    acciones: acciones.status === 'fulfilled' ? acciones.value : null,
    macro:    macro.status    === 'fulfilled' ? macro.value    : null,
    errors: {
      dolares:  dolares.reason?.message  ?? null,
      merval:   merval.reason?.message   ?? null,
      acciones: acciones.reason?.message ?? null,
      macro:    macro.reason?.message    ?? null,
    },
  };
}
