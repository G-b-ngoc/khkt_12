/**
 * Mail adapter cho luồng gửi báo cáo cuối tuần.
 * - Không có SMTP_HOST trong env -> ConsolePreviewMailer: KHÔNG gửi email thật,
 *   chỉ ghi log + trả về bản xem trước. Không bao giờ tuyên bố "đã gửi email" khi
 *   thực ra chưa cấu hình SMTP.
 * - Có SMTP_HOST -> SmtpMailer dùng nodemailer gửi thật.
 */

export type MailResult = { adapter: string; success: boolean; error?: string };

export interface Mailer {
  send(to: string, subject: string, body: string): Promise<MailResult>;
}

class ConsolePreviewMailer implements Mailer {
  async send(to: string, subject: string): Promise<MailResult> {
    console.log(`[mail-preview] (chưa cấu hình SMTP) Sẽ gửi tới ${to}: ${subject}`);
    return { adapter: "console-preview", success: true };
  }
}

class SmtpMailer implements Mailer {
  async send(to: string, subject: string, body: string): Promise<MailResult> {
    try {
      const nodemailer = await import("nodemailer");
      const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
          : undefined,
      });
      await transport.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        text: body,
      });
      return { adapter: "smtp", success: true };
    } catch (err) {
      return { adapter: "smtp", success: false, error: (err as Error).message };
    }
  }
}

export function getMailer(): Mailer {
  return process.env.SMTP_HOST ? new SmtpMailer() : new ConsolePreviewMailer();
}
