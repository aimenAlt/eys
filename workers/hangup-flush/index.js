/**
 * eys-hangup-flush: a scheduled Worker whose only job is to ping
 * https://www.eyshandyman.com/api/quo/flush every 15 minutes.
 *
 * Hang-up texts for calls after 20:00 Chicago time wait in D1 for 8:00.
 * Cloudflare Pages has no cron, and the next Quo webhook (which also flushes
 * the queue) can be many hours after 8:00 on a quiet day, so this ping is
 * what sends them on time. The flush endpoint decides everything itself
 * (hours, every skip rule, HANGUP_TEXT_ENABLED); this Worker holds no
 * secret, binding or data. See docs/quo-hangup-text.md.
 */
export default {
  async scheduled(_controller, _env, ctx) {
    ctx.waitUntil(
      fetch('https://www.eyshandyman.com/api/quo/flush', {
        method: 'POST',
        headers: { 'User-Agent': 'eys-hangup-flush' },
      }),
    );
  },
  async fetch() {
    return new Response('eys-hangup-flush runs on a schedule only.', { status: 404 });
  },
};
