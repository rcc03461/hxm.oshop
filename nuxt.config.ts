// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/tailwind.css'],
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL || '',
    dbHost: process.env.db_host || process.env.DB_HOST || '',
    dbUser: process.env.db_user || process.env.DB_USER || '',
    dbPassword: process.env.db_password || process.env.DB_PASSWORD || '',
    dbName: process.env.db_name || process.env.DB_NAME || '',
    dbPort: process.env.db_port || process.env.DB_PORT || '5432',
    dbSslmode: process.env.DB_SSLMODE || 'prefer',
    jwtSecret: process.env.JWT_SECRET || '',
  },
})
