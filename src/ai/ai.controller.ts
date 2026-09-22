import {
  BadRequestException,
  Body,
  Controller, Get, Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { AiService } from './ai.service';
import { ExtraRequestDto } from './dto/extract-request.dto';
import { InvoiceDto } from './dto/invoice.schema';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { MultimodalExtractionResult } from './dto/multimodalExtractionResult';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CreateEvaluationDTO } from './dto/evaluation.dto';

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    // Inject queue
    @InjectQueue('invoice-queue')
    private readonly invoiceQueue: Queue,
    ) {}

  @Post('extract-invoice')
  async extractInvoice(@Body() body: ExtraRequestDto): Promise<InvoiceDto> {
    return this.aiService.extractInvoice(body.text);
  }

  @Post('stream-analysis')
  async streamAnalysis(
    @Body() body: ExtraRequestDto,
    @Res() res: Response,
  ): Promise<void> {
    await this.aiService.streamAiResponse(body.text, res);
  }

  @Post('extract-invoice-image')
  @UseInterceptors(FileInterceptor('file')) // Sử dụng interceptor để xử lý file upload
  async extractImageInvoice(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<MultimodalExtractionResult> {
    if (!file) {
      throw new BadRequestException(
        'Vui lòng tải file ảnh lên với key là "file".',
      );
    }
    return this.aiService.extractInvoiceFromImage(file.buffer, file.mimetype);
  }

  // Api liên quan queue
  @Post('jobs/extract')
  async createExtractJob(@Body() body: ExtraRequestDto) {
    if(!body.text){
      throw new BadRequestException('Trường text không được bỏ trống');
    }

    // Đưa job vào hàng đợi, với cấu hình tự thử lại 3 lần nếu lỗi
    const job = await this.invoiceQueue.add(
      'process-invoice',
      {rawText: body.text},
      {
        attempts: 3,
        backoff: {
          type: 'exponential', // Tăng dần thời gian chờ giữa các lần thử lại
          delay: 5000, // 5 giây cho lần thử đầu tiên, sau đó tăng dần
        },
        removeOnComplete: false, // Giữ lại job sau khi hoàn thành để có thể xem kết quả
      }
    );
    return {
      message: 'Tác vụ đã được tiếp nhận và đang được xử lý.',
      jobId: job.id,
      status: 'pending'
    }
  }

  // Endpoint: tra cứu trạng thái và lấy dữ liệu của job
  @Get('jobs/:jobId')
  async getJobStatus(@Param('jobId') jobId: string) {
    const job = await this.invoiceQueue.getJob(jobId);
    if (!job) {
      throw new BadRequestException(`Không tìm thấy job với id: ${jobId}`);
    }

    const state = await job.getState();
    const progress = job.progress;
    const returnValue = job.returnvalue; // Kết quả trả về nếu job đã hoàn thành

    return {
      jobId: job.id,
      state,
      progress,
      result: returnValue || null,
    };
  }

  // Đánh giá các bảng extract invoice của AI
  @Post('evaluation')
  async saveEvaluation(@Body() dto: CreateEvaluationDTO) {
    return this.aiService.saveEvaluationDTO(dto);
  }

  @Get('evaluations')
  async getEvaluations() {
    return this.aiService.getEvaluationDTO();
  }
}
