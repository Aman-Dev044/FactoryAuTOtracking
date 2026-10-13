/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * Static export. `next build` writes a plain folder of HTML/CSS/JS to out/,
   * which is deployed exactly like the CRA build folder is today — no Node
   * process, no pm2. Every page is pre-rendered at build time, so crawlers and
   * link-preview bots receive real HTML rather than an empty root div.
   */
  output: 'export',

  /**
   * Static export has no image optimisation server, so next/image cannot
   * resize on demand. Assets are instead compressed once at build time by
   * scripts/optimize-images.mjs and shipped at their final size.
   */
  images: { unoptimized: true },

  /**
   * Emits out/privacy-policy/index.html rather than out/privacy-policy.html,
   * which is what a plain nginx `try_files $uri $uri/ =404` expects.
   */
  trailingSlash: true,

  reactStrictMode: true,
  productionBrowserSourceMaps: false,
};

export default nextConfig;
