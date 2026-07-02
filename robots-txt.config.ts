import defineConfig from 'astro-robots-txt';

export default defineConfig({
    policy: [
        {
            userAgent: '*',
            allow: '/',
        },
    ],
    sitemapBaseFileName: 'sitemap-index',
});
