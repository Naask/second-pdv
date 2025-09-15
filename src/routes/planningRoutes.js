// src/routes/planningRoutes.js
const express = require('express');
const {
    handleGetDailyOrders,
    handleScheduleTask,
    handleCancelSchedule,
    handleUpdateStatus
} = require('../controllers/orderController');

const router = express.Router();

// Rota principal para buscar os pedidos agrupados por dia
router.get('/daily-orders', handleGetDailyOrders);

// Rotas para ações de agendamento e status
router.post('/schedule', handleScheduleTask);
router.post('/cancel-schedule', handleCancelSchedule);
router.post('/update-status', handleUpdateStatus);

module.exports = router;