import { Global, Module } from '@nestjs/common';
import { LocalStorageService } from './local-storage.service';
import { STORAGE } from './storage.interface';

@Global()
@Module({
  providers: [{ provide: STORAGE, useClass: LocalStorageService }],
  exports: [STORAGE],
})
export class StorageModule {}
