import { OpenAI } from 'openai';
import { InvoiceDto, InvoiceSchema } from './dto/invoice.schema';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { zodResponseFormat } from 'openai/helpers/zod';
import { Response } from 'express';
import { MultimodalExtractionResult } from './dto/multimodalExtractionResult';
import { CreateEvaluationDTO, ResultEvaluationDTO } from './dto/evaluation.dto';
import { AiSecurityService } from './ai-security.service';

@Injectable()
export class AiService {
  private openapi: OpenAI;
  private readonly logger = new Logger('AiService');
  private evaluationRecords: Array<
    CreateEvaluationDTO & { id: string; createdAt: Date }
  > = []; // Lưu trữ tạm thời các bản đánh giá; & {id: string; createdAt: Date}: Thêm id và createdAt để dễ quản lý

  constructor(private readonly securityService: AiSecurityService) {
    this.openapi = new OpenAI({
      apiKey:
        process.env.OPENAI_API_KEY ||
        '',
    });
  }

  /**
   * Trích xuất thông tin hóa đơn từ văn bản thô và ép kiểu trả về
   * @param rawText Văn bản thô chứa thông tin hóa đơn
   */
  async extractInvoice(rawText: string): Promise<InvoiceDto> {
    if (!rawText || rawText.trim().length <= 0) {
      throw new BadRequestException('Văn bản đầu vào không được để trống.');
    }

    this.securityService.validateInput(rawText); // Kiểm tra bảo mật đầu vào
    try {
      const clientResponse = await this.openapi.chat.completions.parse({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Bạn là chuyên gia trích xuất thông tin từ hóa đơn. Hãy trả về dữ liệu theo đúng định dạng JSON đã được cung cấp.',
          },
          {
            role: 'user',
            content: rawText,
          },
        ],
        response_format: zodResponseFormat(InvoiceSchema, 'invoice_extraction'),
        temperature: 0.1, // Giảm thiểu ảo , tăng độ chính xác.
      });
      const parsedData = clientResponse.choices[0].message.parsed;

      if (!parsedData) {
        throw new InternalServerErrorException(
          'AI không trả về dữ liệu hợp lệ.',
        );
      }

      const validationResult = InvoiceSchema.parse(parsedData);

      return validationResult;
    } catch (e: any) {
      if (e?.name === 'ZodError') {
        throw new BadRequestException({
          message: 'Dữ liệu AI trả về không khớp với schema kiểm thực',
          details: e.errors,
        });
      }

      throw new InternalServerErrorException(
        'Lỗi khi gọi api AI: ' + e.message,
      );
    }
  }

  async streamAiResponse(prompt: string, res: Response): Promise<void> {
    if (!prompt || prompt.trim().length === 0) {
      throw new BadRequestException('Prompt không được để trống.');
    }

    // Thiết lập header chuẩn cho Sever sent events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Gửi header ngay lập tức

    try {
      const stream = await this.openapi.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Bạn là một chuyên gia phân tích tài chính, hãy trả lời chi tiết, mạch lạc.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        stream: true,
        temperature: 0.7,
      });

      // Lặp qua từng chunk dữ liệu từ stream nhận được từ OpenAI
      for await (const chunk of stream) {
        const content = chunk.choices[0].delta?.content || '';

        if (content) {
          // Bắn ra sự kiện subscriber trình duyệt sẽ nhận được ngay lặp tức
          // subscriber.next({data: content} as MessageEvent);
          res.write(`data: ${JSON.stringify(content)}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();

      // Gửi tín hiệu hoàn tất stream
      // subscriber.next({
      //   data: {done: true}
      // } as MessageEvent);
      // subscriber.complete();
    } catch (err: any) {
      // subscriber.error(new InternalServerErrorException(`Lỗi stream: ${err.message}`));
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }

    // });
  }

  /**
   * Trích xuất thông tin hóa đơn từ file hình ảnh và thống kê token sử dụng
   * @param fileBuffer
   * @param mimeType
   */
  async extractInvoiceFromImage(
    fileBuffer: Buffer,
    mimeType: string,
  ): Promise<MultimodalExtractionResult> {
    if (!fileBuffer || fileBuffer.length <= 1) {
      throw new BadRequestException('File ảnh không được để trống.');
    }

    // 1. Chuyển đổi fileBuffer thành base64
    const base64Image = fileBuffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    try {
      const response = await this.openapi.chat.completions.parse({
        // .create và .parse đều được hỗ trợ, nhưng .parse sẽ tự động parse dữ liệu trả về theo response_format
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Bạn là chuyên gia trích xuất dữ liệu hóa đơn từ ảnh chụp. Hãy trả về các phân tích chi tiết trong ảnh và trích xuất đầy đẩu thông tin theo .',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Hãy phân tích và trích xuất thông tin hóa đơn từ ảnh này.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: dataUrl,
                  detail: 'low', // Giúp tiết kiệm token, nếu chữ trong ảnh quá nhỏ, có thể tăng lên 'high' để nhận diện tốt hơn
                },
              },
            ],
          },
        ],
        response_format: zodResponseFormat(InvoiceSchema, 'invoice_extraction'),
        temperature: 0.1, // Giảm thiểu ảo , tăng độ chính xác.
      });

      const parsedData = response.choices[0].message.parsed;

      if (!parsedData) {
        throw new InternalServerErrorException(
          'Không thể phân tích dữ liệu hóa đơn từ hình ảnh.',
        );
      }
      const usage = {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      };

      // Ghi log để theo dõi chi phí sử dụng token
      this.logger.log(
        `[Token Usage] Prompt: ${usage.promptTokens}, Completion: ${usage.completionTokens}, Total: ${usage.totalTokens}`,
      );

      const validateResult = InvoiceSchema.parse(parsedData);

      return {
        data: validateResult,
        usage,
      };
    } catch (e: any) {
      this.logger.error(`Lỗi trích xuất hình ảnh : ${e.message}`);
      throw new InternalServerErrorException(
        `Lỗi trích xuất hình ảnh : ${e.message}`,
      );
    }
  }

  /**
   * Lưu nhận xét đánh giá từ người dùng về kết quả trích xuất hóa đơn.
   * @param dto
   */
  async saveEvaluationDTO(
    dto: CreateEvaluationDTO,
  ): Promise<ResultEvaluationDTO> {
    const record = {
      id: `eval_${Date.now()}`,
      ...dto,
      createdAt: new Date(),
    };
    this.evaluationRecords.push(record);
    this.logger.log(`[AI Evaluation] ghi nhận đánh giá mới ID ${record.id}`);

    return {
      success: true,
      recordId: record.id,
      totalEvaluations: this.evaluationRecords.length,
    };
  }

  /**
   * Lấy tất cả các bản đánh giá đã lưu trữ, phục vụ cho việc thống kê hoặc phân tích.
   */
  async getEvaluationDTO(): Promise<
    Array<CreateEvaluationDTO & { id: string; createdAt: Date }>
  > {
    return this.evaluationRecords;
  }
}
