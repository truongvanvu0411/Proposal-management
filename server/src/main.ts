import { createApp } from './app';
import { getConfig } from './config/env';

const config = getConfig();
const app = createApp({ config });

app.listen(config.port, () => {
  console.log(`[OK] Proposal Management API listening on port ${config.port}`);
});
