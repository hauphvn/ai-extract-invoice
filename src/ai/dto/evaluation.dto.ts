export class CreateEvaluationDTO {
  jobId?: string;
  originalInput: string;
  aiOutput: Record<string,any>;
  isAccurate: boolean; // đúng hay sai
  rating: number; // đánh giá từ 1-5
  correctedOutput?: Record<string,any>; // nếu sai thì sửa lại
  notes?:string;
}

export class ResultEvaluationDTO {
  success: boolean;
  recordId: string;
  totalEvaluations: number;
}
