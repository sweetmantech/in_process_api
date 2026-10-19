import escapeHtml from '@/lib/escapeHtml';

const EMAIL_BG_URL =
  'https://brkgwpqp7yqqnws4as5app5nmcqzbygpcnixqjhmc2pitgf5auma.turbo-gateway.com/DFRrPg_-IQbaXAS6B7-tYKGQ4M8TUXgk7BaeiZi9BRg';
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif";

export default function buildLowTurboCreditHtml({
  credits,
  usd,
  topupUrl,
}: {
  credits: string;
  usd: string;
  topupUrl: string;
}): string {
  const safeCredits = escapeHtml(credits);
  const safeUsd = escapeHtml(usd);
  const safeTopupUrl = escapeHtml(topupUrl);

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Arweave balance is low</title>
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
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:630px;background:#f1ede4 url('${EMAIL_BG_URL}') repeat;border:1px solid #ddd4c4;border-radius:20px;padding:42px 42px 34px;font-family:Georgia,'Times New Roman',serif;color:#221e17;">
            <tr>
              <td style="padding-bottom:32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;">
                  <tr>
                    <td style="padding:22px 26px 26px;font-family:${SANS};color:#221e17;">
                      <div style="font-size:11px;line-height:1;letter-spacing:1.5px;text-transform:uppercase;color:#4a453c;padding-bottom:16px;">
                        <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#7fd58a;vertical-align:middle;margin-right:8px;"></span><span style="vertical-align:middle;">Arweave balance</span>
                      </div>
                      <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="white-space:nowrap;padding-right:18px;border-right:1px solid #e6e1d6;">
                            <span style="font-size:32px;line-height:1;">${safeCredits}</span>
                            <span style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#4a453c;padding-left:6px;">credits</span>
                          </td>
                          <td style="white-space:nowrap;padding-left:18px;">
                            <span style="font-size:32px;line-height:1;">&asymp; $${safeUsd}</span>
                            <span style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#4a453c;padding-left:6px;">USD</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-bottom:28px;">
                <a href="${safeTopupUrl}" style="display:inline-block;background:#221e17;color:#ffffff;text-decoration:none;font-family:${SANS};font-size:14px;font-weight:600;letter-spacing:0.4px;line-height:1;padding:16px 34px;border-radius:999px;">
                  Topup on In Process
                </a>
              </td>
            </tr>
            <tr>
              <td align="center" style="font-family:${SANS};font-size:11px;line-height:1.5;color:#9a9284;">
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
