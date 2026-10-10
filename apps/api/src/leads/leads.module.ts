import { Module } from '@nestjs/common';
import { AdminLeadsController, PublicLeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

@Module({
  controllers: [PublicLeadsController, AdminLeadsController],
  providers: [LeadsService],
})
export class LeadsModule {}
