document.addEventListener('DOMContentLoaded', () => {
    // --- REFERÊNCIAS AOS ELEMENTOS DO DOM ---
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const filterButton = document.getElementById('filter-button');
    const deliveryScheduleGrid = document.getElementById('delivery-schedule-grid');
    const washScheduleGrid = document.getElementById('wash-schedule-grid');
    const passScheduleGrid = document.getElementById('pass-schedule-grid');
    const mainContainer = document.querySelector('main');
    const toggleVisibilityButton = document.getElementById('toggle-visibility-button');
    const eyeIconOpen = document.getElementById('eye-icon-open');
    const eyeIconClosed = document.getElementById('eye-icon-closed');

    // --- ESTADO DA APLICAÇÃO ---
    let allOrdersData = [];
    let draggedCardInfo = null;
    let scrollInterval = null;

    // --- INICIALIZAÇÃO ---
    function initialize() {
        setDefaultDates();
        addEventListeners();
        updateView();
    }

    function setDefaultDates() {
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + 7);
        startDateInput.value = today.toISOString().split('T')[0];
        endDateInput.value = futureDate.toISOString().split('T')[0];
    }

    function addEventListeners() {
        filterButton.addEventListener('click', updateView);
        toggleVisibilityButton.addEventListener('click', toggleValuesVisibility);
    }

    // --- LÓGICA DE DADOS E RENDERIZAÇÃO ---
    async function fetchAndRenderSchedules(startDate, endDate) {
        const loadingHTML = '<p style="padding: 1rem;">A carregar planeamento...</p>';
        [deliveryScheduleGrid, washScheduleGrid, passScheduleGrid].forEach(grid => grid.innerHTML = loadingHTML);
        try {
            const url = `/api/v1/planning/daily-orders?start_date=${startDate}&end_date=${endDate}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Erro na API: ${response.statusText}`);
            const ordersByDay = await response.json();
            
            allOrdersData = ordersByDay.flatMap(day => day.orders);
            
            renderGrids(ordersByDay, startDate, endDate);
        } catch (error) {
            console.error("Erro ao carregar dados de planeamento:", error);
            const errorHTML = '<p style="padding: 1rem;">Erro ao carregar dados. Tente novamente.</p>';
            [deliveryScheduleGrid, washScheduleGrid, passScheduleGrid].forEach(grid => grid.innerHTML = errorHTML);
        }
    }

    function renderGrids(ordersByDay, startDate, endDate) {
        [deliveryScheduleGrid, washScheduleGrid, passScheduleGrid].forEach(grid => grid.innerHTML = '');
        
        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T23:59:59');

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            const dayData = ordersByDay.find(item => item.date === dateStr) || { orders: [] };
            
            deliveryScheduleGrid.appendChild(createDayColumn(d, dayData, true));
            washScheduleGrid.appendChild(createDayColumn(d, dayData, false, 'wash'));
            passScheduleGrid.appendChild(createDayColumn(d, dayData, false, 'pass'));
        }
        distributeScheduledCards();
    }

    function createDayColumn(date, dayData, isDelivery, taskType = null) {
        const dateStr = date.toISOString().split('T')[0];
        const dayColumn = document.createElement('div');
        dayColumn.className = 'day-column';
        dayColumn.dataset.date = dateStr;

        let detailsHTML = '';
        if (isDelivery) {
            const totalValue = (dayData.orders || []).reduce((sum, o) => sum + o.total_amount, 0);
            detailsHTML = `
                <div class="day-financials financial-info">
                    Total: <span class="value-text">R$ ${formatCurrency(totalValue)}</span>
                </div>`;
        } else {
            detailsHTML = `
                <div class="day-scheduled-financials financial-info" data-total-container="true">
                    Total Agendado: <span class="value-text">R$ 0,00</span>
                </div>`;
        }

        dayColumn.innerHTML = `
            <div class="day-header">
                <h3 class="day-title">${date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</h3>
                ${detailsHTML}
            </div>
            <div class="orders-container" data-task-type="${taskType || ''}"></div>
        `;

        if (isDelivery) {
            const container = dayColumn.querySelector('.orders-container');
            (dayData.orders || []).forEach(order => container.appendChild(createOrderCard(order)));
        }

        if (taskType) {
            const container = dayColumn.querySelector('.orders-container');
            container.addEventListener('dragover', handleDragOver);
            container.addEventListener('dragleave', handleDragLeave);
            container.addEventListener('drop', handleDrop);
        }
        return dayColumn;
    }
    
    function distributeScheduledCards() {
        allOrdersData.forEach(order => {
            if (order.planned_wash_datetime) {
                const dateStr = order.planned_wash_datetime.split('T')[0];
                const container = washScheduleGrid.querySelector(`[data-date="${dateStr}"] .orders-container`);
                if (container) container.appendChild(createOrderCard(order, true));
            }
            if (order.planned_iron_datetime) {
                const dateStr = order.planned_iron_datetime.split('T')[0];
                const container = passScheduleGrid.querySelector(`[data-date="${dateStr}"] .orders-container`);
                if (container) container.appendChild(createOrderCard(order, true));
            }
        });
        document.querySelectorAll('.day-column').forEach(updateColumnTotals);
    }

    function createOrderCard(order, isScheduled = false) {
        const card = document.createElement('div');
        card.className = 'order-card';
        card.dataset.orderId = order.order_id;
        card.dataset.orderValue = order.total_amount;
        card.draggable = true;

        const cancelButtonHTML = isScheduled ? '<button class="cancel-schedule-btn">×</button>' : '';

        card.innerHTML = `
            ${cancelButtonHTML}
            <div class="order-card-header">
                <div>
                    <h4 class="order-card-title">${order.customer_name}</h4>
                    <div class="order-card-subtitle">${order.order_id}</div>
                </div>
                <div class="order-card-value financial-info">
                    <span class="value-text">R$ ${formatCurrency(order.total_amount)}</span>
                </div>
            </div>
            <div class="order-card-footer">
                <p>Entrega: ${new Date(order.pickup_datetime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                <div class="status-indicators">
                    <div class="status-item">
                        <div class="status-circle ${order.is_washed ? 'completed' : ''}" data-status="is_washed"></div>
                        <span class="status-label">L</span>
                    </div>
                    <div class="status-item">
                        <div class="status-circle ${order.is_passed ? 'completed' : ''}" data-status="is_passed"></div>
                        <span class="status-label">P</span>
                    </div>
                    <div class="status-item">
                        <div class="status-circle ${order.is_packed ? 'completed' : ''}" data-status="is_packed"></div>
                        <span class="status-label">E</span>
                    </div>
                </div>
            </div>
        `;
        
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);

        if (isScheduled) {
            card.querySelector('.cancel-schedule-btn').addEventListener('click', handleCancelSchedule);
        }

        card.querySelectorAll('.status-circle').forEach(circle => {
            circle.addEventListener('click', (e) => {
                e.stopPropagation();
                const statusType = e.currentTarget.dataset.status;
                const currentStatus = e.currentTarget.classList.contains('completed');
                updateOrderStatus(order.order_id, statusType, !currentStatus, e.currentTarget);
            });
        });
        return card;
    }

    function handleDragStart(e) {
        const card = e.currentTarget;
        draggedCardInfo = {
            orderId: card.dataset.orderId,
            element: card,
            sourceGrid: card.closest('.planning-grid').id
        };
        setTimeout(() => card.classList.add('dragging'), 0);
        document.addEventListener('dragover', handleDragScrolling);
    }

    function handleDragEnd() {
        if (draggedCardInfo && draggedCardInfo.element) {
            draggedCardInfo.element.classList.remove('dragging');
        }
        draggedCardInfo = null;
        document.removeEventListener('dragover', handleDragScrolling);
        if (scrollInterval) {
            clearInterval(scrollInterval);
            scrollInterval = null;
        }
    }

    function handleDragScrolling(e) {
        const grid = e.target.closest('.planning-grid');
        if (!grid) {
            if (scrollInterval) {
                clearInterval(scrollInterval);
                scrollInterval = null;
            }
            return;
        };

        const rect = grid.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const scrollZone = 80;
        const scrollSpeed = 15;

        if (x > rect.width - scrollZone) {
            if (!scrollInterval) scrollInterval = setInterval(() => { grid.scrollBy(scrollSpeed, 0); }, 15);
        } else if (x < scrollZone) {
            if (!scrollInterval) scrollInterval = setInterval(() => { grid.scrollBy(-scrollSpeed, 0); }, 15);
        } else {
            if (scrollInterval) {
                clearInterval(scrollInterval);
                scrollInterval = null;
            }
        }
    }
    
    function handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    }

    function handleDragLeave(e) {
        e.currentTarget.classList.remove('drag-over');
    }

    async function handleDrop(e) {
        e.preventDefault();
        const dropContainer = e.currentTarget;
        dropContainer.classList.remove('drag-over');

        if (!draggedCardInfo) return;

        const { orderId, element: originalCard, sourceGrid } = draggedCardInfo;
        const targetTaskType = dropContainer.dataset.taskType;
        const targetColumn = dropContainer.closest('.day-column');
        const targetDate = targetColumn.dataset.date;

        if (sourceGrid !== 'delivery-schedule-grid' && !targetTaskType) return;
        
        if (targetTaskType) {
            try {
                await scheduleTask(orderId, targetTaskType, targetDate);
                const originalCardData = allOrdersData.find(o => o.order_id == orderId);

                if (originalCardData) {
                    const newCard = createOrderCard(originalCardData, true);
                    dropContainer.appendChild(newCard);
                    updateColumnTotals(targetColumn);
                }
                
                if (sourceGrid !== 'delivery-schedule-grid') {
                     const sourceColumn = originalCard.closest('.day-column');
                     originalCard.remove();
                     updateColumnTotals(sourceColumn);
                }
            } catch (error) {
                console.error("Erro no processo de drop:", error);
                alert("Ocorreu um erro ao mover a tarefa.");
                updateView();
            }
        }
    }
    
    async function scheduleTask(orderId, taskType, scheduleDate) {
        const response = await fetch('/api/v1/planning/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: orderId, task_type: taskType, schedule_date: scheduleDate })
        });
        if (!response.ok) throw new Error('Falha ao agendar tarefa no backend.');
        const order = allOrdersData.find(o => o.order_id === orderId);
        if (order) {
            if(taskType === 'wash') order.planned_wash_datetime = `${scheduleDate}T00:00:00Z`;
            if(taskType === 'pass') order.planned_iron_datetime = `${scheduleDate}T00:00:00Z`;
        }
    }

    async function handleCancelSchedule(e) {
        e.stopPropagation();
        const card = e.currentTarget.closest('.order-card');
        const column = card.closest('.day-column');
        const orderId = card.dataset.orderId;
        const taskType = card.closest('.orders-container').dataset.taskType;

        try {
            await fetch('/api/v1/planning/cancel-schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: orderId, task_type: taskType })
            });
            card.remove();
            updateColumnTotals(column);
            const order = allOrdersData.find(o => o.order_id === orderId);
            if(order) {
                if(taskType === 'wash') order.planned_wash_datetime = null;
                if(taskType === 'pass') order.planned_iron_datetime = null;
            }
        } catch (error) {
            console.error("Erro ao cancelar:", error);
            alert('Não foi possível cancelar o agendamento.');
        }
    }

    async function updateOrderStatus(orderId, statusType, newValue, circleElement) {
        try {
            await fetch('/api/v1/planning/update-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order_id: orderId,
                    status_field: statusType,
                    status_value: newValue
                })
            });
            circleElement.classList.toggle('completed', newValue);
            const order = allOrdersData.find(o => o.order_id === orderId);
            if (order) order[statusType] = newValue;
        } catch (error) {
            console.error("Erro ao atualizar status:", error);
            alert('Não foi possível atualizar o estado.');
        }
    }
    
    function updateColumnTotals(column) {
        if (!column) return;
        const totalContainer = column.querySelector('[data-total-container]');
        if (!totalContainer) return;

        const cards = column.querySelectorAll('.order-card');
        let totalValue = 0;
        cards.forEach(card => {
            totalValue += parseFloat(card.dataset.orderValue) || 0;
        });
        
        const valueTextElement = totalContainer.querySelector('.value-text');
        if (valueTextElement) {
            valueTextElement.textContent = `R$ ${formatCurrency(totalValue)}`;
        }
    }

    function formatCurrency(amountInCents) {
        if (amountInCents === null || amountInCents === undefined) return '0,00';
        const amount = amountInCents / 100;
        return amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function toggleValuesVisibility() {
        mainContainer.classList.toggle('values-hidden');
        const isHidden = mainContainer.classList.contains('values-hidden');
        eyeIconOpen.style.display = isHidden ? 'none' : 'block';
        eyeIconClosed.style.display = isHidden ? 'block' : 'none';
    }

    function updateView() {
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        if (startDate && endDate) {
            fetchAndRenderSchedules(startDate, endDate);
        }
    }

    initialize();
});