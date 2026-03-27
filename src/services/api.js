// ============================================================
// Richard Financial Terminal — API Service Layer
// ============================================================

const DOLAR_API    = 'https://dolarapi.com/v1';
const BYMA_PROXY   = '/api/byma';
const BCRA_PROXY   = '/api/bcra';
const ESTBCRA      = '/api/estadisticas';
const DATOS_PROXY  = '/api/datos';
const AMBITO_PROXY = '/api/ambito';

// ── Helpers ────────────────────────────────────────────────────

async function apiFetch(url, timeout = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

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

function bymaPrice(item) {
  if (!item) return null;
  const price     = item.trade             ?? item.ultimoPrecio ?? item.importe
                 ?? item.precio            ?? item.last         ?? item.c ?? 0;
  const changePct = item.percentualVariation ?? item.variacion  ?? item.var
                 ?? item.variacionPorcentual ?? item.pctChange  ?? 0;
  const change    = item.numericalVariation  ?? item.variacionAbsoluta
                 ?? item.variacionNumerica   ?? item.dif        ?? 0;
  return { price: Number(price), changePct: Number(changePct), change: Number(change) };
}

// ── DÓLAR ──────────────────────────────────────────────────────

export async function fetchDolares() {
  const data = await apiFetch(`${DOLAR_API}/dolares`);
  const map = {};
  for (const item of data) {
    // Indexar por "casa" Y por "nombre" (para buscar agro/exportacion)
    map[item.casa] = item;
    if (item.nombre) {
      const nomLower = item.nombre.toLowerCase();
      if (nomLower.includes('exportaci') || nomLower.includes('agro') || nomLower.includes('soja')) {
        map['_agro'] = item;
      }
    }
  }
  return map;
}

// Dólar exportación / agro — busca en el array por nombre
export async function fetchDolarAgro(dolaresMap = null) {
  try {
    // Primero intentar endpoint dedicado
    const data = await apiFetch(`${DOLAR_API}/dolares/exportacion`);
    if (data?.venta) return { ...data, _source: 'api' };
  } catch { /* continuar */ }

  // Buscar en el mapa de dolares ya cargado
  if (dolaresMap) {
    if (dolaresMap['_agro'])       return { ...dolaresMap['_agro'],       _source: 'map' };
    if (dolaresMap['exportacion']) return { ...dolaresMap['exportacion'], _source: 'map' };
    if (dolaresMap['agro'])        return { ...dolaresMap['agro'],        _source: 'map' };
  }

  // Fallback: calcular desde oficial (dólar agro ≈ 75% del oficial en esquemas blend)
  const oficialVenta = dolaresMap?.oficial?.venta;
  if (oficialVenta) {
    return {
      venta:   Math.round(oficialVenta * 0.75),
      compra:  Math.round(oficialVenta * 0.70),
      nombre:  'Exportación (estimado)',
      _source: 'fallback',
    };
  }

  return null;
}

// ── MERVAL (BYMA) ──────────────────────────────────────────────

export async function fetchMerval() {
  const raw  = await apiFetch(`${BYMA_PROXY}/index?index=MERVAL`);
  const item = bymaFirst(raw);
  if (!item) throw new Error('BYMA: sin datos Merval');
  const nums = bymaPrice(item);
  return {
    symbol:    'MERVAL',
    shortName: item.descripcion ?? item.description ?? 'S&P MERVAL',
    price:     nums.price,
    changePct: nums.changePct,
    change:    nums.change,
    currency:  'ARS',
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
    if (!item) return { symbol: sym, data: null, error: 'No disponible en BYMA' };
    const nums = bymaPrice(item);
    return { symbol: sym, data: { price: nums.price, changePct: nums.changePct, change: nums.change, currency: 'ARS' } };
  });
}

// ── CAUCIONES BYMA ─────────────────────────────────────────────

export async function fetchCauciones() {
  const raw  = await apiFetch(`${BYMA_PROXY}/cauciones-plazos`);
  const list = bymaList(raw);
  if (!list.length) throw new Error('BYMA: sin datos cauciones');

  const normalized = list.map(item => {
    // "plazo" puede ser número o string como "1", "7", "30"
    let plazo = item.plazo       ?? item.dias         ?? item.plazoDias
             ?? item.plazos      ?? item.term          ?? item.days ?? 0;
    if (typeof plazo === 'string') plazo = parseInt(plazo, 10);
    plazo = Number(plazo);

    // TNA puede venir en distintos campos (BYMA usa varios esquemas)
    const tnaRaw =
      item.tna             ?? item.tasaNominalAnual ?? item.tasaAnual
      ?? item.colocacion   ?? item.tasaColocacion   ?? item.rendimiento
      ?? item.ultimoPrecio ?? item.valor            ?? item.rate ?? 0;

    // Normalizar: si viene como porcentaje > 0 y < 500, usar directamente;
    // si viene como decimal (0.38 = 38%), multiplicar × 100
    let tna = Number(tnaRaw);
    if (tna > 0 && tna < 2) tna = tna * 100; // era decimal

    return { plazo, tna };
  }).filter(x => x.plazo > 0 && x.tna > 0);

  if (!normalized.length) throw new Error('BYMA: cauciones vacías después de normalizar');

  const closest = (target) =>
    normalized.reduce((best, curr) =>
      Math.abs(curr.plazo - target) < Math.abs(best.plazo - target) ? curr : best
    );

  return { d1: closest(1), d7: closest(7), d30: closest(30) };
}

