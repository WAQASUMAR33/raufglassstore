import { NextResponse } from 'next/server';
import { sendWhatsAppImageMessage, getWhatsAppSettings } from '@/lib/whatsapp-service';

export async function POST(req) {
  try {
    const body = await req.json();
    const { phone, image, caption, bill_no, customer_name, total_amount } = body;

    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'Recipient phone number is required.' },
        { status: 400 }
      );
    }

    if (!image) {
      return NextResponse.json(
        { success: false, error: 'Image data is required.' },
        { status: 400 }
      );
    }

    const settings = await getWhatsAppSettings();

    // Prepare message caption
    let finalCaption = caption;
    if (!finalCaption) {
      finalCaption = settings.custom_caption || 'Assalam-o-Alaikum, here is your bill from Zain Traders Mandi Bahauddin. Thank you for your business! Ph: 0302-2133218, 0347-7743218';
      if (bill_no) {
        finalCaption += `\nInvoice #${bill_no}`;
      }
      if (customer_name) {
        finalCaption += `\nCustomer: ${customer_name}`;
      }
      if (total_amount) {
        finalCaption += `\nAmount: Rs. ${Number(total_amount).toLocaleString()}`;
      }
    }

    const result = await sendWhatsAppImageMessage({
      to: phone,
      image,
      caption: finalCaption,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error('Error sending WhatsApp invoice:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to send WhatsApp message' },
      { status: 500 }
    );
  }
}

