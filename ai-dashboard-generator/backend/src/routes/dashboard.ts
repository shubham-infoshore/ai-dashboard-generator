// backend/src/routes/dashboard.ts
import express from 'express';
import { DashboardController } from '../controllers/DashboardController';

const router = express.Router();
const dashboardController = new DashboardController();

router.post('/generate', dashboardController.generateDashboard);
router.post('/export', dashboardController.exportDashboard);

export { router as dashboardRoutes };
