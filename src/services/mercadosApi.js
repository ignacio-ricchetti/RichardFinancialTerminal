// ============================================================
// Richard Financial Terminal — Mercados API Service
// ============================================================

const BYMA_PROXY = '/api/byma';
const ARGDATOS   = '/api/argdatos';

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

// ── Helpers de parseo BYMA (espeja api.js, sin tocar ese archivo) ─

function bymaList(raw) {
  if (Array.isArray(raw))          return raw;
  if (Array.isArray(raw?.data))    return raw.data;
  if (Array.isArray(raw?.content)) return raw.content;
  return [];
}

function bymaPrice(item) {
  if (!item) return null;
  const price = item.trade          ?? item.ultimoPrecio  ?? item.importe
              ?? item.precio        ?? item.last           ?? item.c ?? null;
  const changePct = item.percentualVariation ?? item.variacion ?? item.var
                  ?? item.variacionPorcentual ?? item.pctChange ?? null;
  const volume = item.volume       ?? item.volumen        ?? item.nominalVolume
               ?? item.cantidadOperada ?? item.nominal    ?? null;
  return {
    price:     price     != null ? Number(price)     : null,
    changePct: changePct != null ? Number(changePct) : null,
    volume:    volume    != null ? Number(volume)    : null,
  };
}

// ── fetch leading-equities (todos los 20 tickers del Merval) ──

export async function fetchLeadingEquities() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    const res = await fetch(`${BYMA_PROXY}/leading-equities`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw  = await res.json();
    const items = bymaList(raw);

    const map = {};
    for (const item of items) {
      const sym = (item.symbol ?? item.simbolo ?? item.ticker ?? '')
        .replace(/\s.*$/, '')    // quita sufijos tipo "24hs"
        .toUpperCase();
      if (!sym) continue;
      const nums = bymaPrice(item);
      if (nums) map[sym] = { ...nums, ok: true };
    }
    return map;
  } catch {
    return {};
  }
}

// ── fetch fundamentals desde Yahoo Finance ────────────────────

const YAHOO_PROXY = '/api/yahoo';
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
