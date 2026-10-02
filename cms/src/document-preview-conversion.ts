import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { errors } from '@strapi/utils';

const execFileAsync = promisify(execFile);
const documentUid = 'api::public-document.public-document';
const officeMimeTypes = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export function registerDocumentPreviewConversion(strapi: any) {
  strapi.documents.use(async (context, next) => {
    if (context.uid !== documentUid || !['create', 'update'].includes(context.action)) return next();
    const data = context.params?.data;
    if (!data || !Object.prototype.hasOwnProperty.call(data, 'file')) return next();

    const fileId = mediaId(data.file);
    if (!fileId) {
      data.previewPdf = null;
      return next();
    }

    const original = await strapi.db.query('plugin::upload.file').findOne({ where: { id: fileId } });
    if (!original) throw new errors.ApplicationError('Оригінальний файл документа не знайдено в медіатеці.');

    if (original.mime === 'application/pdf' || /\.pdf$/i.test(original.ext || '')) {
      data.previewPdf = null;
      return next();
    }
    if (!officeMimeTypes.has(original.mime) && !/\.docx?$/i.test(original.ext || '')) {
      throw new errors.ApplicationError('Для публічного документа підтримуються PDF, DOC і DOCX.');
    }

    const preview = await convertAndUpload(strapi, original);
    data.previewPdf = preview.id;
    return next();
  });
}

function mediaId(relation: any): number | null {
  if (relation == null) return null;
  if (typeof relation === 'number') return relation;
  if (typeof relation === 'string' && /^\d+$/.test(relation)) return Number(relation);
  if (Array.isArray(relation)) return mediaId(relation[0]);
  if (typeof relation === 'object') {
    if ('id' in relation) return mediaId(relation.id);
    if ('set' in relation) return mediaId(relation.set);
    if ('connect' in relation) return mediaId(relation.connect);
    if ('disconnect' in relation) return null;
  }
  throw new errors.ApplicationError('Не вдалося визначити файл документа. Спробуйте вибрати його знову.');
}

async function convertAndUpload(strapi: any, original: any) {
  const previewName = `document-preview-${original.id}.pdf`;
  const existing = await strapi.db.query('plugin::upload.file').findOne({ where: { name: previewName } });
  if (existing) return existing;

  if (!original.url?.startsWith('/uploads/')) {
    throw new errors.ApplicationError('Автоматична конвертація потребує локального сховища Strapi.');
  }
  const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads');
  const source = path.join(uploadsDir, path.basename(decodeURIComponent(original.url)));
  if (path.dirname(source) !== uploadsDir) throw new errors.ApplicationError('Некоректний шлях до документа.');

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'school-document-'));
  try {
    const extension = /\.docx$/i.test(original.ext || '') ? '.docx' : '.doc';
    const input = path.join(tempDir, `source${extension}`);
    const output = path.join(tempDir, 'source.pdf');
    await fs.copyFile(source, input);
    const soffice = process.env.LIBREOFFICE_PATH || (process.platform === 'win32'
      ? 'C:\\Program Files\\LibreOffice\\program\\soffice.com' : 'soffice');
    await execFileAsync(soffice, [
      `-env:UserInstallation=${pathToFileURL(path.join(tempDir, 'profile')).href}`,
      '--headless', '--convert-to', 'pdf:writer_pdf_Export', '--outdir', tempDir, input,
    ], { timeout: 90000, windowsHide: true });
    const result = await waitForPdf(output);
    if (result.length < 100 || result.subarray(0, 5).toString() !== '%PDF-') {
      throw new Error('Конвертер не створив PDF-файл.');
    }
    const [uploaded] = await strapi.plugin('upload').service('upload').upload({
      data: { fileInfo: { name: previewName } },
      files: {
        filepath: output,
        originalFilename: previewName,
        mimetype: 'application/pdf',
        size: result.length,
      },
    });
    return uploaded;
  } catch (error) {
    strapi.log.error(`Document PDF conversion failed: ${error}`);
    throw new errors.ApplicationError('Не вдалося створити PDF-копію. Перевірте LibreOffice та право CMS запускати його, потім спробуйте ще раз.');
  } finally {
    if (path.dirname(tempDir) === os.tmpdir()) {
      try {
        await fs.rm(tempDir, { recursive: true, force: true, maxRetries: 15, retryDelay: 200 });
      } catch (error) {
        strapi.log.warn(`Could not remove temporary document conversion files: ${error}`);
      }
    }
  }
}

async function waitForPdf(filepath: string): Promise<Buffer> {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const contents = await fs.readFile(filepath);
      if (contents.length > 100 && contents.subarray(0, 5).toString() === '%PDF-') return contents;
    } catch (error: any) {
      if (!['ENOENT', 'EBUSY', 'EPERM'].includes(error.code)) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('LibreOffice не створив PDF-файл протягом 30 секунд.');
}
