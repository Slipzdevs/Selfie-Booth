# Selfie Booth

A browser-based photo booth with photo-strip styling, local gallery storage, and optional temporary phone downloads via QR code.

## Run locally with the Node API

1. Install dependencies with `npm install`.
2. Start the upload API in one terminal with `npm run server`.
3. Start Vite in a second terminal with `npm run dev`.

The API stores temporary files in `uploads/`, which is excluded from version control. Localhost QR links are for development only; a phone cannot open another device's `localhost` address.

## Run Netlify functions locally

Install the Netlify CLI when you are ready to test Netlify Functions locally, then run `netlify dev` from the VS Code terminal. Log in with `netlify login` and link an existing Netlify site with `netlify link` if the CLI requests a site context. Linking is not a deployment. The Netlify Functions use Netlify Blobs; the regular `npm run dev` command continues to use the local Node API instead.

## Netlify deployment setup

`netlify.toml` configures the Vite build, SPA routing, and `/api/shares` redirects to Netlify Functions. The Netlify Functions store photos, clips, and share metadata in the persistent `@netlify/blobs` site-wide store. A scheduled function removes expired uploads hourly; expired links are also cleaned when accessed.

Phone sharing is optional. Choosing **Share to phone** uploads stills and available short camera clips to Netlify Blobs and gives anyone with the unguessable QR link access until the 24-hour expiry. The Netlify function limits each file to 4 MB, each share to 32 MB, and share creation to 20 per IP address per hour. Set `SHARE_TTL_MS` in the Netlify environment to change the retention period. Netlify Functions and Blobs are subject to Netlify plan limits.

The production Netlify site needs a public HTTPS URL for camera access and phone QR downloads. This project is prepared for linking to a Netlify site, but it has not been linked, published, or deployed. Deploy only after explicit approval.

## Existing standalone Node server

For non-Netlify Node hosts, `npm run build` followed by `npm start` serves the built app and the local `/api/shares` API. That API stores temporary files in `uploads/` and requires persistent disk storage. Set `UPLOAD_DIR` if the host does not preserve the default directory. Files expire after 24 hours by default (`SHARE_TTL_MS` is in milliseconds); the Node API limits each file to 16 MB and each share to 80 MB.
