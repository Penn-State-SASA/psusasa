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

Copy `.env.local.example` or create `.env.local` with:

```env
NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2024-01-01
SANITY_API_READ_TOKEN=your_read_token
SANITY_REVALIDATE_SECRET=your_webhook_secret
```

To get your Sanity project ID:
1. Go to [sanity.io/manage](https://www.sanity.io/manage)
2. Create a new project (or use an existing one)
3. Copy the Project ID from the project settings

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the website and [http://localhost:3000/studio](http://localhost:3000/studio) for the Sanity CMS.

## Project Structure

```
src/
  app/
    page.tsx                    # Home page
    layout.tsx                  # Root layout (fonts, metadata)
    (site)/                     # Route group for public pages
      layout.tsx                # Navbar + Footer wrapper
      about/page.tsx
      events/page.tsx
      events/[slug]/page.tsx
      eboard/page.tsx
      gallery/page.tsx
      join/page.tsx
    studio/[[...tool]]/page.tsx # Embedded Sanity Studio
    api/revalidate/route.ts     # Webhook for on-demand revalidation
  components/
    layout/     # Navbar, Footer
    shared/     # SectionHeading, Button, EventCard
    sanity/     # SanityImage, PortableTextRenderer
    home/       # Hero, MissionSection, UpcomingEvents, JoinCTA
    events/     # EventGrid, CategoryFilter
    eboard/     # OfficerCard
    gallery/    # GalleryGrid, ImageLightbox
  lib/
    types.ts    # TypeScript interfaces
sanity/
  lib/
    client.ts   # Sanity client
    image.ts    # Image URL builder
    queries.ts  # All GROQ queries
  schemas/      # event, officer, galleryImage, announcement
sanity.config.ts
```

## Managing Content via Sanity Studio

Navigate to `/studio` (e.g., `localhost:3000/studio` or `psusasa.com/studio`) to access the CMS.

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
