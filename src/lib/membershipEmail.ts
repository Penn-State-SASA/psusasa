import { Resend } from "resend";
import { MEMBERSHIP_FROM, REPLY_TO } from "@/lib/emailSender";
import { formatPrice, sendAdminAlert } from "@/lib/adminAlert";

interface MembershipConfirmationDetails {
  psuEmail: string;
  firstName: string;
  amountPaidCents: number;
}

// The welcome email goes out from exactly one of the two fulfillment paths
// and is never retried, so a failed send would otherwise mean the member
// silently never hears from us. Telling the board lets someone follow up
// by hand.
async function alertWelcomeNotSent(
  details: MembershipConfirmationDetails,
  reason: string
) {
  await sendAdminAlert(
    `Welcome email not sent to new member ${details.psuEmail || "(no PSU email)"}`,
    [
      `A membership payment went through and was recorded in Airtable, but`,
      `the welcome email to the new member could not be sent.`,
      ``,
      `Reason: ${reason}`,
      ``,
      `Name: ${details.firstName.trim() || "(none)"}`,
      `PSU email: ${details.psuEmail || "(none)"}`,
      `Amount paid: ${formatPrice(details.amountPaidCents)}`,
      ``,
      `Stripe's receipt was still sent. Please reach out to them by hand.`,
    ]
  );
}

// Sent once per membership signup. /join/return has always told the new
// member "a confirmation email will be sent to the PSU email you provided",
// but nothing ever sent one — the only mail they got was Stripe's receipt.
//
// Goes to the PSU email because that is the only address the membership form
// collects (the personal-email rule is ticket-only), and it's the address the
// return page promises. Best-effort: a failure here is logged and reported
// to the board, not thrown — it must never block fulfillment, which is
// already recorded in Airtable by the time this is called.
export async function sendMembershipConfirmationEmail(
  details: MembershipConfirmationDetails
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // No alert: it would go through the same unconfigured Resend account.
    console.error("Cannot send membership confirmation email — RESEND_API_KEY not set.");
    return false;
  }
  if (!details.psuEmail) {
    console.error("Cannot send membership confirmation email — no PSU email on signup.");
    await alertWelcomeNotSent(details, "the signup has no PSU email");
    return false;
  }

  const resend = new Resend(apiKey);
  const greeting = details.firstName.trim() ? `Hi ${details.firstName.trim()},` : "Hi,";

  try {
    // The SDK resolves with { data: null, error } on an API error rather
    // than throwing, so the catch below only ever sees network/transport
    // failures — `error` has to be inspected explicitly or every rejected
    // send reads as a success. This is exactly how the ticket confirmations
    // 403'd silently for three weeks.
    const { data, error } = await resend.emails.send({
      from: MEMBERSHIP_FROM,
      replyTo: REPLY_TO,
      to: details.psuEmail,
      subject: "Welcome to SASA — your membership is confirmed!",
      text: [
        greeting,
        "",
        "You're officially a member of Penn State's South Asian Student",
        "Association. Thanks for joining us!",
        "",
        `Amount paid: ${formatPrice(details.amountPaidCents)}`,
        "",
        "What's next:",
        "- You'll be added to our GroupMe, where everything gets announced first",
        "- Follow us on Instagram: https://instagram.com/psusasa",
        "- Members get discounted (sometimes free) tickets to our events —",
        "  use this same PSU email at checkout and the discount applies itself",
        "",
        "Stripe will send a separate receipt for the payment.",
        "",
        "See you soon!",
        "SASA",
      ].join("\n"),
    });

    if (error) {
      console.error(
        `Membership confirmation FAILED for ${details.psuEmail} — ` +
          `${error.name}: ${error.message}`
      );
      await alertWelcomeNotSent(details, `Resend rejected it (${error.name}: ${error.message})`);
      return false;
    }

    console.log(
      `Membership confirmation email sent to ${details.psuEmail} (id ${data?.id})`
    );
    return true;
  } catch (err) {
    console.error(
      `Membership confirmation FAILED for ${details.psuEmail} — threw:`,
      err
    );
    await alertWelcomeNotSent(
      details,
      `the send threw (${err instanceof Error ? err.message : String(err)})`
    );
    return false;
  }
}
