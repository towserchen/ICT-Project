import { createRouter, createWebHistory } from 'vue-router';
import home from '../components/home.vue';
import video from '../components/video.vue';

const routes = [
  { path: '/', component: home },
  { path: '/video', component: video }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
