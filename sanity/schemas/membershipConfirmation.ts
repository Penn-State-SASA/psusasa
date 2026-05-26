import { defineField, defineType } from "sanity";

export default defineType({
  name: "membershipConfirmation",
  title: "Membership Confirmation",
  type: "document",
  fields: [
    defineField({
      name: "successState",
      title: "Success State (Payment Completed)",
      type: "object",
      fields: [
        {
          name: "heroTitle",
          title: "Hero Title",
          type: "string",
          initialValue: "You're officially a SASA member!",
        },
        {
          name: "cardTitle",
          title: "Card Title",
          type: "string",
          initialValue: "Welcome to SASA!",
        },
        {
          name: "body",
          title: "Body Message",
          description:
            "Rich text shown under the title. Use the placeholder {{price}} anywhere and it will be replaced with the live membership price (synced with Membership Form).",
          type: "array",
          of: [{ type: "block" }],
        },
        {
          name: "nextStepsHeading",
          title: "'Next Steps' Heading",
          type: "string",
          initialValue: "Next steps:",
        },
        {
          name: "nextSteps",
          title: "Next Steps Bullets",
          description:
            "Each bullet has main text plus an optional inline link appended after the text.",
          type: "array",
          of: [
            {
              type: "object",
              fields: [
                {
                  name: "text",
                  title: "Text",
                  type: "string",
                },
                {
                  name: "linkLabel",
                  title: "Link Label (optional)",
                  type: "string",
                  description:
                    "If set, appears after the text as a clickable link.",
                },
                {
                  name: "linkHref",
                  title: "Link Href (optional)",
                  type: "string",
                  description:
                    "Internal path (e.g. /events) or external URL (e.g. https://...).",
                },
              ],
              preview: {
                select: { title: "text", subtitle: "linkLabel" },
              },
            },
          ],
          initialValue: [
            {
              text: "Follow us on Instagram:",
              linkLabel: "@psusasa",
              linkHref: "https://instagram.com/psusasa",
            },
            {
              text: "Check your email (spam folder) for a confirmation receipt from Stripe",
            },
            {
              text: "We'll reach out with details on how to join our GroupMe community",
            },
          ],
        },
        {
          name: "ctas",
          title: "CTA Buttons",
          description:
            "First button uses the primary (red) style. Second button uses the outlined gold style. Additional buttons fall back to the gold style.",
          type: "array",
          of: [
            {
              type: "object",
              fields: [
                {
                  name: "label",
                  title: "Label",
                  type: "string",
                },
                {
                  name: "href",
                  title: "Link",
                  type: "string",
                },
              ],
              preview: { select: { title: "label", subtitle: "href" } },
            },
          ],
          initialValue: [
            { label: "Back to Home", href: "/" },
            { label: "See Upcoming Events", href: "/events" },
          ],
        },
      ],
    }),
    defineField({
      name: "pendingState",
      title: "Pending / Failed Payment State",
      type: "object",
      fields: [
        {
          name: "heroTitle",
          title: "Hero Title",
          type: "string",
          initialValue: "Payment Status",
        },
        {
          name: "message",
          title: "Message",
          type: "string",
          initialValue:
            "Your payment is still processing or was not completed.",
        },
        {
          name: "retryLabel",
          title: "Retry Button Label",
          type: "string",
          initialValue: "Try Again",
        },
        {
          name: "retryHref",
          title: "Retry Button Link",
          type: "string",
          initialValue: "/join",
        },
      ],
    }),
    defineField({
      name: "errorState",
      title: "Error State (Direct Visit)",
      description:
        "Shown when someone lands on /join/return without a payment_intent (e.g. visited the URL directly).",
      type: "object",
      fields: [
        {
          name: "heroTitle",
          title: "Hero Title",
          type: "string",
          initialValue: "Join SASA",
        },
        {
          name: "message",
          title: "Error Message",
          description:
            "Rich text. Use a link mark on a word/phrase (e.g. 'try again') so visitors can click to retry.",
          type: "array",
          of: [{ type: "block" }],
        },
      ],
    }),
  ],
  preview: {
    prepare: () => ({ title: "Membership Confirmation" }),
  },
});
