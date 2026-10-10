import { Injectable, UnsupportedMediaTypeException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { detectImageType } from './image-type';
import { StorageService, StoredFile } from './storage.interface';

export const uploadsDir = (): string => process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads');

@Injectable()
export class LocalStorageService implements StorageService {
  async save(file: { buffer: Buffer }): Promise<StoredFile> {
    const type = detectImageType(file.buffer);
    if (!type)
      throw new UnsupportedMediaTypeException('Only JPEG, PNG and WebP images are allowed');

    // Server-generated name: user input never reaches the file system path.
    const key = `${randomUUID()}.${type.ext}`;
    await mkdir(uploadsDir(), { recursive: true });
    await writeFile(join(uploadsDir(), key), file.buffer);
    return { key, url: `/uploads/${key}` };
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(join(uploadsDir(), basename(key)));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    }
  }
}
