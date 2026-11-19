import { NextResponse } from 'next/server';
import { getWhatsAppSettings, saveWhatsAppSettings, checkWhatsAppConnection } from '@/lib/whatsapp-service';

export async function GET() {
  try {
    const settings = await getWhatsAppSettings();
    const connectionStatus = await checkWhatsAppConnection();

    return NextResponse.json({
      success: true,
      settings: {
        is_enabled: settings.is_enabled,
        instance_id: settings.instance_id,
        api_token: settings.api_token ? `${settings.api_token.slice(0, 4)}••••••••${settings.api_token.slice(-3)}` : '',
        has_token: Boolean(settings.api_token),
        auto_send_on_sale: settings.auto_send_on_sale,
        custom_caption: settings.custom_caption,
        api_provider: settings.api_provider || 'green-api',
        api_url: settings.api_url || 'https://api.green-api.com',
      },
      connection: connectionStatus,
    });
  } catch (err) {
    console.error('Error fetching WhatsApp settings:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const existing = await getWhatsAppSettings();

    // If api_token wasn't changed (masked or empty), retain existing token
    let apiToken = body.api_token?.trim();
    if (!apiToken || apiToken.includes('••••')) {
      apiToken = existing.api_token || '';
    }

    await saveWhatsAppSettings(null, {
      is_enabled: body.is_enabled,
      instance_id: body.instance_id,
      api_token: apiToken,
      auto_send_on_sale: body.auto_send_on_sale,
      custom_caption: body.custom_caption,
      api_provider: body.api_provider || 'green-api',
      api_url: body.api_url || 'https://api.green-api.com',
    });

    const connection = await checkWhatsAppConnection();

    return NextResponse.json({
      success: true,
      message: 'WhatsApp settings saved successfully.',
      connection,
    });
  } catch (err) {
    console.error('Error updating WhatsApp settings:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

