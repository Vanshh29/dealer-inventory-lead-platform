export interface StoredFile {
  key: string;
  url: string;
}

/** Abstraction over where image bytes live. Local disk today; MinIO/S3 can implement the same contract. */
export interface StorageService {
  save(file: { buffer: Buffer; mimetype: string }): Promise<StoredFile>;
  delete(key: string): Promise<void>;
}

export const STORAGE = Symbol('STORAGE');
