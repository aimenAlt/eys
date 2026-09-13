# assets-source

Original photography that is **not** published. Nothing under `public/` may
reference these files — anything in `public/` is copied verbatim into `dist/`
and served to visitors.

`communities/` holds the candidate shots that were shortlisted for community
hero images. They shipped to production unreferenced for months (two of them
were 12–13 MB each), which is why they now live outside the build.

Crop and compress a chosen candidate into `public/images/communities/`, then run:

```bash
node scripts/gen-image-derivatives.mjs
```

to emit the responsive WebP candidates `SiteImage.astro` uses.
