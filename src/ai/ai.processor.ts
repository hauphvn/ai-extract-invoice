// Nhận jobs từ hàng đợi, gọi aiService xử lí và lưu trữ kết quả.

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { AiService } from './ai.service';
import { Job } from 'bullmq';


export interface InvoiceJobData {
  rawText: string;
}
@Processor('invoice-queue')
export class AiInvoiceProcessor extends WorkerHost{
  private readonly logger = new Logger(AiInvoiceProcessor.name);

  constructor(
    private readonly aiService: AiService,
  ) {
    super();
  }

  async process(job: Job<InvoiceJobData, any, string>): Promise<any> {
    this.logger.log(`Bắt đầu xử lí job id: ${job.id}`);
    try{
      // Cập nhật tiến độ.
      await job.updateProgress(20);

      // Gọi aiService để trích xuất hóa đơn.
      const result = await this.aiService.extractInvoice(job.data.rawText);

      // Cập nhật tiến độ.
      await job.updateProgress(100);

      // Giá trị trả về sẽ được BullMQ lưu trữ vào trường returnvalue của job.
      return result;
    }catch(err: any){
      this.logger.error(`Lỗi khi xử lí job id: ${job.id}`, err.message);
      throw err;
    }
  }
}
