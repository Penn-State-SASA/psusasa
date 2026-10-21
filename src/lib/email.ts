/** Loose "looks like an email" check — matches what the ticket form has always used. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * True for a bare @psu.edu address. Ticket confirmations go to a personal
 * inbox, so the contact email must not be the university one. Subdomain
 * addresses (e.g. @ems.psu.edu) are deliberately allowed.
 */
export function isPsuEmail(email: string): boolean {
  return /@psu\.edu$/i.test(email.trim());
}

export const PSU_CONTACT_EMAIL_ERROR =
  "Please use a personal email, not your PSU email — confirmations go here.";

/**
 * Strict "is this a plain @psu.edu address" check — exact domain, no
 * subdomains (unlike isPsuEmail above). Used both client-side on the
 * purchase form and server-side in resolveTicketOrder to decide member
 * pricing and to require a real PSU email when a buyer claims to be a
 * Penn State student.
 */
export const PSU_MEMBER_EMAIL_RE = /^[^\s@]+@psu\.edu$/i;
