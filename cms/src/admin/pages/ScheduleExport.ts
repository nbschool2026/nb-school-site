import React, { useState } from 'react';
import { Button, Main, Box, Typography } from '@strapi/design-system';
// The admin-only export is resolved by the Strapi admin bundler.
// @ts-expect-error Strapi's package export is not visible with this project's legacy module resolution.
import { useFetchClient, useNotification } from '@strapi/strapi/admin';
import { Download } from '@strapi/icons';

export default function ScheduleExport() {
  const { get } = useFetchClient();
  const { toggleNotification } = useNotification();
  const [busy, setBusy] = useState(false);

  async function exportSchedule() {
    setBusy(true);
    try {
      const response = await get('/admin/schedule-lessons/export', { responseType: 'blob' });
      const blob = response.data instanceof Blob
        ? response.data
        : new Blob([response.data], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const doc = (globalThis as any).document;
      const link = doc.createElement('a');
      link.href = url;
      link.download = 'schedule-lessons.xlsx';
      doc.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toggleNotification({ type: 'success', message: 'XLSX усіх уроків завантажено.' });
    } catch (error: any) {
      const message = error?.response?.data?.error?.message || 'Не вдалося експортувати розклад.';
      toggleNotification({ type: 'warning', message });
    } finally {
      setBusy(false);
    }
  }

  return React.createElement(Main, null,
    React.createElement(Box, { padding: 8, background: 'neutral0' },
      React.createElement(Typography, { variant: 'alpha', tag: 'h1' }, 'Експорт розкладу'),
      React.createElement(Box, { paddingTop: 4, paddingBottom: 4 },
        React.createElement(Typography, null, 'Завантажте XLSX з усіма опублікованими уроками з CMS. Файл можна редагувати в Excel і завантажити назад через імпорт.'),
      ),
      React.createElement(Button, { startIcon: React.createElement(Download, null), onClick: exportSchedule, loading: busy, disabled: busy }, 'Вивантажити XLSX'),
    ),
  );
}
