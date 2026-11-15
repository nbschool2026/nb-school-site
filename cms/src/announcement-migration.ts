// Keep the original text column while existing announcements move to the blocks editor.
export async function migrateAnnouncementToBlocks(strapi: any) {
  const database = strapi.db.connection;
  const table = 'school_profiles';
  if (!(await database.schema.hasTable(table)) || !(await database.schema.hasColumn(table, 'announcement_content'))) return;

  const profiles = await database(table)
    .select('id', 'announcement_text')
    .whereNull('announcement_content')
    .whereNotNull('announcement_text');

  for (const profile of profiles) {
    const text = String(profile.announcement_text || '');
    if (!text.trim()) continue;
    const blocks = text.replace(/\r\n?/g, '\n').split('\n').map((line) => ({
      type: 'paragraph',
      children: [{ type: 'text', text: line }],
    }));
    await database(table).where({ id: profile.id }).whereNull('announcement_content')
      .update({ announcement_content: JSON.stringify(blocks), announcement_text: null });
  }
}
