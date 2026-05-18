export const upcomingEventsQuery = `*[_type == "event" && date >= now()] | order(date asc) {
  _id, title, slug, date, description, coverImage, isFeatured,
  "category": category->{ _id, name, color }
}`;

export const pastEventsQuery = `*[_type == "event" && date < now()] | order(date desc) {
  _id, title, slug, date, description, coverImage, isFeatured,
  "category": category->{ _id, name, color }
}`;

export const featuredEventsQuery = `*[_type == "event" && isFeatured == true && date >= now()] | order(date asc)[0...3] {
  _id, title, slug, date, description, coverImage,
  "category": category->{ _id, name, color }
}`;

export const allEventsQuery = `*[_type == "event"] | order(date desc) {
  _id, _updatedAt, title, slug, date, description, coverImage, isFeatured,
  "category": category->{ _id, name, color }
}`;

export const eventBySlugQuery = `*[_type == "event" && slug.current == $slug][0] {
  _id, title, slug, date, description, coverImage, isFeatured,
  "category": category->{ _id, name, color }
}`;

export const categoriesQuery = `*[_type == "eventCategory"] | order(name asc) {
  _id, name, color
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

export const membershipFormCopyQuery = `*[_id == "membershipFormCopy"][0] {
  priceCents,
  stepLabels{ step1, step2, step3 },
  step1{
    intro,
    labels{ firstName, lastName, psuEmail, phone, year },
    yearOptions,
    errors{
      firstNameRequired, lastNameRequired,
      psuEmailRequired, psuEmailDomain,
      phoneRequired, phoneInvalid, yearRequired
    },
    nextLabel
  },
  step2{
    heading, intro,
    labels{ major, hometown, gender, religion, identity, generation, instagram },
    placeholders{ otherSpecify, instagram },
    otherLabel,
    genderOptions, religionOptions, identityOptions, generationOptions,
    errors{ genderOther, religionOther, identityOther, generationOther },
    backLabel, nextLabel
  },
  step3{
    summaryHeading, productName,
    loadingPaymentText, submitLabel, processingLabel,
    incompletePaymentHint,
    genericError, backLabel
  }
}`;

export const joinPageQuery = `*[_id == "joinPage"][0] {
  hero{ title, subtitle },
  whyJoin{
    heading,
    items[]{ title, description }
  },
  formSection{ heading, subtitle, helpText },
  contact{
    heading,
    cards[]{ label, value, href }
  },
  social{
    heading,
    buttons[]{ label, href }
  }
}`;

export const aboutPageQuery = `*[_id == "aboutPage"][0] {
  hero{ title, subtitle },
  history{ heading, body },
  mission{ heading, quote, body },
  countries{
    heading, subtitle,
    items[]{ name, abbr, countryCode }
  },
  values{
    heading,
    items[]{ title, description }
  }
}`;

export const homePageQuery = `*[_id == "homePage"][0] {
  hero{
    title, tagline, pillars,
    primaryCtaLabel, primaryCtaHref,
    secondaryCtaLabel, secondaryCtaHref
  },
  mission{
    eyebrow, heading, body,
    valueCards[]{ title, description }
  },
  upcomingEvents{ heading, subtitle, emptyMessage, viewAllLabel },
  joinCta{
    heading, description,
    primaryCtaLabel, primaryCtaHref,
    secondaryCtaLabel, secondaryCtaHref
  }
}`;

export const siteSettingsQuery = `*[_id == "siteSettings"][0] {
  navItems[]{ label, href },
  footer{
    tagline,
    quickLinksHeading,
    contactHeading,
    socialHeading,
    copyright
  },
  contact{
    email,
    instagramHandle,
    instagramUrl,
    tiktokHandle,
    tiktokUrl,
    officeAddress
  }
}`;
