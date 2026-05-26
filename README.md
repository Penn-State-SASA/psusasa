# SASA — Penn State South Asian Student Association

The official website for Penn State's South Asian Student Association (SASA), founded September 30, 1960. Built with Next.js, Tailwind CSS, and Sanity CMS.

**Live site:** [psusasa.com](https://psusasa.com)

## Tech Stack

- **Framework:** Next.js 14 (App Router, Server Components)
- **Styling:** Tailwind CSS with custom `sasa-*` color palette
- **CMS:** Sanity (headless, hosted at `/studio`)
- **Deployment:** Vercel
- **Fonts:** Playfair Display (headings) + Inter (body)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Create `.env.local` with the following. Vercel's project settings page is the source of truth — copy from there if you have access.

```env
# Sanity (CMS)
NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2024-01-01
SANITY_REVALIDATE_SECRET=your_webhook_secret

# Stripe (membership payments)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_or_live_...
STRIPE_SECRET_KEY=sk_test_or_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Airtable (member roster)
AIRTABLE_API_KEY=pat...
AIRTABLE_BASE_ID=app...
AIRTABLE_TABLE_NAME=Members  # optional, defaults to "Members"

# GroupMe (auto-add new members to the group chat)
GROUPME_ACCESS_TOKEN=...
GROUPME_GROUP_ID=...

# Resend (admin notification email when GroupMe auto-add falls through)
RESEND_API_KEY=re_...
ADMIN_NOTIFICATION_EMAIL=exec.psusasa@gmail.com
```

To get your Sanity project ID:
1. Go to [sanity.io/manage](https://www.sanity.io/manage)
2. Create a new project (or use an existing one)
3. Copy the Project ID from the project settings

> **Note:** Sanity, Stripe webhook secret, and Resend can be skipped for read-only local browsing of pre-existing content, but anything involving the `/join` flow (membership form, payment, post-payment redirect) requires the full Stripe + Airtable + GroupMe stack to work end-to-end.

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the website and [http://localhost:3000/studio](http://localhost:3000/studio) for the Sanity CMS.

## Project Structure

```
src/
  app/
    page.tsx                          # Home page
    layout.tsx                        # Root layout (fonts, metadata)
    not-found.tsx                     # CMS-driven 404 page
    (site)/                           # Route group for public pages (Navbar + Footer)
      layout.tsx
      about/page.tsx
      events/page.tsx
      events/[slug]/page.tsx
      eboard/page.tsx
      gallery/page.tsx
      join/page.tsx
      join/return/page.tsx            # Post-payment success / pending / error
    studio/[[...tool]]/page.tsx       # Embedded Sanity Studio
    api/
      revalidate/route.ts             # Sanity webhook -> revalidatePath
      create-payment-intent/route.ts  # Stripe PaymentIntent for membership
      stripe-webhook/route.ts         # Stripe webhook -> Airtable + GroupMe
  components/
    layout/     # Navbar, Footer
    shared/     # SectionHeading, Button, EventCard
    sanity/     # SanityImage, PortableTextRenderer
    home/       # Hero, MissionSection, UpcomingEvents, JoinCTA
    events/     # EventGrid, CategoryFilter
    eboard/     # OfficerCard
    gallery/    # GalleryGrid, ImageLightbox
    join/       # MembershipForm, ClearSavedForm
  lib/
    types.ts    # TypeScript interfaces
    airtable.ts # Append member rows to Airtable
    groupme.ts  # Auto-add member to GroupMe (+ admin email fallback)
sanity/
  lib/
    client.ts   # Sanity client
    image.ts    # Image URL builder
    queries.ts  # All GROQ queries
    types.ts    # TypeScript interfaces for Sanity content
  schemas/      # event, eventCategory, officer, galleryImage, announcement,
                # siteSettings, homePage, aboutPage, joinPage,
                # membershipFormCopy, membershipConfirmation, notFoundPage
  structure.ts  # Studio sidebar layout (singletons vs collections)
sanity.config.ts
```

## Managing Content via Sanity Studio

Navigate to `/studio` (e.g., `localhost:3000/studio` or `psusasa.com/studio`) to access the CMS. The sidebar is split into two sections: **singletons** (one-and-only-one page-content docs at the top) and **collections** (lists of items below the divider).

### Editing page content (singletons)

These docs control text, hero copy, CTAs, and form labels across the site. Each one is unique — you edit it, you don't create more. Click into one, change fields, click **Publish** (the **Publish** button matters — autosaves only save drafts and aren't read by the live site).

| Singleton | What it controls |
|-----------|------------------|
| **Site Settings** | Navbar links, footer copy, contact info, social handles |
| **Home Page** | Hero, mission section, upcoming-events module copy, join CTA block |
| **About Page** | Hero, history, mission, countries-we-represent list, values |
| **Join Page** | Hero, "Why Join SASA" reasons, form section heading/subtitle/help text, contact cards, social buttons |
| **Membership Form** | Field labels, year/gender/religion/identity/generation options, error messages, button labels, the membership price (in cents) |
| **Membership Confirmation** | The `/join/return` page after successful payment — title, body (`{{price}}` token auto-fills from Membership Form), Next Steps bullets, CTA buttons, plus pending and direct-visit error states |
| **404 Page** | Title, subtitle, body, primary + optional secondary CTA buttons |

> **Caching note:** most pages have ISR with `revalidate = 60`, so published changes appear on the live site within ~60 seconds. The `/join/return` and `/not-found` pages render on every request, so their edits show immediately.

### Adding Events

1. Go to **Studio > Event**
2. Click **+ Create**
3. Fill in:
   - **Title** — event name
   - **Slug** — click "Generate" to auto-create from title
   - **Date** — date and time of the event
   - **Description** — details about the event
   - **Cover Image** — upload a photo (recommended: 1200x750px)
   - **Category** — select one: Cultural Show, Festival, Social, THON, or Community Service
   - **Featured** — toggle on to show on the home page (up to 3 featured events display)
4. Click **Publish**

### Updating Officers / E-Board

1. Go to **Studio > Officer**
2. Click **+ Create**
3. Fill in:
   - **Name** — officer's full name
   - **Role** — select from: President, Vice President, Treasurer, Secretary, Cultural Chair, Events Chair, PR Chair, THON Chair
   - **Headshot** — upload a photo (recommended: square, 400x400px)
   - **Bio** — optional short bio
   - **Display Order** — number for sorting (1 = first, 2 = second, etc.)
4. Click **Publish**

To update between semesters: unpublish or delete outgoing officers, create new ones.

### Adding Gallery Images

1. Go to **Studio > Gallery Image**
2. Click **+ Create**
3. Fill in:
   - **Image** — upload the photo
   - **Caption** — optional description
   - **Event** — optionally link to an event
   - **Semester** — e.g., "Fall 2025", "Spring 2026" (used for grouping)
4. Click **Publish**

### Creating Announcements

1. Go to **Studio > Announcement**
2. Fill in title, body (rich text), and published date
3. Click **Publish**

## Deployment (Vercel)

### Initial Setup

1. Push the repo to GitHub
2. Import the repo on [vercel.com](https://vercel.com)
3. Add environment variables in Vercel project settings (same as `.env.local`)
4. Deploy

### Setting Up Revalidation Webhook

To auto-update the site when CMS content changes:

1. In Vercel, note your deployed URL (e.g., `https://psusasa.com`)
2. In [sanity.io/manage](https://www.sanity.io/manage), go to your project > API > Webhooks
3. Create a new webhook:
   - **URL:** `https://psusasa.com/api/revalidate`
   - **Trigger on:** Create, Update, Delete
   - **Secret:** same value as `SANITY_REVALIDATE_SECRET` in your env vars
4. Save

Now publishing content in Sanity will automatically refresh the live site.

## Color Palette

All brand colors are available as Tailwind classes under the `sasa-*` namespace:

| Color | Tailwind Class | Hex |
|-------|---------------|-----|
| Deep Red (darkest) | `sasa-red-900` | `#590404` |
| Red | `sasa-red-700` | `#a10000` |
| Bright Red | `sasa-red-500` | `#e30000` |
| Crimson | `sasa-red-600` | `#810220` |
| Gold (dark) | `sasa-gold-600` | `#cda563` |
| Gold (light) | `sasa-gold-400` | `#ffd37e` |
| Sage | `sasa-sage` | `#d9dfa5` |
| Forest Green | `sasa-forest` | `#0f5444` |
| Neutral (light) | `sasa-neutral-400` | `#a2aaad` |
| Neutral (dark) | `sasa-neutral-500` | `#7b7171` |

## Contact & Socials

- **Instagram:** [@psusasa](https://instagram.com/psusasa)
- **TikTok:** [@sasapsu](https://tiktok.com/@sasapsu)
- **Email:** exec.psusasa@gmail.com
- **Office:** 204 HUB, Penn State University Park