// ── BCRA ────────────────────────────────────────────────────────

async function fetchBCRAVars() {
  // API v3 — endpoint oficial de principales variables
  try {
    const data = await apiFetch(
      `${BCRA_PROXY}/estadisticasmonetarias/v3.0/Dato/Variable/Principales`
    );
    if (Array.isArray(data))               return data;
    if (Array.isArray(data?.results))      return data.results;
    if (Array.isArray(data?.data))         return data.data;
  } catch { /* continúa con fallback individual */ }

  // Fallback: fetching variables 1 (reservas) y 27 (tasa) individualmente
  const today = new Date().toISOString().slice(0, 10);
  const from  = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);

  const [r1, r27, r26] = await Promise.allSettled([
    apiFetch(`${BCRA_PROXY}/estadisticasmonetarias/v3.0/Dato/Variable/1/${from}/${today}`),
    apiFetch(`${BCRA_PROXY}/estadisticasmonetarias/v3.0/Dato/Variable/27/${from}/${today}`),
    apiFetch(`${BCRA_PROXY}/estadisticasmonetarias/v3.0/Dato/Variable/26/${from}/${today}`),
  ]);

  const vars = [];
  for (const [res, id, desc] of [
    [r1,  1,  'Reservas internacionales del BCRA (u$s - millones)'],
    [r27, 27, 'Tasa de política monetaria (en % n.a.)'],
    [r26, 26, 'Tasa de pases pasivos (en % n.a.)'],
  ]) {
    if (res.status !== 'fulfilled') continue;
    const rows = res.value?.results ?? res.value?.data ?? (Array.isArray(res.value) ? res.value : []);
    if (!rows.length) continue;
    const last = rows[rows.length - 1];
    vars.push({ idVariable: id, descripcion: desc, fecha: last.fecha, valor: last.valor });
  }
  return vars;
}

function findReservas(vars) {
  // Intento por ID conocido (ID 1 = Reservas internacionales del BCRA)
  const byId = vars.find(x => x.idVariable === 1 || x.id === 1);
  if (byId) return { fecha: byId.fecha, valor: Number(byId.valor) };

  // Fallback: buscar por descripción
  const v = vars.find(x => {
    const d = (x.descripcion ?? '').toLowerCase();
    return d.includes('reservas') && d.includes('internacionales');
  });
  if (!v) return null;
  return { fecha: v.fecha, valor: Number(v.valor) };
}

function findTasa(vars) {
  // Intentar por IDs conocidos primero (27 = política monetaria, 26 = pases pasivos)
  const byId = vars.find(x =>
    x.idVariable === 27 || x.idVariable === 26 || x.idVariable === 6
  );
  if (byId && Number(byId.valor) > 0) {
    return { fecha: byId.fecha, valor: Number(byId.valor), desc: byId.descripcion };
  }

  const keywords = [
    'política monetaria', 'pases pasivos', 'leliq',
    'tasa de referencia', 'tna de', 'tasa nominal',
  ];

  // Buscar variable que tenga "tasa" en el desc Y alguna de las keywords
  let v = vars.find(x => {
    const d = (x.descripcion ?? '').toLowerCase();
    return d.includes('tasa') && keywords.some(kw => d.includes(kw));
  });

  // Fallback más amplio: cualquier variable con "tasa" y porcentaje razonable
  if (!v) {
    v = vars.find(x => {
      const d = (x.descripcion ?? '').toLowerCase();
      return d.includes('tasa') && Number(x.valor) > 0 && Number(x.valor) < 500;
    });
  }

  if (!v) return null;
  return { fecha: v.fecha, valor: Number(v.valor), desc: v.descripcion };
}

// ── RIESGO PAÍS ────────────────────────────────────────────────
// Fuente primaria: estadisticasbcra.com (requiere JWT en .env.local)
// Fuente secundaria: Ambito Financiero (pública, sin auth)

