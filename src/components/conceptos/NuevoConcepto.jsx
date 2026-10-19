// src/components/conceptos/NuevoConcepto.jsx
// Formulario de alta de un concepto. Mantiene su propio estado y llama a
// onCrear({ nombre, tipo, categoriaId, grupoId, frecuencia }).
import { useState } from 'react';
import { FRECUENCIAS } from '../../config/frecuencias';

const NuevoConcepto = ({ categorias, grupos, onCrear }) => {
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('gasto');
  const [categoriaId, setCategoriaId] = useState('');
  const [grupoId, setGrupoId] = useState('');
  const [frecuencia, setFrecuencia] = useState('mensual');

  const submit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    await onCrear({ nombre, tipo, categoriaId, grupoId, frecuencia });
    setNombre(''); setTipo('gasto'); setCategoriaId(''); setGrupoId(''); setFrecuencia('mensual');
  };

  return (
    <form className="concepto-fila fila-nueva" onSubmit={submit}>
      <input className="cf-nombre" type="text" placeholder="Nuevo concepto…" value={nombre}
        onChange={(e) => setNombre(e.target.value)} maxLength={60} />
      <select className="cat-select" value={tipo} onChange={(e) => setTipo(e.target.value)}>
        <option value="gasto">💸 Gasto</option>
        <option value="ingreso">💰 Ingreso</option>
      </select>
      <select className="cat-select" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
        <option value="">— Categoría —</option>
        {categorias.map((x) => <option key={x.id} value={x.id}>{x.icon} {x.nombre}</option>)}
      </select>
      <select className="cat-select" value={grupoId} onChange={(e) => setGrupoId(e.target.value)}>
        <option value="">— Grupo —</option>
        {grupos.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
      </select>
      <select className="cat-select" value={frecuencia} onChange={(e) => setFrecuencia(e.target.value)}>
        {FRECUENCIAS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
      </select>
      <div className="cf-acciones">
        <button type="submit" className="cf-add" title="Agregar concepto">+</button>
      </div>
    </form>
  );
};

export default NuevoConcepto;
