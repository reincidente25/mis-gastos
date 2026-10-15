// src/components/GastoForm.jsx
import { useState, useEffect } from 'react';
import { CATEGORIAS } from '../config/categorias';
import { hoy } from '../utils/format';
import './GastoForm.css';

const vacio = () => ({
  descripcion: '',
  monto: '',
  categoria: CATEGORIAS[0].id,
  fecha: hoy(),
});

/**
 * Formulario para crear o editar un gasto.
 * Si recibe `gasto`, funciona en modo edición.
 */
const GastoForm = ({ gasto, onGuardar, onCancelar }) => {
  const [form, setForm]       = useState(vacio());
  const [error, setError]     = useState('');
  const [guardando, setGuardando] = useState(false);
  const editando = Boolean(gasto);

  useEffect(() => {
    if (gasto) {
      setForm({
        descripcion: gasto.descripcion,
        monto: String(gasto.monto),
        categoria: gasto.categoria,
        fecha: gasto.fecha,
      });
    } else {
      setForm(vacio());
    }
  }, [gasto]);

  const set = (campo) => (e) =>
    setForm((prev) => ({ ...prev, [campo]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.descripcion.trim()) return setError('Escribí una descripción.');
    const monto = Number(form.monto);
    if (!monto || monto <= 0) return setError('El monto debe ser mayor a 0.');

    setGuardando(true);
    try {
      await onGuardar(form);
      if (!editando) setForm(vacio());
    } catch (err) {
      console.error(err);
      setError('No se pudo guardar. Intentá de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form className="gasto-form" onSubmit={handleSubmit}>
      <div className="gasto-form-grid">
        <div className="gf-campo gf-desc">
          <label>Descripción</label>
          <input
            type="text"
            value={form.descripcion}
            onChange={set('descripcion')}
            placeholder="Ej: Supermercado"
            maxLength={80}
          />
        </div>

        <div className="gf-campo gf-monto">
          <label>Monto</label>
          <input
            type="number"
            value={form.monto}
            onChange={set('monto')}
            placeholder="0"
            min="0"
            step="0.01"
          />
        </div>

        <div className="gf-campo">
          <label>Categoría</label>
          <select value={form.categoria} onChange={set('categoria')}>
            {CATEGORIAS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="gf-campo">
          <label>Fecha</label>
          <input type="date" value={form.fecha} onChange={set('fecha')} />
        </div>
      </div>

      {error && <p className="gf-error">{error}</p>}

      <div className="gf-acciones">
        {editando && (
          <button type="button" className="gf-btn-cancelar" onClick={onCancelar}>
            Cancelar
          </button>
        )}
        <button type="submit" className="gf-btn-guardar" disabled={guardando}>
          {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : '+ Agregar gasto'}
        </button>
      </div>
    </form>
  );
};

export default GastoForm;
