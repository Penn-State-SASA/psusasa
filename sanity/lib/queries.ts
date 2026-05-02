export const upcomingEventsQuery = `*[_type == "event" && date >= now()] | order(date asc) {
  _id, title, slug, date, description, coverImage, category, isFeatured
}`;

export const pastEventsQuery = `*[_type == "event" && date < now()] | order(date desc) {
  _id, title, slug, date, description, coverImage, category, isFeatured
}`;

export const featuredEventsQuery = `*[_type == "event" && isFeatured == true && date >= now()] | order(date asc)[0...3] {
  _id, title, slug, date, description, coverImage, category
}`;

export const allEventsQuery = `*[_type == "event"] | order(date desc) {
  _id, title, slug, date, description, coverImage, category, isFeatured
}`;

export const eventBySlugQuery = `*[_type == "event" && slug.current == $slug][0] {
  _id, title, slug, date, description, coverImage, category, isFeatured
}`;

export const officersQuery = `*[_type == "officer"] | order(order asc) {
  _id, name, role, headshot, bio, order
}`;

export const galleryQuery = `*[_type == "galleryImage"] | order(semester desc, _createdAt desc) {
  _id, image, caption, semester,
  "eventTitle": event->title
}`;

export const announcementsQuery = `*[_type == "announcement"] | order(publishedAt desc)[0...5] {
  _id, title, body, publishedAt
}`;
