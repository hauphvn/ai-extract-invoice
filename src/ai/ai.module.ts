import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { BullModule } from '@nestjs/bullmq';
import { AiInvoiceProcessor } from './ai.processor';
import { AiSecurityService } from './ai-security.service';

@Module({
  imports: [
    // Khai báo hàng đợi BullMQ cho việc xử lý trích xuất hóa đơn
    BullModule.registerQueue({
      name: 'invoice-queue',
    }),
  ],
  controllers: [AiController],
  providers: [AiService, AiInvoiceProcessor, AiSecurityService],
})
export class AiModule {}
