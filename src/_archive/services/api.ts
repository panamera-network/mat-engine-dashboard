import axios from 'axios';

const BASE_URL = 'http://localhost:8000'; // Adjust if needed

// /src/service/system.ts
export const getSystemStatus = () => axios.get(`${BASE_URL}/api/system-status`);


