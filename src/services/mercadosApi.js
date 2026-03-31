// ============================================================
// Richard Financial Terminal — Mercados API Service
// ============================================================

const ARGDATOS   = '/api/argdatos';
const YAHOO_PROXY = '/api/yahoo';

// ── Tickers del Merval ────────────────────────────────────────

export const MERVAL_TICKERS = [
  'YPF',   'GGAL',  'BMA',   'PAMP',  'TXAR',
  'ALUA',  'CRES',  'SUPV',  'TECO2', 'LOMA',
  'MIRG',  'BYMA',  'CVH',   'VALO',  'CEPU',
  'TGSU2', 'DGCU2', 'MOLI',  'AGRO',  'RICHH',
];

export const COMPANY_NAMES = {
  YPF:   'YPF S.A.',
  GGAL:  'Grupo Financiero Galicia',
  BMA:   'Banco Macro',
  PAMP:  'Pampa Energía',
  TXAR:  'Ternium Argentina',
  ALUA:  'Aluar Aluminio',
  CRES:  'Cresud S.A.C.I.F. y A.',
  SUPV:  'Supervielle',
  TECO2: 'Telecom Argentina',
  LOMA:  'Loma Negra',
  MIRG:  'Mirgor',
  BYMA:  'Bolsas y Mercados Arg.',
  CVH:   'Cablevision Holding',
  VALO:  'Grupo Financiero Valores',
  CEPU:  'Central Puerto',
  TGSU2: 'Transportadora Gas del Sur',
  DGCU2: 'Distrib. Gas Cuyana',
  MOLI:  'Molinos Río de la Plata',
  AGRO:  'Agrometal',
  RICHH: 'Roch S.A.',
};

// ── Mapa de tickers BYMA → Yahoo Finance (.BA) ────────────────

const YAHOO_TICKERS = {
  YPF:   'YPFD.BA',
  GGAL:  'GGAL.BA',
  BMA:   'BMA.BA',
  PAMP:  'PAMPA.BA',
  TXAR:  'TXAR.BA',
  ALUA:  'ALUA.BA',
  CRES:  'CRES.BA',
  SUPV:  'SUPV.BA',
  TECO2: 'TECO2.BA',
  LOMA:  'LOMA.BA',
  MIRG:  'MIRG.BA',
  BYMA:  'BYMA.BA',
  CVH:   'CVH.BA',
  VALO:  'VALO.BA',
  CEPU:  'CEPU.BA',
  TGSU2: 'TGSU2.BA',
  DGCU2: 'DGCU2.BA',
  MOLI:  'MOLI.BA',
  AGRO:  'AGRO.BA',
  RICHH: 'RICH.BA',
};

// ── Datos fundamentales estáticos (fallback cuando Yahoo falla) ─

const ND = 'N/D';

