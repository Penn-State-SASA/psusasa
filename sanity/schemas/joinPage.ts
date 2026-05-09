import { defineField, defineType } from "sanity";

export default defineType({
  name: "joinPage",
  title: "Join Page",
  type: "document",
  fields: [
    defineField({
      name: "hero",
      title: "Hero",
      type: "object",
      fields: [
        {
          name: "title",
          title: "Title",
          type: "string",
          initialValue: "Join SASA",
        },
        {
          name: "subtitle",
          title: "Subtitle",
          type: "string",
          initialValue:
            "Get involved with one of Penn State's most vibrant cultural organizations.",
        },
      ],
    }),
    defineField({
      name: "whyJoin",
      title: "Why Join Section",
      type: "object",
      fields: [
        {
          name: "heading",
          title: "Heading",
          type: "string",
          initialValue: "Why Join SASA?",
        },
        {
          name: "items",
          title: "Reasons",
          type: "array",
          of: [
            {
              type: "object",
              fields: [
                { name: "title", title: "Title", type: "string" },
                { name: "description", title: "Description", type: "text", rows: 3 },
              ],
              preview: { select: { title: "title" } },
            },
          ],
          initialValue: [
            {
              title: "Cultural Events",
              description:
                "Experience vibrant cultural shows, Diwali celebrations, Holi festivals, and more.",
            },
            {
              title: "Community",
              description:
                "Meet fellow students who share your heritage and make lifelong friendships.",
            },
            {
              title: "Leadership",
              description:
                "Develop leadership skills by joining committees and organizing events.",
            },
            {
              title: "THON",
              description:
                "Be part of our THON efforts — Penn State's largest student-run philanthropy.",
            },
          ],
        },
      ],
    }),
    defineField({
      name: "formSection",
      title: "Form Section",
      type: "object",
      fields: [
        {
          name: "heading",
          title: "Heading",
          type: "string",
          initialValue: "Become a member!",
        },
        {
          name: "subtitle",
          title: "Subtitle",
          type: "string",
          initialValue:
            "Fill out the form below to join — $35 annual membership",
        },
        {
          name: "helpText",
          title: "Help Text Below Form",
          description:
            "Rich text below the form. Use a link mark to make the email clickable.",
          type: "array",
          of: [{ type: "block" }],
        },
      ],
    }),
    defineField({
      name: "contact",
      title: "Get In Touch Section",
      type: "object",
      fields: [
        {
          name: "heading",
          title: "Heading",
          type: "string",
          initialValue: "Get In Touch",
        },
        {
          name: "cards",
          title: "Contact Cards",
          description:
            "Icons stay in code based on card position (1st = email, 2nd = Instagram, 3rd = location).",
          type: "array",
          of: [
            {
              type: "object",
              fields: [
                { name: "label", title: "Label (heading)", type: "string" },
                { name: "value", title: "Value (display text)", type: "string" },
                {
                  name: "href",
                  title: "Link Href",
                  type: "string",
                  description:
                    "Optional. mailto:, https://, etc. Leave empty for plain text (e.g. office address).",
                },
              ],
              preview: {
                select: { title: "label", subtitle: "value" },
              },
            },
          ],
          initialValue: [
            {
              label: "Email",
              value: "exec.psusasa@gmail.com",
              href: "mailto:exec.psusasa@gmail.com",
            },
            {
              label: "Instagram",
              value: "@psusasa",
              href: "https://instagram.com/psusasa",
            },
            {
              label: "Office",
              value: "204 HUB\nPenn State University Park",
              href: "",
            },
          ],
        },
      ],
    }),
    defineField({
      name: "social",
      title: "Social Section",
      type: "object",
      fields: [
        {
          name: "heading",
          title: "Heading",
          type: "string",
          initialValue: "Follow us on social media:",
        },
        {
          name: "buttons",
          title: "Social Buttons",
          description:
            "Icons stay in code based on position (1st = Instagram, 2nd = TikTok).",
          type: "array",
          of: [
            {
              type: "object",
              fields: [
                {
                  name: "label",
                  title: "Aria Label",
                  type: "string",
                },
                { name: "href", title: "Href", type: "url" },
              ],
              preview: { select: { title: "label", subtitle: "href" } },
            },
          ],
          initialValue: [
            { label: "Instagram", href: "https://instagram.com/psusasa" },
            { label: "TikTok", href: "https://tiktok.com/@sasapsu" },
          ],
        },
      ],
    }),
  ],
  preview: {
    prepare: () => ({ title: "Join Page" }),
  },
});
