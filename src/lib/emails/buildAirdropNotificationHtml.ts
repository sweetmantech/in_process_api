import escapeHtml from '@/lib/escapeHtml';

const AIRDROP_EMAIL_BG_URL =
  'https://brkgwpqp7yqqnws4as5app5nmcqzbygpcnixqjhmc2pitgf5auma.turbo-gateway.com/DFRrPg_-IQbaXAS6B7-tYKGQ4M8TUXgk7BaeiZi9BRg';

export default function buildAirdropNotificationHtml({
  textSender,
  senderUrl,
  momentName,
  collectUrl,
  imageUrl,
}: {
  textSender: string;
  senderUrl: string;
  momentName: string | null;
  collectUrl: string;
  imageUrl: string | null;
}): string {
  const safeSender = escapeHtml(textSender);
  const safeSenderUrl = escapeHtml(senderUrl);
  const safeMomentName = momentName ? escapeHtml(momentName) : null;
  const safeCollectUrl = escapeHtml(collectUrl);
  const safeImageUrl = imageUrl ? escapeHtml(imageUrl) : null;

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>You received an airdrop</title>
  </head>
  <body style="margin:0;padding:0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:12px 16px 24px;">
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1;color:#221e17;padding:0;">
            in·process
          </div>
        </td>
      </tr>
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:630px;background:#f1ede4 url('${AIRDROP_EMAIL_BG_URL}') repeat;border:1px solid #ddd4c4;border-radius:20px;padding:42px 42px 34px;font-family:Georgia,'Times New Roman',serif;color:#221e17;">
            ${
              safeMomentName
                ? `<tr>
              <td style="font-size:28px;line-height:1.2;color:#a8862f;padding-bottom:18px;">
                ${safeMomentName}
              </td>
            </tr>`
                : ''
            }
            <tr>
              <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:16px;line-height:1.55;color:#221e17;padding-bottom:28px;">
                <a href="${safeSenderUrl}" style="color:#221e17;text-decoration:none;font-weight:700;">${safeSender}</a> airdropped a moment to you.
              </td>
            </tr>
            ${
              safeImageUrl
                ? `<tr>
              <td style="padding-bottom:26px;">
                <img src="${safeImageUrl}" alt="${safeMomentName ?? ''}" style="display:block;width:100%;max-width:470px;margin:0 auto;border:0;border-radius:8px;" />
              </td>
            </tr>`
                : ''
            }
            <tr>
              <td align="center" style="padding-bottom:28px;">
                <a href="${safeCollectUrl}" style="display:inline-block;background:#221e17;color:#ffffff;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:14px;font-weight:600;letter-spacing:0.4px;line-height:1;padding:16px 34px;border-radius:999px;">
                  View on In Process
                </a>
              </td>
            </tr>
            <tr>
              <td align="center" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:11px;line-height:1.5;color:#9a9284;">
                In Process · notifications@inprocess.world
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `;
}
