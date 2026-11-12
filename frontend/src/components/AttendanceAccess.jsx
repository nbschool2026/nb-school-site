import React, { useEffect, useRef, useState } from 'react';
import MaterialIcon from './MaterialIcon.jsx';
import { useLocale } from '../lib/locale.jsx';

const API_BASE = import.meta.env.VITE_STRAPI_API_URL || '/api';

export default function AttendanceAccess() {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function close() {
    if (busy) return;
    setOpen(false);
    setPassword('');
    setError('');
  }

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/attendance/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
        cache: 'no-store',
      });
      const payload = await response.json();
      if (!response.ok || !payload?.url) {
        setError(response.status === 401 ? t('Неправильний пароль.') : response.status === 429 ? t('Забагато спроб. Спробуйте через 15 хвилин.') : t('Не вдалося відкрити відвідування. Спробуйте пізніше.'));
        return;
      }
      window.location.assign(payload.url);
    } catch {
      setError(t('Не вдалося відкрити відвідування. Спробуйте пізніше.'));
    } finally {
      setBusy(false);
    }
  }

  return <>
    <button type="button" className="attendance-trigger" onClick={() => setOpen(true)} aria-label={t('Відвідування')} title={t('Відвідування')}><MaterialIcon name="table_view" /></button>
    {open && <div className="attendance-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }} onKeyDown={(event) => { if (event.key === 'Escape') close(); }}>
      <form className="attendance-dialog" role="dialog" aria-modal="true" aria-labelledby="attendance-title" onSubmit={submit}>
        <button type="button" className="attendance-close" onClick={close} aria-label={t('Закрити')} disabled={busy}><MaterialIcon name="close" /></button>
        <h2 id="attendance-title">{t('Відвідування')}</h2>
        <p>{t('Введіть пароль для переходу до відвідування.')}</p>
        <label htmlFor="attendance-password">{t('Пароль')}</label>
        <input ref={inputRef} id="attendance-password" type="password" autoComplete="off" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={busy} />
        {error && <p className="attendance-error" role="alert">{error}</p>}
        <button type="submit" className="attendance-submit" disabled={busy}>{busy ? t('Перевірка…') : t('Відкрити')}</button>
      </form>
    </div>}
  </>;
}
