import { NextResponse } from 'next/server';
import { sendWhatsAppImageMessage, getWhatsAppSettings } from '@/lib/whatsapp-service';

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      phone,
      image,
      caption,
      bill_no,
      customer_name,
      total_amount,
      current_bill,
      payment,
      bill_balance,
      previous_balance,
      total_balance
    } = body;

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
      const billVal = current_bill !== undefined && current_bill !== null ? current_bill : total_amount;
      if (billVal !== undefined && billVal !== null && billVal !== '') {
        finalCaption += `\nCurrent Bill: Rs. ${Math.round(Number(billVal) || 0).toLocaleString('en-US')}`;
      }
      if (payment !== undefined && payment !== null && payment !== '') {
        finalCaption += `\nPayment: Rs. ${Math.round(Number(payment) || 0).toLocaleString('en-US')}`;
      }
      if (bill_balance !== undefined && bill_balance !== null && bill_balance !== '') {
        finalCaption += `\nBill Balance: Rs. ${Math.round(Number(bill_balance) || 0).toLocaleString('en-US')}`;
      }
      if (previous_balance !== undefined && previous_balance !== null && previous_balance !== '') {
        finalCaption += `\nPrevious Balance: Rs. ${Math.round(Number(previous_balance) || 0).toLocaleString('en-US')}`;
      }
      if (total_balance !== undefined && total_balance !== null && total_balance !== '') {
        finalCaption += `\nTotal Balance: Rs. ${Math.round(Number(total_balance) || 0).toLocaleString('en-US')}`;
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

