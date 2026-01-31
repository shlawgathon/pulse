## @honch/analytics
Lightweight JS/TS client for sending events to Honch Analytics.

### Install

```bash
bun add @honch/analytics
```

### Usage

```ts
import { createHonchAnalytics } from '@honch/analytics';

const honch = createHonchAnalytics({
  websiteId: 'YOUR_PUBLIC_WEBSITE_ID',
  domain: 'example.com',
  debug: false,
  autoTrack: true, // pageviews, SPA nav, external links, payments
});

// Custom events
await honch.track('signup', { plan: 'pro' });
```
