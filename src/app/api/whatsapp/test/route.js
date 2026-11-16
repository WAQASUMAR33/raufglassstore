import { NextResponse } from 'next/server';
import { sendWhatsAppTextMessage, checkWhatsAppConnection } from '@/lib/whatsapp-service';

export async function POST(req) {
  try {
    const body = await req.json();
    const { phone } = body;

    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'Recipient phone number is required.' },
        { status: 400 }
      );
    }

    const testMessage = `Assalam-o-Alaikum! 🌟\nThis is a test notification from Zain Traders Mandi Bahauddin POS.\nYour WhatsApp automation gateway is active and configured correctly.\nPh: 0302-2133218, 0347-7743218`;

    const result = await sendWhatsAppTextMessage({
      to: phone,
      text: testMessage,
    });

    return NextResponse.json({
      success: true,
      message: 'Test message sent successfully!',
      ...result,
    });
  } catch (err) {
    console.error('Error sending test WhatsApp message:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to send test message' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const status = await checkWhatsAppConnection();
    return NextResponse.json({
      success: true,
      ...status,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

