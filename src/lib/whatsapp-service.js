import { prisma as rootPrisma } from '@/lib/prisma';
import { formatWhatsAppPhone } from '@/lib/whatsapp-local';

let schemaReady = false;

/**
 * Ensure `whatsapp_settings` table exists
 */
export async function ensureWhatsAppSettingsTable(db) {
  if (schemaReady) return;
  const client = db ?? rootPrisma;
  try {
    await client.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS whatsapp_settings (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        branch_id INT NOT NULL DEFAULT 1,
        api_provider VARCHAR(32) NOT NULL DEFAULT 'ultramsg',
        instance_id VARCHAR(128) NULL,
        api_token VARCHAR(255) NULL,
        is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        auto_send_on_sale BOOLEAN NOT NULL DEFAULT TRUE,
        custom_caption TEXT NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_wa_branch (branch_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    schemaReady = true;
  } catch (err) {
    console.error('Error ensuring whatsapp_settings table:', err);
  }
}

/**
 * Get WhatsApp settings (combines DB with environment variables as fallback)
 */
export async function getWhatsAppSettings(db) {
  await ensureWhatsAppSettingsTable(db);
  const client = db ?? rootPrisma;

  try {
    const rows = await client.$queryRawUnsafe(`
      SELECT * FROM whatsapp_settings WHERE branch_id = 1 LIMIT 1
    `);

    if (rows && rows.length > 0) {
      const r = rows[0];
      return {
        is_enabled: Boolean(r.is_enabled),
        instance_id: r.instance_id || process.env.WHATSAPP_INSTANCE_ID || '',
        api_token: r.api_token || process.env.WHATSAPP_API_TOKEN || '',
        auto_send_on_sale: Boolean(r.auto_send_on_sale),
        custom_caption: r.custom_caption || 'Assalam-o-Alaikum, here is your bill from Zain Traders Mandi Bahauddin. Thank you for your business! Ph: 0302-2133218, 0347-7743218',
        api_provider: r.api_provider || 'ultramsg',
      };
    }
  } catch (err) {
    console.error('Error fetching whatsapp_settings from DB:', err);
  }

  // Fallback to process.env
  return {
    is_enabled: Boolean(process.env.WHATSAPP_INSTANCE_ID && process.env.WHATSAPP_API_TOKEN),
    instance_id: process.env.WHATSAPP_INSTANCE_ID || '',
    api_token: process.env.WHATSAPP_API_TOKEN || '',
    auto_send_on_sale: true,
    custom_caption: 'Assalam-o-Alaikum, here is your bill from Zain Traders Mandi Bahauddin. Thank you for your business! Ph: 0302-2133218, 0347-7743218',
    api_provider: 'ultramsg',
  };
}

/**
 * Save WhatsApp configuration settings
 */
export async function saveWhatsAppSettings(db, settings) {
  await ensureWhatsAppSettingsTable(db);
  const client = db ?? rootPrisma;

  const {
    is_enabled = false,
    instance_id = '',
    api_token = '',
    auto_send_on_sale = true,
    custom_caption = '',
    api_provider = 'ultramsg',
  } = settings;

  await client.$executeRawUnsafe(`
    INSERT INTO whatsapp_settings (
      branch_id, api_provider, instance_id, api_token, is_enabled, auto_send_on_sale, custom_caption
    ) VALUES (1, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      api_provider = VALUES(api_provider),
      instance_id = VALUES(instance_id),
      api_token = VALUES(api_token),
      is_enabled = VALUES(is_enabled),
      auto_send_on_sale = VALUES(auto_send_on_sale),
      custom_caption = VALUES(custom_caption)
  `,
    api_provider,
    instance_id.trim(),
    api_token.trim(),
    Boolean(is_enabled),
    Boolean(auto_send_on_sale),
    custom_caption.trim()
  );

  return { success: true };
}

/**
 * Send an image through the configured gateway
 */
export async function sendWhatsAppImageMessage({ to, image, caption = '' }, db) {
  const settings = await getWhatsAppSettings(db);

  if (!settings.is_enabled || !settings.instance_id || !settings.api_token) {
    throw new Error('WhatsApp Gateway is not enabled or credentials are missing.');
  }

  const formattedPhone = formatWhatsAppPhone(to);
  if (!formattedPhone) {
    throw new Error(`Invalid recipient phone number: ${to}`);
  }

  const instanceId = settings.instance_id.trim();
  const token = settings.api_token.trim();

  // UltraMsg API endpoint
  const url = `https://api.ultramsg.com/${instanceId}/messages/image`;

  const payload = new URLSearchParams();
  payload.append('token', token);
  payload.append('to', formattedPhone);
  payload.append('image', image);
  if (caption) payload.append('caption', caption);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: payload.toString(),
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    console.error('UltraMsg error response:', data);
    throw new Error(data.error?.message || data.error || data.message || 'Failed to send WhatsApp image');
  }

  return {
    success: true,
    messageId: data.id || data.message_id || 'sent',
    phone: formattedPhone,
  };
}

/**
 * Send a plain text message through the configured gateway
 */
export async function sendWhatsAppTextMessage({ to, text }, db) {
  const settings = await getWhatsAppSettings(db);

  if (!settings.is_enabled || !settings.instance_id || !settings.api_token) {
    throw new Error('WhatsApp Gateway is not enabled or credentials are missing.');
  }

  const formattedPhone = formatWhatsAppPhone(to);
  if (!formattedPhone) {
    throw new Error(`Invalid recipient phone number: ${to}`);
  }

  const instanceId = settings.instance_id.trim();
  const token = settings.api_token.trim();

  const url = `https://api.ultramsg.com/${instanceId}/messages/chat`;

  const payload = new URLSearchParams();
  payload.append('token', token);
  payload.append('to', formattedPhone);
  payload.append('body', text);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: payload.toString(),
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error?.message || data.error || 'Failed to send WhatsApp message');
  }

  return {
    success: true,
    messageId: data.id || data.message_id || 'sent',
    phone: formattedPhone,
  };
}

/**
 * Check gateway connection status
 */
export async function checkWhatsAppConnection(db) {
  const settings = await getWhatsAppSettings(db);

  if (!settings.instance_id || !settings.api_token) {
    return { connected: false, message: 'Instance ID or Token missing' };
  }

  try {
    const url = `https://api.ultramsg.com/${settings.instance_id.trim()}/instance/status?token=${settings.api_token.trim()}`;
    const res = await fetch(url, { method: 'GET' });
    const data = await res.json();

    if (res.ok && data.status?.account_status === 'authenticated') {
      return { connected: true, status: data.status };
    }
    return {
      connected: false,
      message: data.status?.account_status || data.error || 'Not authenticated',
      details: data,
    };
  } catch (err) {
    return { connected: false, message: err.message };
  }
}