export const FUNDAMENTALS = {
  YPF: {
    cap_mercado:  'USD 8.2B',
    pe_ratio:     '6.8x',
    ev_ebitda:    '4.2x',
    precio_libro: '1.4x',
    roe:          '22.1%',
    roa:          '7.8%',
    margen_neto:  '8.3%',
    deuda_ebitda: '1.6x',
    rev_growth:   ND,
    earn_growth:  ND,
  },
  GGAL: {
    cap_mercado:  'USD 3.8B',
    pe_ratio:     '7.2x',
    ev_ebitda:    '5.1x',
    precio_libro: '2.1x',
    roe:          '31.4%',
    roa:          '4.2%',
    margen_neto:  '28.6%',
    deuda_ebitda: ND,
    rev_growth:   ND,
    earn_growth:  ND,
  },
  BMA: {
    cap_mercado:  'USD 2.1B',
    pe_ratio:     '8.5x',
    ev_ebitda:    '6.2x',
    precio_libro: '2.8x',
    roe:          '28.9%',
    roa:          '3.8%',
    margen_neto:  '24.1%',
    deuda_ebitda: ND,
    rev_growth:   ND,
    earn_growth:  ND,
  },
  PAMP: {
    cap_mercado:  'USD 1.4B',
    pe_ratio:     '9.3x',
    ev_ebitda:    '5.8x',
    precio_libro: '1.7x',
    roe:          '18.6%',
    roa:          '9.1%',
    margen_neto:  '15.2%',
    deuda_ebitda: '1.2x',
    rev_growth:   ND,
    earn_growth:  ND,
  },
  TXAR: {
    cap_mercado:  'USD 0.9B',
    pe_ratio:     '12.1x',
    ev_ebitda:    '7.4x',
    precio_libro: '1.3x',
    roe:          '11.2%',
    roa:          '5.4%',
    margen_neto:  '7.8%',
    deuda_ebitda: '2.1x',
    rev_growth:   ND,
    earn_growth:  ND,
  },
  ALUA: {
    cap_mercado:  'USD 1.1B',
    pe_ratio:     '8.2x',
    ev_ebitda:    '5.1x',
    precio_libro: '1.2x',
    roe:          '14.8%',
    roa:          '8.1%',
    margen_neto:  '11.9%',
    deuda_ebitda: '0.8x',
    rev_growth:   ND,
    earn_growth:  ND,
  },
  CRES: {
    cap_mercado:  'USD 0.5B',
    pe_ratio:     '6.1x',
    ev_ebitda:    '7.2x',
    precio_libro: '0.9x',
    roe:          '12.3%',
    roa:          '4.1%',
    margen_neto:  '8.2%',
    deuda_ebitda: '3.2x',
    rev_growth:   ND,
    earn_growth:  ND,
  },
  SUPV: {
    cap_mercado:  'USD 0.7B',
    pe_ratio:     '5.4x',
    ev_ebitda:    ND,
    precio_libro: '1.5x',
    roe:          '22.4%',
    roa:          '2.8%',
    margen_neto:  '18.1%',
    deuda_ebitda: ND,
    rev_growth:   ND,
    earn_growth:  ND,
  },
  TECO2: {
    cap_mercado:  'USD 1.3B',
    pe_ratio:     '11.2x',
    ev_ebitda:    '4.5x',
    precio_libro: '1.1x',
    roe:          '9.8%',
    roa:          '3.9%',
    margen_neto:  '7.1%',
    deuda_ebitda: '2.8x',
    rev_growth:   ND,
    earn_growth:  ND,
  },
  LOMA: {
    cap_mercado:  'USD 0.8B',
    pe_ratio:     '9.1x',
    ev_ebitda:    '4.8x',
    precio_libro: '1.3x',
    roe:          '14.2%',
    roa:          '7.1%',
    margen_neto:  '10.4%',
    deuda_ebitda: '0.5x',
    rev_growth:   ND,
    earn_growth:  ND,
  },
  MIRG: {
    cap_mercado:  'USD 0.2B',
    pe_ratio:     '7.3x',
    ev_ebitda:    '5.0x',
    precio_libro: '2.1x',
    roe:          '29.6%',
    roa:          '10.2%',
    margen_neto:  '4.3%',
    deuda_ebitda: '0.3x',
    rev_growth:   ND,
    earn_growth:  ND,
  },
  BYMA: {
    cap_mercado:  'USD 0.3B',
    pe_ratio:     '8.1x',
    ev_ebitda:    '6.0x',
    precio_libro: '1.8x',
    roe:          '22.1%',
    roa:          '8.3%',
    margen_neto:  '31.7%',
    deuda_ebitda: ND,
    rev_growth:   ND,
    earn_growth:  ND,
  },
  CVH: {
    cap_mercado:  'USD 0.6B',
    pe_ratio:     '9.4x',
    ev_ebitda:    '5.5x',
    precio_libro: '1.2x',
    roe:          '13.1%',
    roa:          '5.2%',
    margen_neto:  '9.3%',
    deuda_ebitda: '3.5x',
    rev_growth:   ND,
    earn_growth:  ND,
  },
  VALO: {
    cap_mercado:  'USD 0.2B',
    pe_ratio:     '6.3x',
    ev_ebitda:    ND,
    precio_libro: '1.3x',
    roe:          '20.4%',
    roa:          '3.1%',
    margen_neto:  '21.8%',
    deuda_ebitda: ND,
    rev_growth:   ND,
    earn_growth:  ND,
  },
  CEPU: {
    cap_mercado:  'USD 0.9B',
    pe_ratio:     '7.2x',
    ev_ebitda:    '4.1x',
    precio_libro: '1.1x',
    roe:          '15.9%',
    roa:          '8.8%',
    margen_neto:  '23.7%',
    deuda_ebitda: '0.9x',
    rev_growth:   ND,
    earn_growth:  ND,
  },
  TGSU2: {
    cap_mercado:  'USD 1.0B',
    pe_ratio:     '6.1x',
    ev_ebitda:    '3.6x',
    precio_libro: '1.5x',
    roe:          '24.8%',
    roa:          '11.2%',
    margen_neto:  '27.9%',
    deuda_ebitda: '0.6x',
    rev_growth:   ND,
    earn_growth:  ND,
  },
  DGCU2: {
    cap_mercado:  'USD 0.1B',
    pe_ratio:     '8.3x',
    ev_ebitda:    '4.2x',
    precio_libro: '1.0x',
    roe:          '12.1%',
    roa:          '5.8%',
    margen_neto:  '9.8%',
    deuda_ebitda: '1.0x',
    rev_growth:   ND,
    earn_growth:  ND,
  },
  MOLI: {
    cap_mercado:  'USD 0.4B',
    pe_ratio:     '10.2x',
    ev_ebitda:    '6.1x',
    precio_libro: '1.4x',
    roe:          '13.7%',
    roa:          '5.1%',
    margen_neto:  '4.8%',
    deuda_ebitda: '1.5x',
    rev_growth:   ND,
    earn_growth:  ND,
  },
  AGRO: {
    cap_mercado:  'USD 0.06B',
    pe_ratio:     '9.1x',
    ev_ebitda:    '5.2x',
    precio_libro: '1.1x',
    roe:          '12.4%',
    roa:          '7.3%',
    margen_neto:  '8.1%',
    deuda_ebitda: '0.4x',
    rev_growth:   ND,
    earn_growth:  ND,
  },
  RICHH: {
    cap_mercado:  'USD 0.03B',
    pe_ratio:     ND,
    ev_ebitda:    ND,
    precio_libro: '0.8x',
    roe:          '5.1%',
    roa:          '2.2%',
    margen_neto:  '3.1%',
    deuda_ebitda: ND,
    rev_growth:   ND,
    earn_growth:  ND,
  },
};

