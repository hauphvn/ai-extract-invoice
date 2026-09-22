import {z} from 'zod';

// Schema chi tiết từng mặt hàng trong hóa đơn.

export const InvoiceItemSchema = z.object({
  description: z.string().describe('Tên hoặc mô tả món hàng dịch vụ'),
  quantity: z.number().positive().describe('Số lượng mặt hàng'),
  unitPrice: z.number().nonnegative().describe('Đơn giá mặt hàng'),
  totalAmount:z.number().nonnegative().describe('Tổng số tiền mặt hàng'),
  });

// Schema tổng thể của hóa đơn
export const InvoiceSchema = z.object({
  vendorName:z.string().describe('Tên công ty hoặc người bán'),
  invoiceNumber:z.string().nullable().describe('Số hóa đơn hoặc mã chứng từ nếu có'),
  invoiceDate:z.string().describe('Ngày lập hóa đơn, định dạng YYYY-MM-DD'),
  currency:z.string().default('VND').describe('Đơn vị tiền tệ (ví dụ: VND, USD)'),
  items:z.array(InvoiceItemSchema).describe('Danh sách các mặt hàng trong hóa đơn'),
  subtotal: z.number().nonnegative().describe('Tổng tiền trước thuế'),
  taxRate: z.number().nonnegative().describe('Tỷ lệ thuế (ví dụ: 0.1 cho 10%)'),
  taxAmount: z.number().nonnegative().describe('Số tiền thuế'),
  totalAmount: z.number().nonnegative().describe('Tổng số tiền sau thuế'),

});

// Tạo kiểu TypeScript từ Zod schema
export type InvoiceDto= z.infer<typeof InvoiceSchema>;
