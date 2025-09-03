import { Injectable } from '@nestjs/common';
import { FileUpload } from 'graphql-upload-ts';
import { mkdir } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

@Injectable()
export class UploadService {
  async save(file: FileUpload): Promise<string> {
    const { createReadStream, filename } = file;
    const id = randomUUID();
    const uploadDir = join(process.cwd(), 'uploads');
    await mkdir(uploadDir, { recursive: true });
    const filePath = join(uploadDir, `${id}-${filename}`);
    await new Promise<void>((resolve, reject) => {
      const stream = createReadStream();
      const out = createWriteStream(filePath);
      out.on('finish', () => resolve());
      out.on('error', reject);
      stream.on('error', reject);
      stream.pipe(out);
    });
    return `/uploads/${id}-${filename}`;
  }
}