async function fetchRiesgoPais() {
  // 1. Intentar estadisticasbcra.com (JWT configurado)
  try {
    const data = await apiFetch(`${ESTBCRA}/riesgo_pais`);
    if (Array.isArray(data) && data.length) {
      const latest = data[data.length - 1];
      return { fecha: latest.d, valor: Number(latest.v), fuente: 'bcra' };
    }
  } catch { /* sin token o sin acceso — continúa */ }

  // 2. Fallback: Ambito Financiero (público)
  const data = await apiFetch(`${AMBITO_PROXY}/riesgo-pais/info`);
  if (!data) throw new Error('Sin datos riesgo país');

  // Ambito puede retornar { fecha, valor } con valor como string "823"
  const valor = parseInt(String(data.valor ?? data.v ?? '0').replace(/[^0-9]/g, ''), 10);
  if (!valor) throw new Error('Ambito: valor riesgo país inválido');

  // Normalizar fecha (Ambito: "26/03/2026 17:00" → "2026-03-26")
  let fecha = data.fecha ?? new Date().toISOString().slice(0, 10);
  if (fecha.includes('/')) {
    const [day, month, yearTime] = fecha.split('/');
    const year = (yearTime ?? '').split(' ')[0];
    fecha = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return { fecha, valor, fuente: 'ambito' };
}

// ── INFLACIÓN IPC — INDEC via datos.gob.ar ────────────────────
// :percent_change devuelve la variación mensual en decimal (0.028 = 2.8%)
// limit=13 → 13 meses para calcular el acumulado anual de 12 meses
// Series probadas en orden de preferencia:
//   148.3_INIVELGENE_DICI_M_26  = IPC General nacional (INDEC)
//   148.3_INUCLEADOS0_DICI_M_26 = IPC Núcleo nacional

async function fetchInflacion() {
  const SERIES_IDS = [
    { id: '148.3_INIVELGENE_DICI_M_26', label: 'IPC general' },
    { id: '148.3_INUCLEADOS0_DICI_M_26', label: 'IPC núcleo' },
  ];

  for (const { id, label } of SERIES_IDS) {
    try {
      const data = await apiFetch(
        `${DATOS_PROXY}/series/api/series/?ids=${id}:percent_change&limit=13&sort=desc&format=json`
      );
      const rows = data?.data;
      if (!rows?.length) continue;

      // Filtrar filas nulas (datos pendientes de publicación)
      const validRows = rows.filter(r => r[1] != null);
      if (!validRows.length) continue;

      const mensual = validRows[0][1] * 100;
      const last12  = validRows.slice(0, 12);
      const anual   = last12.length >= 12
        ? (last12.reduce((acc, r) => acc * (1 + r[1]), 1) - 1) * 100
        : null;

      return { fecha: validRows[0][0], mensual, anual, serie: label };
    } catch { continue; }
  }

  throw new Error('Sin datos IPC');
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
    reservas = findReservas(vars);
    tasa     = findTasa(vars);
  }

  return {
    reservas,
    tasa,
    riesgoPais: riesgoPais.status === 'fulfilled' ? riesgoPais.value : null,
    inflacion:  inflacion.status  === 'fulfilled' ? inflacion.value  : null,
  };
}

// ── GRANOS — BCR Rosario ────────────────────────────────────────

export const GRANOS_REF = {
  fecha: 'MAR 2026',
  granos: [
    { key: 'soja',    label: 'SOJA',    posicion: 'DISPONIBLE', usd: 270 },
    { key: 'maiz',    label: 'MAÍZ',    posicion: 'DISPONIBLE', usd: 162 },
    { key: 'trigo',   label: 'TRIGO',   posicion: 'DISPONIBLE', usd: 198 },
    { key: 'girasol', label: 'GIRASOL', posicion: 'DISPONIBLE', usd: 318 },
  ],
};

// ── MASTER FETCH ───────────────────────────────────────────────

export async function fetchAll() {
  // Paso 1: dolares primero (fetchDolarAgro lo necesita como fallback)
  let dolaresMap = null;
  try { dolaresMap = await fetchDolares(); } catch { /* continúa */ }

  const [merval, acciones, macro, cauciones] = await Promise.allSettled([
    fetchMerval(),
    fetchAccionesArg(),
    fetchMacroIndicators(),
    fetchCauciones(),
  ]);

  // dolarAgro usa el mapa de dolares como fallback interno
  let dolarAgro = null;
  try { dolarAgro = await fetchDolarAgro(dolaresMap); } catch { /* continúa */ }

  return {
    dolares:   dolaresMap,
    merval:    merval.status    === 'fulfilled' ? merval.value    : null,
    acciones:  acciones.status  === 'fulfilled' ? acciones.value  : null,
    macro:     macro.status     === 'fulfilled' ? macro.value     : null,
    cauciones: cauciones.status === 'fulfilled' ? cauciones.value : null,
    dolarAgro,
    errors: {
      dolares:   dolaresMap  ? null : 'Sin datos',
      merval:    merval.reason?.message    ?? null,
      acciones:  acciones.reason?.message  ?? null,
      macro:     macro.reason?.message     ?? null,
      cauciones: cauciones.reason?.message ?? null,
    },
  };
}