export const FUNDAMENTALS_EMPTY = {
  cap_mercado:  ND,
  pe_ratio:     ND,
  ev_ebitda:    ND,
  precio_libro: ND,
  roe:          ND,
  roa:          ND,
  margen_neto:  ND,
  deuda_ebitda: ND,
  rev_growth:   ND,
  earn_growth:  ND,
};

// ── fetch precios en tiempo real vía Yahoo Finance v8/chart ──────
// BYMA Open Data requiere Bearer token (401).
// Yahoo v8/finance/chart funciona sin auth y devuelve precios en ARS.
// Se hacen 20 requests en paralelo (una por ticker).

async function fetchOneChart(yahooSym, rangeParam = '5d', intervalParam = '1d') {
  const url = `${YAHOO_PROXY}/v8/finance/chart/${yahooSym}` +
              `?interval=${intervalParam}&range=${rangeParam}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  const res = await fetch(url, {
    signal: controller.signal,
    headers: { Accept: 'application/json' },
  });
  clearTimeout(timer);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchLeadingEquities() {
  const entries = Object.entries(YAHOO_TICKERS);
  const settled = await Promise.allSettled(
    entries.map(([, yahooSym]) => fetchOneChart(yahooSym, '5d', '1d'))
  );

  const map = {};
  settled.forEach((result, i) => {
    if (result.status !== 'fulfilled') return;
    const meta = result.value?.chart?.result?.[0]?.meta;
    if (!meta) return;
    const bymaKey   = entries[i][0];
    const price     = meta.regularMarketPrice   ?? null;
    const prevClose = meta.chartPreviousClose   ?? null;
    const changePct = (price != null && prevClose && prevClose !== 0)
      ? ((price - prevClose) / prevClose) * 100
      : null;
    if (price != null) {
      map[bymaKey] = {
        price,
        changePct,
        volume: meta.regularMarketVolume ?? null,
        ok: true,
      };
    }
  });
  return map;
}

// ── fetch variaciones mensual y anual para panel de detalle ──────

export async function fetchStockVariations(ticker) {
  const yahooSym = YAHOO_TICKERS[ticker];
  if (!yahooSym) return null;
  try {
    const data  = await fetchOneChart(yahooSym, '1y', '1mo');
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta    = result.meta;
    const closes  = (result.indicators?.quote?.[0]?.close ?? [])
                      .filter(c => c != null);
    const current = meta.regularMarketPrice;
    const prev1m  = closes.length >= 2 ? closes[closes.length - 2] : null;
    const prev1y  = closes.length >= 2 ? closes[0] : null;

    return {
      monthlyChange: (prev1m && prev1m !== 0)
        ? ((current - prev1m) / prev1m) * 100 : null,
      annualChange: (prev1y && prev1y !== 0)
        ? ((current - prev1y) / prev1y) * 100 : null,
      weekHigh: meta.fiftyTwoWeekHigh ?? null,
      weekLow:  meta.fiftyTwoWeekLow  ?? null,
    };
  } catch {
    return null;
  }
}

// ── fetch fundamentals desde Yahoo Finance ────────────────────

const YAHOO_MODULES = 'defaultKeyStatistics,financialData,summaryDetail';

function yahooRaw(field) {
  return field?.raw ?? null;
}

function fmtPct(v)  { return v != null ? `${(v * 100).toFixed(1)}%` : ND; }
function fmtX(v)    { return v != null ? `${Number(v).toFixed(1)}x` : ND; }
function fmtCap(v)  {
  if (v == null) return ND;
  return `USD ${(v / 1e9).toFixed(1)}B`;
}

export async function fetchFundamentals(ticker) {
  const yahooTicker = YAHOO_TICKERS[ticker];
  if (!yahooTicker) return FUNDAMENTALS[ticker] ?? FUNDAMENTALS_EMPTY;

  try {
    const url = `${YAHOO_PROXY}/v10/finance/quoteSummary/${yahooTicker}?modules=${YAHOO_MODULES}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const result = data?.quoteSummary?.result?.[0];
    if (!result) throw new Error('Sin datos');

    const ks = result.defaultKeyStatistics ?? {};
    const fd = result.financialData        ?? {};
    const sd = result.summaryDetail        ?? {};

    const totalDebt = yahooRaw(fd.totalDebt);
    const ebitda    = yahooRaw(fd.ebitda);
    const rawDeuda  = (totalDebt != null && ebitda != null && ebitda !== 0)
      ? totalDebt / ebitda
      : null;

    const rawPE    = yahooRaw(sd.trailingPE) ?? yahooRaw(ks.trailingPE);
    const rawEVEB  = yahooRaw(ks.enterpriseToEbitda);
    const rawPB    = yahooRaw(ks.priceToBook);
    const rawROE   = yahooRaw(fd.returnOnEquity);
    const rawROA   = yahooRaw(fd.returnOnAssets);
    const rawMN    = yahooRaw(fd.profitMargins);
    const rawRG    = yahooRaw(fd.revenueGrowth);
    const rawEG    = yahooRaw(fd.earningsGrowth);
    const rawCap   = yahooRaw(sd.marketCap);

    return {
      cap_mercado:  fmtCap(rawCap),
      pe_ratio:     fmtX(rawPE),
      ev_ebitda:    fmtX(rawEVEB),
      precio_libro: fmtX(rawPB),
      roe:          fmtPct(rawROE),
      roa:          fmtPct(rawROA),
      margen_neto:  fmtPct(rawMN),
      deuda_ebitda: fmtX(rawDeuda),
      rev_growth:   fmtPct(rawRG),
      earn_growth:  fmtPct(rawEG),
      _raw: {
        pe_ratio:     rawPE,
        ev_ebitda:    rawEVEB,
        precio_libro: rawPB,
        roe:          rawROE,
        roa:          rawROA,
        margen_neto:  rawMN,
        deuda_ebitda: rawDeuda,
        rev_growth:   rawRG,
      },
      _timestamp: new Date(),
      _source:    'yahoo',
    };
  } catch {
    // Fallback a datos estáticos
    return FUNDAMENTALS[ticker] ?? FUNDAMENTALS_EMPTY;
  }
}

// ── fetch macro para contexto IA ──────────────────────────────
// Evita tocar MacroPanel: hace sus propias llamadas ligeras

export async function fetchMacroParaIA() {
  const out = { dolarBlue: 'N/D', inflacion: 'N/D', riesgoPais: 'N/D' };

  const [dolarRes, riesgoRes, infRes] = await Promise.allSettled([
    fetch('https://dolarapi.com/v1/dolares/blue').then(r => r.json()),
    fetch(`${ARGDATOS}/v1/finanzas/indices/riesgo-pais/ultimo`).then(r => r.json()),
    fetch(`${ARGDATOS}/v1/finanzas/indices/inflacion`).then(r => r.json()),
  ]);

  if (dolarRes.status === 'fulfilled') {
    out.dolarBlue = dolarRes.value?.venta ?? 'N/D';
  }
  if (riesgoRes.status === 'fulfilled') {
    out.riesgoPais = riesgoRes.value?.valor ?? 'N/D';
  }
  if (infRes.status === 'fulfilled') {
    const arr = Array.isArray(infRes.value)
      ? infRes.value.filter(r => r.valor != null)
      : [];
    if (arr.length) out.inflacion = arr[arr.length - 1].valor;
  }

  return out;
}
