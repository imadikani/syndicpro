import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;

export const twilioClient = twilio(accountSid, authToken);

export const TWILIO_WHATSAPP_FROM = `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER || "+14155238886"}`;

export function normalizePhone(phone: string): string {
  return phone.replace(/\s/g, "").replace(/^0/, "+212");
}

export async function sendWhatsApp(to: string, body: string) {
  return twilioClient.messages.create({
    from: TWILIO_WHATSAPP_FROM,
    to: `whatsapp:${to}`,
    body,
  });
}

export async function sendSms(to: string, body: string) {
  return twilioClient.messages.create({
    from: process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_WHATSAPP_NUMBER!,
    to,
    body,
  });
}
