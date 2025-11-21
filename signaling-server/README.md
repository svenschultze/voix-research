# Deploying Voix Signaling Server to Render

This directory contains everything you need to deploy your own private signaling server for Voix Research using [Render](https://render.com).

## Prerequisites

1.  A [GitHub](https://github.com) account.
2.  A [Render](https://render.com) account (free tier is sufficient).

## Steps

### 1. Push this code to GitHub

If you haven't already, push your `voix-research` project to a GitHub repository.

### 2. Create a Web Service on Render

1.  Log in to your [Render Dashboard](https://dashboard.render.com/).
2.  Click **New +** and select **Web Service**.
3.  Connect your GitHub account if you haven't already.
4.  Search for and select your `voix-research` repository.

### 3. Configure the Service

Fill in the following details:

*   **Name**: `voix-signaling` (or any name you like)
*   **Region**: Choose the one closest to you (e.g., Frankfurt, Oregon).
*   **Branch**: `main` (or your working branch).
*   **Root Directory**: `signaling-server` (Important! This tells Render to look in this folder).
*   **Runtime**: `Node`
*   **Build Command**: `npm install`
*   **Start Command**: `npm start`
*   **Instance Type**: `Free`

### 4. Deploy

Click **Create Web Service**. Render will start building your service. It might take a minute or two.

### 5. Get your URL

Once deployed, you will see a URL at the top left, something like:
`https://voix-signaling-xxxx.onrender.com`

### 6. Update Voix Research

1.  Open `src/services/collaboration.js` in your local project.
2.  Add your new Render URL to the `signaling` array. **Important:** Change `https://` to `wss://`.

```javascript
this.provider = new WebrtcProvider(roomId, this.doc, {
    signaling: [
        'wss://voix-signaling-xxxx.onrender.com', // Your new server
        'ws://localhost:4444',
        // ... others
    ]
})
```

3.  Commit and push your changes.

Now your application will use your private, reliable signaling server!
