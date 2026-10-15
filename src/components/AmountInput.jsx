// src/components/AmountInput.jsx
import { useState, useEffect } from 'react';

/**
 * Input de monto que mantiene estado local mientras se escribe y confirma
 * el cambio (onCommit) al salir del campo o al presionar Enter.
 */
const AmountInput = ({ value, onCommit, placeholder = '0' }) => {
  const [local, setLocal] = useState(value ?? '');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => { setLocal(value ?? ''); }, [value]);

  const commit = async () => {
    const actual = local === '' ? 0 : Number(local);
    const previo = value ?? 0;
    if (actual === Number(previo)) return;
    setGuardando(true);
    try {
      await onCommit(local);
    } finally {
      setGuardando(false);
    }
  };

  const conValor = local !== '' && Number(local) > 0;

  return (
    <input
      className={`amount-input ${guardando ? 'guardando' : ''} ${conValor ? 'con-valor' : ''}`}
      type="number"
      inputMode="decimal"
      min="0"
      step="0.01"
      value={local}
      placeholder={placeholder}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
    />
  );
};

export default AmountInput;
