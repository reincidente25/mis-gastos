// src/components/conceptos/ItemConcepto.jsx
// Fila de un concepto: solo lectura por defecto, con botón ✏️ para editar.
import { useState, useEffect } from 'react';
import { FRECUENCIAS } from '../../config/frecuencias';
import { DIAS_SEMANA } from '../../utils/format';

const ItemConcepto = ({ c, archivado, resaltado, categorias, grupos, onGuardar, onToggle, onBorrar }) => {
  const [nombre, setNombre] = useState(c.nombre);
  const [editando, setEditando] = useState(false);
  const frec = c.frecuencia || 'mensual';

  useEffect(() => { setNombre(c.nombre); }, [c.nombre]);

  const commitNombre = () => {
    const limpio = nombre.trim();
    if (!limpio || limpio === c.nombre) { setNombre(c.nombre); return; }
    onGuardar(c, { nombre: limpio });
  };

  const cat = categorias.find((x) => x.id === c.categoriaId);
  const grp = grupos.find((x) => x.id === c.grupoId);
  const frecLabel = (FRECUENCIAS.find((f) => f.id === frec) || {}).label || frec;
  const diaLabel = (DIAS_SEMANA.find((d) => d.id === (Number(c.diaSemana) || 1)) || {}).label || '';

  // Vista de solo lectura (por defecto).
  if (!editando) {
    return (
      <div id={`concepto-${c.id}`} className={`concepto-fila lectura ${archivado ? 'archivado' : ''} ${resaltado ? 'resaltado' : ''}`}>
        <span className="cf-ro-nombre">{c.nombre}</span>
        <span className={`cf-ro-tipo ${c.tipo === 'ingreso' ? 'es-ingreso' : ''} ${c.tipo === 'ahorro' ? 'es-ahorro' : ''}`}>
          {c.tipo === 'ingreso' ? '💰 Ingreso' : c.tipo === 'ahorro' ? '🏦 Ahorro' : '💸 Gasto'}
        </span>
        {c.moneda === 'usd' && <span className="cf-ro-usd">US$</span>}
        {cat && <span className="cf-ro-cat">{cat.icon} {cat.nombre}</span>}
        {grp && <span className="cf-ro-grp">📁 {grp.nombre}</span>}
        <span className="cf-ro-frec">
          {frecLabel}
          {frec === 'semanal' && diaLabel ? ` · ${diaLabel}` : ''}
          {frec !== 'mensual' && frec !== 'semanal' && c.mesAncla ? ` · ${c.mesAncla}` : ''}
        </span>
        <div className="cf-acciones">
          <button className="suelto-borrar" onClick={() => setEditando(true)} title="Editar">✏️</button>
        </div>
      </div>
    );
  }

  // Vista de edición.
  return (
    <div id={`concepto-${c.id}`} className={`concepto-fila ${archivado ? 'archivado' : ''} ${resaltado ? 'resaltado' : ''}`}>
      <input className="cf-nombre" value={nombre} maxLength={60}
        onChange={(e) => setNombre(e.target.value)} onBlur={commitNombre}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
      <select className="cat-select" value={c.tipo || 'gasto'} onChange={(e) => onGuardar(c, { tipo: e.target.value })}>
        <option value="gasto">💸 Gasto</option>
        <option value="ingreso">💰 Ingreso</option>
        <option value="ahorro">🏦 Ahorro</option>
      </select>
      <select className="cat-select" value={c.moneda === 'usd' ? 'usd' : 'ars'} title="Moneda"
        onChange={(e) => onGuardar(c, { moneda: e.target.value })}>
        <option value="ars">$ ARS</option>
        <option value="usd">US$</option>
      </select>
      <select className="cat-select" value={c.categoriaId || ''} onChange={(e) => onGuardar(c, { categoriaId: e.target.value })}>
        <option value="">— Categoría —</option>
        {categorias.map((x) => <option key={x.id} value={x.id}>{x.icon} {x.nombre}</option>)}
      </select>
      <select className="cat-select" value={c.grupoId || ''} onChange={(e) => onGuardar(c, { grupoId: e.target.value })}>
        <option value="">— Grupo —</option>
        {grupos.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
      </select>
      <select className="cat-select" value={frec} onChange={(e) => onGuardar(c, { frecuencia: e.target.value })}>
        {FRECUENCIAS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
      </select>
      {frec === 'semanal' && (
        <select className="cat-select" value={Number(c.diaSemana) || 1}
          title="Día de la semana"
          onChange={(e) => onGuardar(c, { diaSemana: Number(e.target.value) })}>
          {DIAS_SEMANA.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
        </select>
      )}
      {frec !== 'mensual' && frec !== 'semanal' && (
        <input className="cat-select cf-mes" type="month" defaultValue={c.mesAncla || ''}
          title={frec === 'unica' ? 'Mes' : 'Desde el mes'}
          onChange={(e) => onGuardar(c, { mesAncla: e.target.value })} />
      )}
      <div className="cf-acciones">
        <button className="suelto-borrar" onClick={() => onToggle(c)} title={archivado ? 'Reactivar' : 'Archivar'}>
          {archivado ? '↩️' : '📥'}
        </button>
        <button className="suelto-borrar" onClick={() => onBorrar(c)} title="Borrar">🗑️</button>
        <button className="suelto-borrar" onClick={() => { commitNombre(); setEditando(false); }} title="Listo">✓</button>
      </div>
    </div>
  );
};

export default ItemConcepto;
