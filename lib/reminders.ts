// lib/reminders.ts — reusable WhatsApp reminder sender via Twilio

export interface ReminderResident {
  name: string;
  phone: string;
}

export interface ReminderPayment {
  amount: number;
  month: number;
  year: number;
}

export interface ReminderBuilding {
  name: string;
  unitNumber: string;
}

export function buildReminderMessage(
  resident: ReminderResident,
  payment: ReminderPayment,
  building: ReminderBuilding
): string {
  const firstName = resident.name.split(' ')[0];
  return `Bonjour ${firstName},

Votre charge de ${payment.amount} MAD pour ${building.name} (Appt ${building.unitNumber}) est due ce mois-ci.

Pour toute question, contactez votre syndic.

— SyndicPro`;
}

export async function sendWhatsApp(phone: string, message: string): Promise<void> {
  const normalized = phone.replace(/\s/g, '').replace(/^0/, '+212');

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
        ).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        To: `whatsapp:${normalized}`,
        Body: message,
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Twilio error: ${err.message}`);
  }
}

export async function sendPaymentReminder(
  resident: ReminderResident,
  payment: ReminderPayment,
  building: ReminderBuilding
): Promise<void> {
  const message = buildReminderMessage(resident, payment, building);
  await sendWhatsApp(resident.phone, message);
}
