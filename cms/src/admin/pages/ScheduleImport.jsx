import React, { useState } from 'react';
import { Button, Main, Box, Typography } from '@strapi/design-system';
import { useFetchClient, useNotification } from '@strapi/admin/strapi-admin';

export default function ScheduleImport() {
  const { post } = useFetchClient();
  const { toggleNotification } = useNotification();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function importSchedule() {
    if (!file) return;
    setBusy(true);
    try {
      const data = new FormData();
      data.append('file', file);
      const response = await post('/admin/schedule-lessons/import', data);
      toggleNotification({ type: 'success', message: `Розклад оновлено: ${response.data.imported} записів.` });
      setFile(null);
    } catch (error) {
      toggleNotification({ type: 'warning', message: 'Не вдалося імпортувати CSV. Перевірте формат файлу.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Main>
      <Box padding={8} background="neutral0">
        <Typography variant="alpha" tag="h1">Імпорт розкладу</Typography>
        <Box paddingTop={4} paddingBottom={4}>
          <Typography>Завантажте CSV. Після натискання кнопки старі записи розкладу будуть видалені, а нові опубліковані.</Typography>
        </Box>
        <input type="file" accept=".csv,text/csv" onChange={(event) => setFile(event.target.files?.[0] || null)} />
        <Box paddingTop={4}>
          <Button disabled={!file || busy} onClick={importSchedule} loading={busy}>
            Розпарсити й замінити розклад
          </Button>
        </Box>
      </Box>
    </Main>
  );
}
