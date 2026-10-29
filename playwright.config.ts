import {defineConfig,devices} from '@playwright/test';
export default defineConfig({testDir:'./e2e',timeout:60000,use:{baseURL:process.env.PLAY_URL||'http://127.0.0.1:5173/',...devices['Pixel 7'],trace:'retain-on-failure'},webServer:process.env.PLAY_URL?undefined:{command:'npm run dev',url:'http://127.0.0.1:5173',reuseExistingServer:!process.env.CI},reporter:[['list'],['html',{open:'never'}]]});
