// Service Worker Minimal Implementation for PWA compatibility
const CACHE_NAME = 'quiz-v1';
self.addEventListener('install', e => {
  self.skipWaiting();
});
self.addEventListener('fetch', event => {
  // จัดเตรียมระบบแคชตามสถาปัตยกรรม PWA
});