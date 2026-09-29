import { defineField, defineType } from "sanity";

// Pre-filled the first time this singleton is opened in Studio, so it only
// takes a Publish to go live. After that, Studio is the source of truth.
const INITIAL_MEMBERS = [
  { _key: "om-makwana", _type: "formerBoardMember", firstName: "Om", lastName: "Makwana" },
  { _key: "krithika-subramanian", _type: "formerBoardMember", firstName: "Krithika", lastName: "Subramanian" },
  { _key: "manaswee-mishra", _type: "formerBoardMember", firstName: "Manaswee", lastName: "Mishra" },
  { _key: "krisha-patel", _type: "formerBoardMember", firstName: "Krisha", lastName: "Patel" },
  { _key: "rujula-deshmukh", _type: "formerBoardMember", firstName: "Rujula", lastName: "Deshmukh" },
  { _key: "jhanvi-venkitesh", _type: "formerBoardMember", firstName: "Jhanvi", lastName: "Venkitesh" },
  { _key: "mahika-nukavarapu", _type: "formerBoardMember", firstName: "Mahika", lastName: "Nukavarapu" },
  { _key: "nithin-john", _type: "formerBoardMember", firstName: "Nithin", lastName: "John" },
  { _key: "arush-tiwari", _type: "formerBoardMember", firstName: "Arush", lastName: "Tiwari" },
  { _key: "vibha-iyer", _type: "formerBoardMember", firstName: "Vibha", lastName: "Iyer" },
  { _key: "adi-patel", _type: "formerBoardMember", firstName: "Adi", lastName: "Patel" },
  { _key: "jay-patel", _type: "formerBoardMember", firstName: "Jay", lastName: "Patel" },
  { _key: "sneha-arya", _type: "formerBoardMember", firstName: "Sneha", lastName: "Arya" },
  { _key: "krishtika-kalyanaraman", _type: "formerBoardMember", firstName: "Krishtika", lastName: "Kalyanaraman" },
  { _key: "rushil-kakkad", _type: "formerBoardMember", firstName: "Rushil", lastName: "Kakkad" },
  { _key: "adwait-harkare", _type: "formerBoardMember", firstName: "Adwait", lastName: "Harkare" },
  { _key: "sharanya-gera", _type: "formerBoardMember", firstName: "Sharanya", lastName: "Gera" },
  { _key: "gorja-yadav", _type: "formerBoardMember", firstName: "Gorja", lastName: "Yadav" },
];

export default defineType({
  name: "formerBoardMembers",
  title: "Former Board Members (Free Entry)",
  type: "document",
  initialValue: { members: INITIAL_MEMBERS },
  fields: [
    defineField({
      name: "members",
      title: "Former Board Members",
      type: "array",
      description:
        "Former board members get in free at every ticketed event by default and show on the door list tagged \"Former Board\". Untick someone for a specific event under that event's \"Former Board — Free Entry\" field.",
      of: [
        {
          type: "object",
          name: "formerBoardMember",
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
          ],
          preview: {
            select: { firstName: "firstName", lastName: "lastName" },
            prepare({ firstName, lastName }) {
              return {
                title: [firstName, lastName].filter(Boolean).join(" ") || "Former Board Member",
              };
            },
          },
        },
      ],
    }),
  ],
  preview: {
    prepare: () => ({ title: "Former Board Members (Free Entry)" }),
  },
});
