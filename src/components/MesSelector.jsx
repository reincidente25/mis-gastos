// src/components/MesSelector.jsx
import { mesLegible } from '../utils/format';
import './MesSelector.css';

/** Mueve un mes YYYY-MM en delta meses. */
const moverMes = (mes, delta) => {
  const [anio, m] = mes.split('-').map(Number);
  const d = new Date(anio, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const MesSelector = ({ mes, onChange }) => (
  <div className="mes-selector">
    <button
      className="mes-btn"
      onClick={() => onChange(moverMes(mes, -1))}
      aria-label="Mes anterior"
    >
      ‹
    </button>
    <span className="mes-label">{mesLegible(mes)}</span>
    <button
      className="mes-btn"
      onClick={() => onChange(moverMes(mes, 1))}
      aria-label="Mes siguiente"
    >
      ›
    </button>
  </div>
);

export default MesSelector;
