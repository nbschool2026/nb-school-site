import React, { useState } from 'react';
import { Button, Main, Box, Typography } from '@strapi/design-system';
// The admin-only export is resolved by the Strapi admin bundler, not the CMS TS project.
// @ts-expect-error Strapi's package export is not visible with this project's legacy module resolution.
import { useFetchClient, useNotification } from '@strapi/strapi/admin';
import { Duplicate } from '@strapi/icons';
import { SCHEDULE_AI_PROMPT } from './schedulePrompt';

export default function ScheduleImport() {
  const { post } = useFetchClient();
  const { toggleNotification } = useNotification();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function copyPrompt() {
    try {
      const clipboard = (navigator as Navigator & { clipboard?: { writeText(value: string): Promise<void> } }).clipboard;
      if (!clipboard) throw new Error('Clipboard API unavailable');
      await clipboard.writeText(SCHEDULE_AI_PROMPT);
      toggleNotification({ type: 'success', message: 'Запит скопійовано в буфер обміну.' });
    } catch {
      toggleNotification({ type: 'warning', message: 'Не вдалося скопіювати запит.' });
    }
  }

  async function importSchedule() {
    if (!file) return;
    setBusy(true);
    try {
      const data = new FormData();
      data.append('file', file);
      const response = await post('/admin/schedule-lessons/import', data);
      toggleNotification({ type: 'success', message: `Розклад оновлено: ${response.data.imported} записів.` });
      setFile(null);
    } catch (error: any) {
      const message = error?.response?.data?.error?.message || 'Не вдалося імпортувати CSV. Перевірте формат файлу.';
      toggleNotification({ type: 'warning', message });
    } finally {
      setBusy(false);
    }
  }

  return (
    React.createElement(Main, null,
      React.createElement(Box, { padding: 8, background: 'neutral0' },
        React.createElement(Typography, { variant: 'alpha', tag: 'h1' }, 'Імпорт розкладу'),
        React.createElement(Box, { paddingTop: 4, paddingBottom: 4 },
          React.createElement(Typography, null, 'Завантажте CSV. Після натискання кнопки старі записи розкладу будуть видалені, а нові опубліковані.'),
        ),
        React.createElement('input', { type: 'file', accept: '.csv,text/csv', onChange: (event: any) => setFile(event.target.files?.[0] || null) }),
        React.createElement(Box, { paddingTop: 4 },
          React.createElement(Button, { disabled: !file || busy, onClick: importSchedule, loading: busy }, 'Розпарсити й замінити розклад'),
        ),
        React.createElement(Box, { paddingTop: 8 },
          React.createElement(Typography, { variant: 'beta', tag: 'h2' }, 'Запит для розпізнавання розкладу'),
          React.createElement(Box, { paddingTop: 3, paddingBottom: 3 },
            React.createElement(Typography, null, 'Скопіюйте цей запит і вставте його в ChatGPT разом із зображенням розкладу.'),
          ),
          React.createElement(Button, { startIcon: React.createElement(Duplicate, null), onClick: copyPrompt }, 'Скопіювати запит'),
          React.createElement('textarea', { readOnly: true, value: SCHEDULE_AI_PROMPT, rows: 18, style: { display: 'block', width: '100%', marginTop: '16px', fontFamily: 'monospace', fontSize: '12px', padding: '12px' } }),
        ),
      ),
    )
  );
}
