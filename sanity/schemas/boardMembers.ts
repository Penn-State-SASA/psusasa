import { defineField, defineType } from "sanity";

export default defineType({
  name: "boardMembers",
  title: "Board Members (Door +1 List)",
  type: "document",
  fields: [
    defineField({
      name: "members",
      title: "Current Board Members",
      type: "array",
      description:
        "Board members eligible for the free door +1 on events where it's enabled. Keep this current as the board changes.",
      of: [
        {
          type: "object",
          name: "boardMember",
          fields: [
            {
              name: "firstName",
              title: "First Name",
              type: "string",
              validation: (Rule) => Rule.required(),
            },
            {
              name: "lastName",
              title: "Last Name",
              type: "string",
              validation: (Rule) => Rule.required(),
            },
            // Names only — this document is publicly readable, so no emails
            // or other contact details belong here.
          ],
          preview: {
            select: { firstName: "firstName", lastName: "lastName" },
            prepare({ firstName, lastName }) {
              return {
                title: [firstName, lastName].filter(Boolean).join(" ") || "Board Member",
              };
            },
          },
        },
      ],
    }),
  ],
  preview: {
    prepare: () => ({ title: "Board Members (Door +1 List)" }),
  },
});
