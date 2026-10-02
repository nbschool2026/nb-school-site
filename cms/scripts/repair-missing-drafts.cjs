const { compileStrapi, createStrapi } = require('@strapi/strapi');

async function main() {
  const app = createStrapi(await compileStrapi());

  try {
  await app.load();

  for (const [uid, contentType] of Object.entries(app.contentTypes)) {
    if (!uid.startsWith('api::') || !contentType.options?.draftAndPublish) continue;

    const versions = await app.db.query(uid).findMany({
      select: ['documentId', 'locale', 'publishedAt'],
    });
    const draftKeys = new Set(versions
      .filter((entry) => entry.publishedAt == null)
      .map((entry) => `${entry.documentId}:${entry.locale ?? ''}`));

    let repaired = 0;
    for (const entry of versions) {
      if (entry.publishedAt == null || !entry.documentId) continue;
      const key = `${entry.documentId}:${entry.locale ?? ''}`;
      if (draftKeys.has(key)) continue;

      await app.documents(uid).discardDraft({
        documentId: entry.documentId,
        ...(entry.locale ? { locale: entry.locale } : {}),
      });
      draftKeys.add(key);
      repaired += 1;
    }

    if (repaired) console.log(`${uid}: restored ${repaired} missing draft(s)`);
  }
  } finally {
    await app.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
