import { execSync } from 'child_process';
const port = process.env.PORT || 3000;
execSync(`npx serve dist -s -l ${port}`, { stdio: 'inherit' });
