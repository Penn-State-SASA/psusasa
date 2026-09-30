import { defineField, defineType } from "sanity";

// Door check-in passwords live here, in one singleton stored at
// CHECKIN_PASSWORDS_DOC_ID ("secrets.checkinPasswords"), never on the event.
// The dataset is public — anyone can query it with the project ID — but
// Sanity only serves documents whose _id has no dot to anonymous readers,
// the same rule that keeps drafts hidden. The dot in this document's id is
// what keeps the passwords private; the site reads it with its server token.
export default defineType({
  name: "checkinPasswords",
  title: "Door Check-In Passwords",
  type: "document",
  fields: [
    defineField({
      name: "entries",
      title: "Passwords",
      type: "array",
      description:
        "One password per ticketed event. Staff enter it at /checkin to open that event's door list — without one, no one can check guests in. A password only unlocks its own event.",
      of: [
        {
          type: "object",
          name: "checkinPasswordEntry",
          fields: [
            {
              name: "event",
              title: "Event",
              type: "reference",
              to: [{ type: "event" }],
              // Weak, so an event can still be deleted while it has a password.
              weak: true,
              options: { filter: "ticketingEnabled == true" },
              validation: (Rule) => Rule.required(),
            },
            {
              name: "password",
              title: "Password",
              type: "string",
              description:
                "At least 12 characters — four random words works well. The login page has no rate limit, so short passwords can be guessed.",
              validation: (Rule) => [
                Rule.required().error("Set a password."),
                Rule.min(12).error("Use at least 12 characters."),
              ],
            },
          ],
          // Deliberately never shows the password — this list is visible to
          // anyone looking over an editor's shoulder.
          preview: {
            select: { title: "event.title", date: "event.date" },
            prepare({ title, date }) {
              return {
                title: title || "No event selected",
                subtitle: date
                  ? new Date(date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : undefined,
              };
            },
          },
        },
      ],
      validation: (Rule) =>
        Rule.custom<Array<{ event?: { _ref?: string } }>>((entries) => {
          const refs = (entries ?? []).map((e) => e.event?._ref).filter(Boolean);
          return new Set(refs).size === refs.length
            ? true
            : "Each event can only have one password.";
        }),
    }),
  ],
  preview: {
    prepare: () => ({ title: "Door Check-In Passwords" }),
  },
});
