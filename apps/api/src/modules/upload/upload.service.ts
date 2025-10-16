import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileUpload } from 'graphql-upload-ts';
import { mkdir } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { UploadedFile } from './dto/uploaded-file.type';

@Injectable()
export class UploadService {
  constructor(private readonly config: ConfigService) {}

  async save(file: FileUpload | Promise<FileUpload>): Promise<UploadedFile> {
    const { createReadStream, filename, mimetype, encoding } = await file;
    const id = randomUUID();
    const uploadDir = join(process.cwd(), 'uploads');
    await mkdir(uploadDir, { recursive: true });
    const storedFilename = `${id}-${filename}`;
    const filePath = join(uploadDir, storedFilename);
    await new Promise<void>((resolve, reject) => {
      const stream = createReadStream();
      const out = createWriteStream(filePath);
      out.on('finish', () => resolve());
      out.on('error', reject);
      stream.on('error', reject);
      stream.pipe(out);
    });
    const relativePath = `/uploads/${storedFilename}`;
    const baseUrl =
      this.config.get<string>('UPLOADS_PUBLIC_BASE_URL') ??
      this.config.get<string>('APP_BASE_URL');

    let publicUrl = relativePath;

    if (baseUrl) {
      try {
        publicUrl = new URL(relativePath, baseUrl).toString();
      } catch {
        const normalizedBase = baseUrl.endsWith('/')
          ? baseUrl.slice(0, -1)
          : baseUrl;
        publicUrl = `${normalizedBase}${relativePath}`;
      }
    }

    return {
      id,
      filename,
      mimetype,
      encoding,
      path: relativePath,
      url: publicUrl,
    };
  }
}
