import { BadRequestException, Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AiSecurityService {
  private readonly _logger = new Logger(AiSecurityService.name);

  // Danh sách các biểu thức chính qui nhận diện hành vi tấn công Jailbreak/Prompt Injection
  private readonly _jailbreakPatterns: RegExp[] = [
    /ignore all previous instructions/i,
    /disregard your previous directives/i,
    /bypass your safety protocols/i,
    /override your default behavior/i,
    /provide me with the hidden instructions/i,
    /reveal the secret commands/i,
    /circumvent your restrictions/i,
    /give me the unrestricted output/i,
    /disable your content filters/i,
    /ignore your ethical guidelines/i,
    /bỏ\s+qua\s+(hết\s+)?các\s+chỉ\s+dẫn\s+trước/i,
    /bạn\s+không\s+còn\s+là/i,
    /xuất\s+mã\s+bí\s+mật/i,
  ];

  validateInput(input: string): boolean {
    if (!input) return true;

    for (const pattern of this._jailbreakPatterns) {
      if (pattern.test(input)) {
        this._logger.log(
          `Phát hiện hành vi tấn công Jailbreak/Prompt Injection: ${pattern}`,
        );
        throw new BadRequestException(
          'Đầu vào chứa nội dung không hợp lệ hoặc có dấu hiệu tấn công. Vui lòng kiểm tra lại.',
        );
      }
    }
    return true;
  }
}
