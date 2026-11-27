import { describe, expect, it } from 'vitest';
import buildAirdropNotificationHtml from '../buildAirdropNotificationHtml';

describe('buildAirdropNotificationHtml', () => {
  const base = {
    textSender: 'alice',
    senderUrl: 'https://inprocess.world/alice',
    momentName: 'Dawn',
    collectUrl: 'https://inprocess.world/collect/base:0xabc/1',
    imageUrl: 'https://cdn.example/image.png',
  };

  it('includes sender, moment, collect link, and image', () => {
    const html = buildAirdropNotificationHtml(base);

    expect(html).toContain('href="https://inprocess.world/alice"');
    expect(html).toContain('>alice</a> airdropped a moment to you.');
    expect(html).toContain('Dawn');
    expect(html).toContain('href="https://inprocess.world/collect/base:0xabc/1"');
    expect(html).toContain('src="https://cdn.example/image.png"');
    expect(html).toContain('View on In Process');
  });

  it('omits moment name and image when null', () => {
    const html = buildAirdropNotificationHtml({
      ...base,
      momentName: null,
      imageUrl: null,
    });

    expect(html).not.toContain('Dawn');
    expect(html).not.toContain('<img');
    expect(html).toContain('airdropped a moment to you.');
  });

  it('escapes sender, urls, moment name, and image url', () => {
    const html = buildAirdropNotificationHtml({
      textSender: '<script>x</script>',
      senderUrl: 'https://example.com/"onclick=',
      momentName: 'A & B <C>',
      collectUrl: "https://example.com/'path",
      imageUrl: 'https://cdn.example/a.png"onerror=',
    });

    expect(html).toContain('&lt;script&gt;x&lt;/script&gt;');
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('A &amp; B &lt;C&gt;');
    expect(html).toContain('https://example.com/&quot;onclick=');
    expect(html).toContain('https://example.com/&#39;path');
    expect(html).toContain('https://cdn.example/a.png&quot;onerror=');
  });
});
