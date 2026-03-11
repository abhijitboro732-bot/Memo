import axios from 'axios';
import { API_URL } from '../lib/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const setAuthToken = (token) => {
    if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common['Authorization'];
    }
};


api.interceptors.request.use(
    (config) => {
        // If the route is specifically for admin APIs, try checking adminToken
        const isAdminRoute = config.url?.includes('/admin');
        const token = isAdminRoute ? localStorage.getItem('adminToken') : localStorage.getItem('token');

        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const isAdminRoute = error.config?.url?.includes('/admin');

        if (error.response && (error.response.status === 401 || error.response.status === 403 || (error.response.status === 400 && error.response.data.message === 'Invalid Token'))) {
            if (isAdminRoute) {
                localStorage.removeItem('adminToken');
                localStorage.removeItem('adminUser');
                if (typeof window !== 'undefined' && window.location.pathname !== '/omajnwba/login' && window.location.pathname !== '/omajnwba/register') {
                    window.location.href = '/omajnwba/login';
                }
            } else {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                if (typeof window !== 'undefined' && window.location.pathname !== '/login' && window.location.pathname !== '/register') {
                    window.location.href = '/login';
                }
            }
        }
        return Promise.reject(error);
    }
);

export default api;
