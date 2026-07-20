import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac } from 'crypto';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { Resend } from 'resend';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_BROWSER_API_KEY,
  authDomain: 'newsdash-concourse.firebaseapp.com',
  projectId: 'newsdash-concourse',
  storageBucket: 'newsdash-concourse.firebasestorage.app',
  messagingSenderId: '809304184792',
  appId: '1:809304184792:web:55f10ffc84aab0b6db04ad',
};

function getDb() {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return getFirestore(app);
}

// ─── Shortcut metadata ────────────────────────────────────────────────────────

const SHORTCUTS = [
  { id: 'ai-innovation-daily-review',         name: 'AI Innovation Daily Review' },
  { id: 'global-climate-headlines-weekly',    name: 'Latest Climate Headlines Weekly' },
  { id: 'massachusetts-climate-news-weekly',  name: 'Massachusetts Climate News Weekly' },
  { id: 'new-england-climate-news-weekly',    name: 'New England Climate News Weekly' },
  { id: 'boston-climate-news-monthly',        name: 'Boston Climate News Monthly' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extracts the first section from a markdown string — the section heading
 * plus the first substantive paragraph beneath it.
 * Falls back to the first non-heading paragraph if no heading is found,
 * and to the raw first 500 characters if no paragraph exists at all.
 */
function extractFirstParagraph(text: string): string {
  const stripInline = (s: string) =>
    s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
     .replace(/[*_`]/g, '')
     .replace(/\n/g, ' ')
     .trim();

  const blocks = text.split(/\n\n+/);

  // Find the first heading block and the first paragraph that follows it
  for (let i = 0; i < blocks.length; i++) {
    const trimmed = blocks[i].trim();
    if (!trimmed.startsWith('#')) continue;

    const heading = trimmed.replace(/^#+\s*/, '').trim();

    // Find the first plain paragraph after this heading
    for (let j = i + 1; j < blocks.length; j++) {
      const next = blocks[j].trim();
      if (!next) continue;
      const firstChar = next[0];
      if (firstChar === '#' || firstChar === '-' || firstChar === '*' || firstChar === '>' || firstChar === '|') continue;
      return `${heading}: ${stripInline(next)}`;
    }

    // Heading found but no paragraph beneath it — return just the heading
    return heading;
  }

  // Fallback: first non-heading paragraph
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    const firstChar = trimmed[0];
    if (firstChar === '#' || firstChar === '-' || firstChar === '*' || firstChar === '>' || firstChar === '|') continue;
    return stripInline(trimmed);
  }

  // Last resort: raw text capped at 500 characters
  return text.replace(/\n/g, ' ').substring(0, 500).trim();
}

/**
 * Generates the HMAC-SHA256 token used to authenticate one-click
 * unsubscribe links embedded in outbound emails.
 */
function generateUnsubscribeToken(userId: string): string {
  const secret = process.env.UNSUBSCRIBE_HMAC_SECRET ?? '';
  return createHmac('sha256', secret).update(userId).digest('hex');
}

// ─── Email template ───────────────────────────────────────────────────────────

type ShortcutSection = { name: string; paragraph: string };

/**
 * Builds the full HTML email string for a single subscriber.
 * Each shortcut gets a named section with a one-paragraph excerpt.
 * Styled to match the NewsDash app's warm earthy light-theme palette.
 */
function buildEmailHtml(sections: ShortcutSection[], unsubscribeUrl: string, appUrl: string): string {
  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const logoUrl = `${appUrl}/newsdash_green.png`;

  const sectionHtml = sections.map(({ name, paragraph }, i) => `
    <tr>
      <td style="padding:20px 36px 0;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#8B4513;">${name}</p>
        <p style="margin:0 0 20px;font-size:14px;line-height:1.75;color:#4A3528;${i < sections.length - 1 ? 'border-bottom:1px solid #D4C4B0;' : ''}padding-bottom:20px;">${paragraph}</p>
      </td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>NewsDash Weekly Digest</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F3F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F3F0;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #D4C4B0;">
          <tr>
            <td style="background-color:#2D1B0F;padding:24px 36px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-right:14px;vertical-align:middle;">
                    <img src="${logoUrl}" alt="NewsDash logo" height="40" style="display:block;border-radius:8px;height:40px;width:auto;">
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0 0 2px;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;font-family:'Courier New',Courier,monospace;font-style:italic;">NewsDash</p>
                    <p style="margin:0;font-size:13px;color:#A08060;">Weekly Digest &mdash; ${date}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 36px 8px;">
              <p style="margin:0;font-size:14px;line-height:1.6;color:#6B4E3D;">Here&rsquo;s a summary of this week&rsquo;s stories across your five news categories.</p>
            </td>
          </tr>
          ${sectionHtml}
          <tr>
            <td style="padding:24px 36px;border-top:1px solid #D4C4B0;margin-top:8px;">
              <p style="margin:0;font-size:12px;color:#6B4E3D;text-align:center;line-height:1.8;">
                You&rsquo;re receiving this because you subscribed to the NewsDash weekly digest.<br>
                <a href="${unsubscribeUrl}" style="color:#8B4513;text-decoration:underline;">Unsubscribe</a>
                &nbsp;&middot;&nbsp;
                <a href="${appUrl}" style="color:#8B4513;text-decoration:underline;">Open NewsDash</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * Triggered weekly by a GitHub Actions cron job.
 * Reads cached responses for all 5 shortcuts from Firestore, extracts one
 * paragraph each, then sends a digest email to every active subscriber via Resend.
 * Protected by a CRON_SECRET bearer token to prevent unauthorised execution.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Auth guard ─────────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers['authorization'];
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorised' });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const appUrl = process.env.NODE_ENV === 'development' ? (process.env.DEV_APP_URL ?? 'https://newsdash.concourse.codes') : (process.env.APP_URL ?? 'https://newsdash.concourse.codes');
  const fromEmail = process.env.NODE_ENV === 'development' ? (process.env.LOCAL_EMAIL_FROM ?? 'onboarding@resend.dev') : (process.env.EMAIL_FROM ?? 'onboarding@resend.dev');

  try {
    const db = getDb();

    // ── 1. Fetch all 5 prompt_cache documents in parallel ──────────────────
    const cacheSnapshots = await Promise.all(
      SHORTCUTS.map(s => getDoc(doc(db, 'prompt_cache', s.id)))
    );

    const sections: ShortcutSection[] = SHORTCUTS.map((shortcut, i) => {
      const snap = cacheSnapshots[i];
      if (!snap.exists()) {
        return { name: shortcut.name, paragraph: 'No recent data available — open NewsDash to generate this week\'s content.' };
      }
      const entry = snap.data();
      // Support both the nested-data schema and the legacy flat schema
      const text: string = entry?.data?.text ?? entry?.text ?? '';
      return {
        name: shortcut.name,
        paragraph: text ? extractFirstParagraph(text) : 'No content available for this category.',
      };
    });

    // ── 2. Fetch all active subscribers ────────────────────────────────────
    const subsQuery = query(collection(db, 'email_subscriptions'), where('active', '==', true));
    const subsSnapshot = await getDocs(subsQuery);

    if (subsSnapshot.empty) {
      return res.status(200).json({ sent: 0, message: 'No active subscribers' });
    }

    // ── 3. Send one email per subscriber ───────────────────────────────────
    let sent = 0;
    const errors: string[] = [];

    for (const subDoc of subsSnapshot.docs) {
      const { email } = subDoc.data() as { email: string };
      const userId = subDoc.id;

      const sig = generateUnsubscribeToken(userId);
      const unsubscribeUrl = `${appUrl}/api/unsubscribe?uid=${userId}&sig=${sig}`;
      const html = buildEmailHtml(sections, unsubscribeUrl, appUrl);

      const { error } = await resend.emails.send({
        from: fromEmail,
        to: email,
        subject: `NewsDash Weekly Digest — ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`,
        html,
      });

      if (error) {
        console.error(`[send-weekly-report] Failed to send to ${email}:`, error);
        errors.push(email);
      } else {
        sent++;
      }
    }

    console.log(`[send-weekly-report] Sent ${sent} emails. Errors: ${errors.length}`);
    return res.status(200).json({ sent, errors: errors.length > 0 ? errors : undefined });

  } catch (err) {
    console.error('[send-weekly-report] Fatal error:', err);
    return res.status(500).json({ error: 'Failed to send weekly report' });
  }
}
