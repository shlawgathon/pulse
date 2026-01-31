# Honch Analytics Backend

A analytics API built with Hono and Postgres.

## Quick Start

1. **Install dependencies:**
   ```bash
   bun install
   ```

2. **Setup Enviorment:**
    ```env
    export DATABASE_URL=your_neon_database_connection_string
    ```

3. **Set up your database:**
   ```bash
   bun run migrate
   ```

4. **Start the server:**
   ```bash
   bun run start
   ```

## API Endpoints

### Create a Website
```bash
curl -X POST http://localhost:3000/api/websites \
  -H "Content-Type: application/json" \
  -d '{"name": "My Website", "domain": "mywebsite.com"}'
```

### Get Analytics
```bash
curl http://localhost:3000/api/analytics/{publicId}?days=30
```

### Get Website Stats
```bash
curl http://localhost:3000/api/websites/{publicId}/stats
```

## Embed Tracking Script
Add this to your website's HTML:

```html
<script 
  defer 
  data-website-id="YOUR_WEBSITE_ID" 
  data-domain="yourdomain.com" 
  src="https://api.honch.io/script.js">
</script>
```