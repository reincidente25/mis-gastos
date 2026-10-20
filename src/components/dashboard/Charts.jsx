// src/components/dashboard/Charts.jsx — gráficos SVG del dashboard.
import { useState } from 'react';
import { formatMoneda, formatUSD } from '../../utils/format';

const COL_GASTO = '#4f46e5';   // indigo
const COL_INGRESO = '#059669'; // verde
const COL_AHORRO = '#0284c7';  // azul

// Redondea hacia arriba a un valor "lindo" para la escala.
const escalaLinda = (max) => {
  if (max <= 0) return 1;
  const pot = Math.pow(10, Math.floor(Math.log10(max)));
  const n = max / pot;
  const paso = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return paso * pot;
};

const abreviar = (v) => {
  const a = Math.abs(v);
  if (a >= 1e6) return `${(v / 1e6).toFixed(a >= 1e7 ? 0 : 1)}M`;
  if (a >= 1e3) return `${(v / 1e3).toFixed(0)}k`;
  return `${v}`;
};

// ── Barras agrupadas: gastos vs ingresos por mes ──
export const EvolucionMensual = ({ serie }) => {
  const [hover, setHover] = useState(null);
  const W = 720, H = 158;
  const mL = 38, mR = 10, mT = 8, mB = 20;
  const pw = W - mL - mR, ph = H - mT - mB;

  const maxDato = Math.max(1, ...serie.map((m) => Math.max(m.gastos, m.ingresos)));
  const maxY = escalaLinda(maxDato);
  const y = (v) => mT + ph - (v / maxY) * ph;
  const gw = pw / serie.length;
  const bw = Math.min(16, gw * 0.32);
  const gridVals = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxY);

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label="Evolución mensual">
        {gridVals.map((gv, i) => (
          <g key={i}>
            <line x1={mL} x2={W - mR} y1={y(gv)} y2={y(gv)} className="chart-grid" />
            <text x={mL - 6} y={y(gv) + 3} className="chart-ylabel">{abreviar(gv)}</text>
          </g>
        ))}
        {serie.map((m, i) => {
          const gx = mL + i * gw;
          const cx = gx + gw / 2;
          const act = hover === i;
          return (
            <g key={m.mes}>
              <rect x={gx} y={mT} width={gw} height={ph} fill="transparent"
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
              <rect x={cx - bw - 1} y={y(m.gastos)} width={bw} height={Math.max(0, mT + ph - y(m.gastos))}
                rx="3" fill={COL_GASTO} opacity={act ? 1 : 0.88} />
              <rect x={cx + 1} y={y(m.ingresos)} width={bw} height={Math.max(0, mT + ph - y(m.ingresos))}
                rx="3" fill={COL_INGRESO} opacity={act ? 1 : 0.88} />
              <text x={cx} y={H - 8} className={`chart-xlabel ${act ? 'act' : ''}`}>{m.label}</text>
            </g>
          );
        })}
        <line x1={mL} x2={W - mR} y1={y(0)} y2={y(0)} className="chart-axis" />
      </svg>
      {hover != null && (
        <div className="chart-tip" style={{ left: `${(mL + hover * gw + gw / 2) / W * 100}%` }}>
          <div className="tip-mes">{serie[hover].label}</div>
          <div className="tip-row"><span className="tip-dot" style={{ background: COL_INGRESO }} />Ingresos<b>{formatMoneda(serie[hover].ingresos)}</b></div>
          <div className="tip-row"><span className="tip-dot" style={{ background: COL_GASTO }} />Gastos<b>{formatMoneda(serie[hover].gastos)}</b></div>
          <div className="tip-row tip-bal"><span>Balance</span><b className={serie[hover].balance < 0 ? 'neg' : ''}>{formatMoneda(serie[hover].balance)}</b></div>
        </div>
      )}
      <div className="chart-legend">
        <span><span className="lg-dot" style={{ background: COL_INGRESO }} />Ingresos</span>
        <span><span className="lg-dot" style={{ background: COL_GASTO }} />Gastos</span>
      </div>
    </div>
  );
};

// ── Línea de saldo acumulado (una serie) ──
export const LineaSaldo = ({ puntos, valor, color = COL_AHORRO, usd = false }) => {
  const [hover, setHover] = useState(null);
  const W = 340, H = 92;
  const mL = 8, mR = 8, mT = 8, mB = 14;
  const pw = W - mL - mR, ph = H - mT - mB;
  const vals = puntos.map((p) => valor(p));
  const max = Math.max(1, ...vals), min = Math.min(0, ...vals);
  const y = (v) => mT + ph - ((v - min) / (max - min || 1)) * ph;
  const x = (i) => mL + (pw / Math.max(1, puntos.length - 1)) * i;
  const d = vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(v)}`).join(' ');
  const fmt = usd ? formatUSD : formatMoneda;

  return (
    <div className="chart-wrap mini">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img">
        <line x1={mL} x2={W - mR} y1={y(0)} y2={y(0)} className="chart-grid" />
        <path d={`${d} L${x(vals.length - 1)},${y(min)} L${x(0)},${y(min)} Z`} fill={color} opacity="0.08" />
        <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {vals.map((v, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(v)} r={hover === i ? 4 : 2.5} fill={color} />
            <rect x={x(i) - pw / puntos.length / 2} y={mT} width={pw / puntos.length} height={ph} fill="transparent"
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
            {(i % 2 === 0) && <text x={x(i)} y={H - 5} className="chart-xlabel">{puntos[i].label}</text>}
          </g>
        ))}
      </svg>
      {hover != null && (
        <div className="chart-tip" style={{ left: `${x(hover) / W * 100}%` }}>
          <div className="tip-mes">{puntos[hover].label}</div>
          <div className="tip-row tip-bal"><span>Saldo</span><b>{fmt(vals[hover])}</b></div>
        </div>
      )}
    </div>
  );
};
