import { InvoiceDto } from './invoice.schema';

export interface MultimodalExtractionResult {
  data: InvoiceDto;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
