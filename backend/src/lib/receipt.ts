import PDFDocument from 'pdfkit';
import path from 'path';
import { numberToVietnameseWords, formatVnd } from './money';

const FONT_DIR = path.join(process.cwd(), 'node_modules', 'dejavu-fonts-ttf', 'ttf');
const FONT = path.join(FONT_DIR, 'DejaVuSans.ttf');
const FONT_BOLD = path.join(FONT_DIR, 'DejaVuSans-Bold.ttf');
const FONT_COND = path.join(FONT_DIR, 'DejaVuSansCondensed.ttf');

export const PAYMENT_ITEM_LABELS: Record<string, string> = {
  deposit: 'Cọc giữ chỗ',
  tuition: 'Học phí',
  pdf_material: 'Giáo trình PDF',
  makeup_hours: 'Học phí giờ bù',
  other: 'Khác',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Chuyển khoản',
  cash: 'Tiền mặt',
  e_wallet: 'Ví điện tử',
};

export interface ReceiptData {
  receiptCode: string;
  paymentDate: Date;
  studentName: string;
  studentCode: string;
  studentPhone?: string | null;
  courseName?: string | null;
  classCode?: string | null;
  itemType: string;
  content?: string | null;
  amount: number;
  method: string;
  collectorName?: string | null;
}

// Phiếu thu A5 ngang — font DejaVu hỗ trợ tiếng Việt
export function buildReceiptPdf(data: ReceiptData, org: { name: string; sub?: string }): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: 'A5', layout: 'landscape', margin: 40 });
  const W = doc.page.width - 80; // content width

  doc.registerFont('regular', FONT);
  doc.registerFont('bold', FONT_BOLD);
  doc.registerFont('cond', FONT_COND);

  // Header: trung tâm + quốc hiệu style
  doc.font('bold').fontSize(13).text(org.name.toUpperCase(), { align: 'left' });
  if (org.sub) doc.font('regular').fontSize(9).fillColor('#444').text(org.sub, { align: 'left' });

  doc.moveUp(2);
  doc.font('regular').fontSize(10).fillColor('#000')
    .text(`Ngày ${data.paymentDate.getDate()} tháng ${data.paymentDate.getMonth() + 1} năm ${data.paymentDate.getFullYear()}`, { align: 'right' });

  doc.moveDown(1.2);
  doc.font('bold').fontSize(20).text('PHIẾU THU', { align: 'center' });
  doc.font('regular').fontSize(11).text(`Số: ${data.receiptCode}`, { align: 'center' });
  doc.moveDown(0.8);

  // Body
  doc.font('regular').fontSize(10.5);
  const line = (label: string, value: string) => {
    doc.font('cond').fillColor('#555').text(label, { continued: false, width: 140 });
    const y = doc.y - 14;
    doc.font('regular').fillColor('#000').text(value, 180, y, { width: W - 140 });
    doc.moveDown(0.45);
  };

  line('Họ tên người nộp:', `${data.studentName}  (${data.studentCode})`);
  if (data.studentPhone) line('Điện thoại:', data.studentPhone);
  if (data.courseName) line('Khóa học:', data.courseName + (data.classCode ? `  —  Lớp ${data.classCode}` : ''));
  line('Nội dung thu:', `${PAYMENT_ITEM_LABELS[data.itemType] || data.itemType}${data.content ? ` — ${data.content}` : ''}`);
  line('Hình thức:', PAYMENT_METHOD_LABELS[data.method] || data.method);
  doc.moveDown(0.3);

  // Amount box
  doc.font('bold').fontSize(13).text(`Số tiền: ${formatVnd(data.amount)}`);
  doc.font('regular').fontSize(10).fillColor('#333')
    .text(`(Bằng chữ: ${numberToVietnameseWords(data.amount)})`);
  doc.moveDown(1.4);

  // Signatures
  const colW = W / 3;
  const sigY = doc.y;
  doc.font('bold').fontSize(10).fillColor('#000');
  doc.text('Người nộp tiền', 40, sigY, { width: colW, align: 'center' });
  doc.text('Người thu tiền', 40 + colW, sigY, { width: colW, align: 'center' });
  doc.text('Giám đốc', 40 + colW * 2, sigY, { width: colW, align: 'center' });
  doc.font('regular').fontSize(9).fillColor('#666');
  doc.text('(Ký, họ tên)', 40, sigY + 14, { width: colW, align: 'center' });
  doc.text('(Ký, họ tên)', 40 + colW, sigY + 14, { width: colW, align: 'center' });
  doc.text('(Ký, họ tên)', 40 + colW * 2, sigY + 14, { width: colW, align: 'center' });
  if (data.collectorName) {
    doc.font('regular').fontSize(9).fillColor('#333')
      .text(data.collectorName, 40 + colW, sigY + 60, { width: colW, align: 'center' });
  }

  doc.end();
  return doc;
}
