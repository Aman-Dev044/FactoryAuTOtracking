# TrackBells — marketing site

The public site (landing page + privacy policy), built with Next.js and
**statically exported**. `npm run build` produces a plain folder of HTML, CSS
and JS in `out/` — deployed exactly the way the CRA build folder is today. No
Node process, no pm2.

The ERP application itself stays where it is; this project only replaces the
public pages.

---

## Why this exists

The CRA app ships an empty `<div id="root">` and renders everything in the
browser. That is fine behind a login, but on a public page it means:

- link-preview bots (WhatsApp, LinkedIn, Facebook, Slack) run no JavaScript, so
  a shared link showed no preview at all
- AI crawlers largely do not execute JavaScript either
- Google renders JS, but queues it, and a 524 KB bundle made that slow

Here every page is pre-rendered at build time, so the HTML a crawler receives
already contains the full page.

| | CRA app | This site |
| --- | --- | --- |
| HTML delivered | empty root div | full page, ~60 KB gzipped |
| First-load JS | 524 KB gzipped | ~176 KB gzipped |
| Per-page title / description | one, shared by every route | per route |
| Open Graph / Twitter cards | none | complete |
| Structured data | none | Organization, WebSite, SoftwareApplication, FAQPage |
| sitemap.xml / robots.txt | none / no sitemap line | generated at build |

---

## Commands

```bash
npm install
npm run dev              # http://localhost:3010, hot reload
npm run build            # -> out/
npm run serve            # preview the built out/ folder locally
npm run optimize-images  # re-compress logos from ../frontend/public
```

---

## Configuration

Copy `.env.example` to `.env.local` and set the three URLs. They are **baked in
at build time**, so changing one needs a rebuild.

| Variable | Used for |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | canonical tags, Open Graph, sitemap, JSON-LD |
| `NEXT_PUBLIC_APP_URL` | every "Sign in" / "Create workspace" link |
| `NEXT_PUBLIC_API_URL` | the demo enquiry form POST |

### Backend CORS

The enquiry form posts to `POST {NEXT_PUBLIC_API_URL}/api/support/ticket` — the
same public endpoint the in-app form uses. Add this site's origin to the
backend's `CORS_ALLOWED_ORIGINS` in `backend/.env`, or the browser will block
the request:

```
CORS_ALLOWED_ORIGINS=...,https://trackbells.com,https://www.trackbells.com
```

---

## Deploying

`out/` is a static folder. Serve it the way the CRA `build/` folder is served
today.

Because `trailingSlash: true` is set, routes are emitted as
`out/privacy-policy/index.html`, which is what a plain `try_files` expects:

```nginx
server {
    server_name trackbells.com www.trackbells.com;
    root /var/www/trackbells-web/out;

    location / {
        try_files $uri $uri/ $uri.html /index.html;
    }

    # hashed assets never change under the same name
    location /_next/static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

The ERP app then lives on its own hostname (`app.trackbells.com`), which keeps
the two off each other's routes and stops the ERP's login and dashboard pages
being indexed on the marketing domain.

---

## Things to finish

Two items need real content rather than code:

1. **Social profile URLs** — `lib/site.js` → `socials`. While a url is empty
   the icon renders as plain decoration rather than a link that goes nowhere.
2. **A proper Open Graph image** — `lib/site.js` → `site.ogImage` currently
   points at the square logo. A purpose-made 1200×630 artwork in `public/`
   will look far better in a WhatsApp or LinkedIn preview.

There are deliberately **no testimonials or client logos**. Inventing them
would mean publishing fabricated reviews. Supply real names and quotes and a
testimonials section can be added.

---

## Structure

```
app/
  layout.js           metadata, fonts, JSON-LD, nav/footer, dialog, toasts
  page.js             the landing page, composed of the sections below
  globals.css         tokens, layout, backdrop, controls, motion
  privacy-policy/     the policy document
  sitemap.js          -> out/sitemap.xml
  robots.js           -> out/robots.txt
  icon.png            favicon (Next generates the link tags)
components/
  Backdrop.jsx        the fixed aurora/grid/grain stack + page ribbons
  Reveal.jsx          scroll-into-view fade (client)
  CountUp.jsx         animated statistics (client)
  ModuleWheel.jsx     orbiting module diagram (pure CSS, no JS)
  Nav.jsx             utility strip + sticky header (client)
  Panels.jsx          the product mockups
  EnquiryForm.jsx     shared by the dialog and the contact section (client)
  sections/           one file per group of page sections
lib/
  site.js             name, urls, contact details, nav
  content.js          all page copy and data
```

### Where the design comes from

The tokens in `app/globals.css` are lifted from the ERP app's design system, so
the two properties look like one product. Everything is token-driven — changing
`--primary` recolours the whole site, and the dark palette is already wired to
both `prefers-color-scheme` and an explicit `data-theme`.
