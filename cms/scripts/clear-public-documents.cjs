const { compileStrapi, createStrapi } = require('@strapi/strapi');

const uid = 'api::public-document.public-document';

async function main() {
  const app = createStrapi(await compileStrapi());

  try {
    await app.load();
    const rows = await app.db.query(uid).findMany({
      select: ['documentId'],
      populate: { file: true, previewPdf: true },
    });
    const documentIds = [...new Set(rows.map((row) => row.documentId).filter(Boolean))];
    const files = new Map();

    for (const row of rows) {
      for (const field of ['file', 'previewPdf']) {
        const file = row[field];
        if (file?.id) files.set(file.id, file);
      }
    }

    for (const documentId of documentIds) {
      await app.documents(uid).delete({ documentId });
    }

    const documentUploads = await app.db.query('plugin::upload.file').findMany({
      where: {
        mime: {
          $in: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ],
        },
      },
    });
    for (const file of documentUploads) files.set(file.id, file);

    const uploadService = app.plugin('upload').service('upload');
    for (const file of files.values()) {
      await uploadService.remove(file);
    }

    console.log(`Removed ${documentIds.length} public document(s) and ${files.size} document file(s).`);
  } finally {
    await app.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
