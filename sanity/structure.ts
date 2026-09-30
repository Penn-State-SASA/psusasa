import type { StructureBuilder } from "sanity/structure";
import { CHECKIN_PASSWORDS_DOC_ID } from "./lib/queries";

// [schemaType, title, documentId]. documentId defaults to the schema type;
// set it only when the document must live at a specific id.
const SINGLETONS: ReadonlyArray<
  readonly [schemaType: string, title: string, documentId?: string]
> = [
  ["siteSettings", "Site Settings"],
  ["boardMembers", "Board Members"],
  ["formerBoardMembers", "Former Board Members"],
  // Its id has a dot, which hides it from public reads of the dataset.
  ["checkinPasswords", "Door Check-In Passwords", CHECKIN_PASSWORDS_DOC_ID],
  ["homePage", "Home Page"],
  ["aboutPage", "About Page"],
  ["joinPage", "Join Page"],
  ["eventsPage", "Events Page"],
  ["membershipFormCopy", "Membership Form"],
  ["membershipConfirmation", "Membership Confirmation"],
  ["notFoundPage", "404 Page"],
];

// Also keeps these out of "Create new" and removes Duplicate/Delete (see
// sanity.config.ts). For checkinPasswords that's a safety net: a duplicate
// would get a random id with no dot, and be publicly readable.
export const SINGLETON_TYPES = new Set(SINGLETONS.map(([type]) => type));

export const structure = (S: StructureBuilder) =>
  S.list()
    .title("Content")
    .items([
      ...SINGLETONS.map(([schemaType, title, documentId]) =>
        S.listItem()
          .title(title)
          .id(schemaType)
          .child(
            S.document().schemaType(schemaType).documentId(documentId ?? schemaType)
          )
      ),
      S.divider(),
      S.documentTypeListItem("event").title("Events"),
      S.documentTypeListItem("eventCategory").title("Event Categories"),
      S.documentTypeListItem("officer").title("Officers"),
      S.documentTypeListItem("galleryAlbum").title("Gallery"),
      S.documentTypeListItem("announcement").title("Announcements"),
    ]);
