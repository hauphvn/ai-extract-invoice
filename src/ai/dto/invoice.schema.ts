import {z} from 'zod';

// Schema chi tiết từng mặt hàng trong hóa đơn.

export const InvoiceItemSchema = z.object({
  description: z.string().describe('Tên hàng hóa hoặc dịch vụ'),
  quantity: z.number().nullable().describe('Số lượng'),
  unitPrice: z.number().nullable().describe('Đơn giá'),
  totalAmount: z.number().nullable().describe('Thành tiền của mặt hàng'),
});

// Schema tổng thể của hóa đơn
export const InvoiceSchema = z.object({
  vendorName: z
    .string()
    .nullable()
    .describe('Tên đơn vị bán hoặc nhà cung cấp. Trả về null nếu không có.'),
  invoiceNumber: z
    .string()
    .nullable()
    .describe('Số hóa đơn. Trả về null nếu không có.'),
  invoiceDate: z
    .string()
    .nullable()
    .describe(
      'Ngày phát hành hóa đơn theo định dạng YYYY-MM-DD. Trả về null nếu không có.',
    ),
  currency: z
    .string()
    .nullable()
    .describe('Đơn vị tiền tệ (ví dụ VND, USD). Trả về null nếu không có.'),
  items: z
    .array(InvoiceItemSchema)
    .describe('Danh sách mặt hàng. Trả về mảng rỗng [] nếu không có.'),
  subtotal: z
    .number()
    .nullable()
    .describe('Tổng tiền trước thuế. Trả về null nếu không có.'),
  taxRate: z
    .number()
    .nullable()
    .describe('Thuế suất. Trả về null nếu không có.'),
  taxAmount: z
    .number()
    .nullable()
    .describe('Tiền thuế. Trả về null nếu không có.'),
  totalAmount: z
    .number()
    .nullable()
    .describe('Tổng số tiền cần thanh toán. Trả về null nếu không có.'),
});
// Tạo kiểu TypeScript từ Zod schema
export type InvoiceDto= z.infer<typeof InvoiceSchema>;
