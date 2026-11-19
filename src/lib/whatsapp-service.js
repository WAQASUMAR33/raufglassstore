import { prisma as rootPrisma } from '@/lib/prisma';
import { formatWhatsAppPhone } from '@/lib/whatsapp-local';

let schemaReady = false;

/**
 * Ensure `whatsapp_settings` table exists and has all required columns
 */
export async function ensureWhatsAppSettingsTable(db) {
  if (schemaReady) return;
  const client = db ?? rootPrisma;
  try {
    await client.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS whatsapp_settings (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        branch_id INT NOT NULL DEFAULT 1,
        api_provider VARCHAR(32) NOT NULL DEFAULT 'green-api',
        api_url VARCHAR(255) NOT NULL DEFAULT 'https://api.green-api.com',
        instance_id VARCHAR(128) NULL,
        api_token VARCHAR(255) NULL,
        is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        auto_send_on_sale BOOLEAN NOT NULL DEFAULT TRUE,
        custom_caption TEXT NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_wa_branch (branch_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure api_url column exists for existing tables
    try {
      await client.$executeRawUnsafe(`
        ALTER TABLE whatsapp_settings ADD COLUMN IF NOT EXISTS api_url VARCHAR(255) NOT NULL DEFAULT 'https://api.green-api.com';
      `);
    } catch (_) {}

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
        api_provider: r.api_provider || 'green-api',
        api_url: r.api_url || process.env.WHATSAPP_API_URL || 'https://api.green-api.com',
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
    api_provider: process.env.WHATSAPP_PROVIDER || 'green-api',
    api_url: process.env.WHATSAPP_API_URL || 'https://api.green-api.com',
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
    api_provider = 'green-api',
    api_url = 'https://api.green-api.com',
  } = settings;

  await client.$executeRawUnsafe(`
    INSERT INTO whatsapp_settings (
      branch_id, api_provider, api_url, instance_id, api_token, is_enabled, auto_send_on_sale, custom_caption
    ) VALUES (1, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      api_provider = VALUES(api_provider),
      api_url = VALUES(api_url),
      instance_id = VALUES(instance_id),
      api_token = VALUES(api_token),
      is_enabled = VALUES(is_enabled),
      auto_send_on_sale = VALUES(auto_send_on_sale),
      custom_caption = VALUES(custom_caption)
  `,
    api_provider || 'green-api',
    (api_url || 'https://api.green-api.com').trim(),
    instance_id.trim(),
    api_token.trim(),
    Boolean(is_enabled),
    Boolean(auto_send_on_sale),
    custom_caption.trim()
  );

  return { success: true };
}

/**
 * Send an image through the configured gateway (Green-API or UltraMsg)
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
  const provider = (settings.api_provider || 'green-api').toLowerCase();
  const cleanApiUrl = (settings.api_url || 'https://api.green-api.com').trim().replace(/\/+$/, '');

  // 1. GREEN-API Engine
  if (provider === 'green-api') {
    const chatId = `${formattedPhone}@c.us`;

    // Case A: Image is a remote URL
    if (typeof image === 'string' && (image.startsWith('http://') || image.startsWith('https://'))) {
      const url = `${cleanApiUrl}/waInstance${instanceId}/sendFileByUrl/${token}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          urlFile: image,
          fileName: 'bill-receipt.png',
          caption: caption || '',
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        console.error('Green-API error response:', data);
        throw new Error(data.error?.message || data.error || data.message || 'Failed to send WhatsApp image via Green-API');
      }

      return {
        success: true,
        messageId: data.idMessage || 'sent',
        phone: formattedPhone,
        provider: 'green-api',
      };
    }

    // Case B: Image is Base64 data URL
    let buffer;
    let contentType = 'image/png';
    let fileName = 'bill-receipt.png';

    if (image.startsWith('data:')) {
      const matches = image.match(/^data:([A-Za-z0-9\-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        contentType = matches[1];
        buffer = Buffer.from(matches[2], 'base64');
        const ext = contentType.includes('jpeg') ? 'jpg' : (contentType.split('/')[1] || 'png');
        fileName = `bill-receipt.${ext}`;
      } else {
        const rawBase64 = image.replace(/^data:[^;]+;base64,/, '');
        buffer = Buffer.from(rawBase64, 'base64');
      }
    } else {
      buffer = Buffer.from(image, 'base64');
    }

    const blob = new Blob([buffer], { type: contentType });
    const formData = new FormData();
    formData.append('chatId', chatId);
    formData.append('file', blob, fileName);
    if (caption) {
      formData.append('caption', caption);
    }

    const url = `${cleanApiUrl}/waInstance${instanceId}/sendFileByUpload/${token}`;
    const res = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      console.error('Green-API error response:', data);
      throw new Error(data.error?.message || data.error || data.message || 'Failed to send WhatsApp image via Green-API');
    }

    return {
      success: true,
      messageId: data.idMessage || 'sent',
      phone: formattedPhone,
      provider: 'green-api',
    };
  }

  // 2. ULTRAMSG Engine (Legacy fallback)
  const url = `https://api.ultramsg.com/${instanceId}/messages/image`;
  const payload = new URLSearchParams();
  payload.append('token', token);
  payload.append('to', formattedPhone);
  payload.append('image', image);
  if (caption) payload.append('caption', caption);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: payload.toString(),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    console.error('UltraMsg error response:', data);
    throw new Error(data.error?.message || data.error || data.message || 'Failed to send WhatsApp image via UltraMsg');
  }

  return {
    success: true,
    messageId: data.id || data.message_id || 'sent',
    phone: formattedPhone,
    provider: 'ultramsg',
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
  const provider = (settings.api_provider || 'green-api').toLowerCase();
  const cleanApiUrl = (settings.api_url || 'https://api.green-api.com').trim().replace(/\/+$/, '');

  // 1. GREEN-API Engine
  if (provider === 'green-api') {
    const url = `${cleanApiUrl}/waInstance${instanceId}/sendMessage/${token}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: `${formattedPhone}@c.us`,
        message: text,
      }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      console.error('Green-API error response:', data);
      throw new Error(data.error?.message || data.error || data.message || 'Failed to send WhatsApp message via Green-API');
    }

    return {
      success: true,
      messageId: data.idMessage || 'sent',
      phone: formattedPhone,
      provider: 'green-api',
    };
  }

  // 2. ULTRAMSG Engine (Legacy fallback)
  const url = `https://api.ultramsg.com/${instanceId}/messages/chat`;
  const payload = new URLSearchParams();
  payload.append('token', token);
  payload.append('to', formattedPhone);
  payload.append('body', text);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: payload.toString(),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || data.error || 'Failed to send WhatsApp message via UltraMsg');
  }

  return {
    success: true,
    messageId: data.id || data.message_id || 'sent',
    phone: formattedPhone,
    provider: 'ultramsg',
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

  const instanceId = settings.instance_id.trim();
  const token = settings.api_token.trim();
  const provider = (settings.api_provider || 'green-api').toLowerCase();
  const cleanApiUrl = (settings.api_url || 'https://api.green-api.com').trim().replace(/\/+$/, '');

  try {
    if (provider === 'green-api') {
      const url = `${cleanApiUrl}/waInstance${instanceId}/getStateInstance/${token}`;
      const res = await fetch(url, { method: 'GET' });
      const data = await res.json();

      if (res.ok && data.stateInstance === 'authorized') {
        return {
          connected: true,
          status: data,
          message: 'Connected (Authorized)',
          provider: 'green-api',
        };
      }

      const stateDesc = data.stateInstance
        ? (data.stateInstance === 'notAuthorized' ? 'Not Authorized (Please scan QR in Green-API)' : data.stateInstance)
        : (data.message || 'Connection failed');

      return {
        connected: false,
        message: stateDesc,
        details: data,
        provider: 'green-api',
      };
    }

    // UltraMsg status check
    const url = `https://api.ultramsg.com/${instanceId}/instance/status?token=${token}`;
    const res = await fetch(url, { method: 'GET' });
    const data = await res.json();

    if (res.ok && data.status?.account_status === 'authenticated') {
      return { connected: true, status: data.status, provider: 'ultramsg' };
    }
    return {
      connected: false,
      message: data.status?.account_status || data.error || 'Not authenticated',
      details: data,
      provider: 'ultramsg',
    };
  } catch (err) {
    return { connected: false, message: err.message, provider };
  }
}
