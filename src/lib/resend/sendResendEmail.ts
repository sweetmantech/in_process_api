import { validateResendEnv } from '@/lib/resend/validateResendEnv';
import { getResendClient } from '@/lib/resend/client';

export default async function sendResendEmail({
  to,
  subject,
  html,
}: {
  to: string | string[];
  subject: string;
  html: string;
}): Promise<void> {
  const { fromEmail } = validateResendEnv();
  const resend = getResendClient();
  if (!resend) {
    throw new Error('[resend] Resend client not initialized');
  }

  const { error } = await resend.emails.send({
    from: fromEmail,
    to,
    subject,
    html,
  });
  if (error) {
    throw new Error(`[resend] ${error.name}: ${error.message}`);
  }
}
