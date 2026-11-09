# Inkwell Heights

A 3D stick-figure city you can play with friends, on a phone or a computer.
Everyone who opens the website joins the same shared city. No accounts, no codes.

## What's in this folder

| File | What it is |
|---|---|
| `public/index.html` | The game |
| `src/worker.js` | The multiplayer server (a Cloudflare Worker plus one Durable Object, "the city") |
| `wrangler.jsonc` | Cloudflare settings |
| `package.json`, `package-lock.json` | Tell Cloudflare which tools to install |

## Put it online (one time, about 10 minutes, on a computer)

### 1. Upload the files to GitHub

1. Sign in at [github.com](https://github.com) and click **New repository**.
2. Name it `inkwell-heights`, leave everything else as it is, and click **Create repository**.
3. On the empty repository page, click the **uploading an existing file** link.
4. Unzip `inkwell-heights.zip`, open the `inkwell-heights` folder, select **everything inside it** (the `public` and `src` folders and the files), and drag it all onto the GitHub page.
5. Click **Commit changes**.

### 2. Connect it to Cloudflare

1. Sign in (or sign up for free) at [dash.cloudflare.com](https://dash.cloudflare.com).
2. Go to **Workers & Pages**, click **Create application**, and choose to import a repository from **GitHub**. Allow Cloudflare to see your GitHub account when it asks.
3. Pick the `inkwell-heights` repository.
4. Make sure the project name is exactly `inkwell-heights` (it has to match `wrangler.jsonc`). Leave the build command empty and keep the deploy command as `npx wrangler deploy`.
5. Click **Save and Deploy** and wait a minute or two.

Your game is now live at an address like `https://inkwell-heights.YOUR-NAME.workers.dev`.
Send that link to friends: up to 4 people can play at once, and anyone else can watch and chat.

## Updating the game later

Upload a new `public/index.html` to the repository on GitHub (**Add file → Upload files**, then **Commit changes**).
Cloudflare notices the change and puts the new version online automatically within a minute or two.

## Good to know

- **Free plan:** this runs on Cloudflare's free plan. The daily allowance covers roughly 15 hours of four people playing at once, and it resets every day at midnight UTC. If it ever runs out, the game keeps working but each person plays on their own until the reset.
- **Who can join:** anyone with the link can join and use the chat, so share it with people you know.
- **Want your own domain?** In Cloudflare, open the Worker, then **Settings → Domains & Routes** to add one you own.

## Try it on your own computer (optional)

With [Node.js](https://nodejs.org) installed:

```
npm install
npx wrangler dev
```

Then open <http://localhost:8787> in two browser windows.
