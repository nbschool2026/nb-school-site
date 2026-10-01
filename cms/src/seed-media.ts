import fs from 'node:fs';
import path from 'node:path';

const assets = [
  {
    uid: 'api::school-profile.school-profile',
    field: 'heroImage',
    filename: 'home-hero.webp',
    name: 'Головне фото ліцею',
    alternativeText: 'Головний вхід до Новобілоуського ліцею',
  },
  {
    uid: 'api::school-profile.school-profile',
    field: 'aboutImage',
    filename: 'about-hero.webp',
    name: 'Фото для сторінки «Про нас»',
    alternativeText: 'Будівля Новобілоуського ліцею',
  },
  {
    uid: 'api::staff-member.staff-member',
    field: 'photo',
    filename: 'principal-portrait.webp',
    name: 'Портрет директорки',
    alternativeText: 'Портрет директорки ліцею',
  },
  {
    uid: 'api::staff-member.staff-member',
    field: 'homepagePhoto',
    filename: 'principal-landscape.webp',
    name: 'Фото директорки для головної',
    alternativeText: 'Директорка ліцею',
  },
];

export async function ensureSeedMedia(strapi: any) {
  const uploadService = strapi.plugin('upload')?.service('upload');
  if (!uploadService) return;

  for (const asset of assets) {
    const allRecords = await strapi.db.query(asset.uid).findMany({ populate: [asset.field] });
    const records = asset.uid === 'api::staff-member.staff-member'
      ? firstStaffDocument(allRecords)
      : allRecords;
    if (!records.length) continue;

    const existing = records.find((record) => record[asset.field]?.id)?.[asset.field];
    let fileId = existing?.id;
    if (!fileId) {
      const uploaded = await strapi.db.query('plugin::upload.file').findOne({
        where: { name: asset.name },
      });
      fileId = uploaded?.id;
    }
    if (!fileId) {
      const filepath = path.join(process.cwd(), 'seed-media', asset.filename);
      const [uploaded] = await uploadService.upload({
        data: {
          fileInfo: { name: asset.name, alternativeText: asset.alternativeText },
        },
        files: {
          filepath,
          originalFilename: asset.filename,
          mimetype: 'image/webp',
          size: fs.statSync(filepath).size,
        },
      });
      fileId = uploaded.id;
    }

    for (const record of records) {
      if (record[asset.field]?.id) continue;
      await strapi.db.query(asset.uid).update({
        where: { id: record.id },
        data: { [asset.field]: fileId },
      });
    }
  }
}

function firstStaffDocument(records: any[]) {
  const first = [...records].sort((a, b) =>
    (a.order ?? 0) - (b.order ?? 0) || a.id - b.id)[0];
  return first ? records.filter((record) => record.documentId === first.documentId) : [];
}
