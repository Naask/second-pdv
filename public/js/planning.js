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
        washScheduleGrid.addEventListener('click', handleEditableTimeClick);
        passScheduleGrid.addEventListener('click', handleEditableTimeClick);
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
            deliveryScheduleGrid.appendChild(createDayColumn(d, dayData, true, 'delivery'));
            washScheduleGrid.appendChild(createDayColumn(d, dayData, false, 'wash'));
            passScheduleGrid.appendChild(createDayColumn(d, dayData, false, 'pass'));
        }
        distributeScheduledCards();
    }

    function createDayColumn(date, dayData, isDelivery, taskType) {
        const dateStr = date.toISOString().split('T')[0];
        const dayColumn = document.createElement('div');
        dayColumn.className = 'day-column';
        dayColumn.dataset.date = dateStr;
        let detailsHTML = '';
        if (isDelivery) {
            const totalValue = (dayData.orders || []).reduce((sum, o) => sum + o.total_amount, 0);
            detailsHTML = `<div class="day-financials financial-info">Total: <span class="value-text">R$ ${formatCurrency(totalValue)}</span></div>`;
        } else {
            detailsHTML = `<div class="day-scheduled-financials financial-info" data-total-container="true">Total Agendado: <span class="value-text">R$ 0,00</span></div>`;
        }
        dayColumn.innerHTML = `<div class="day-header"><h3 class="day-title">${date.toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</h3>${detailsHTML}</div><div class="orders-container" data-task-type="${taskType}"></div>`;
        const container = dayColumn.querySelector('.orders-container');
        if (isDelivery) {
            (dayData.orders || []).forEach(order => container.appendChild(createOrderCard(order, false, 'delivery')));
        }
        if (taskType === 'wash' || taskType === 'pass') {
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
                if (container) container.appendChild(createOrderCard(order, true, 'wash'));
            }
            if (order.planned_iron_datetime) {
                const dateStr = order.planned_iron_datetime.split('T')[0];
                const container = passScheduleGrid.querySelector(`[data-date="${dateStr}"] .orders-container`);
                if (container) container.appendChild(createOrderCard(order, true, 'pass'));
            }
        });
        document.querySelectorAll('.day-column').forEach(column => {
            sortCardsInColumn(column.querySelector('.orders-container'));
            updateColumnTotals(column);
        });
    }

    /**
     * FUNÇÃO ALTERADA
     * Se o horário agendado for nulo, exibe "Definir horário" para manter o card clicável.
     */
    function createOrderCard(order, isScheduled = false, taskType = null) {
        const card = document.createElement('div');
        card.className = 'order-card';
        card.dataset.orderId = order.order_id;
        card.dataset.orderValue = order.total_amount;
        card.dataset.pickupDatetime = order.pickup_datetime;
        card.dataset.plannedWashDatetime = order.planned_wash_datetime;
        card.dataset.plannedIronDatetime = order.planned_iron_datetime;
        card.draggable = true;
        const cancelButtonHTML = isScheduled ? '<button class="cancel-schedule-btn">×</button>' : '';
        const isOrderGloballyCompleted = ['CONCLUIDO', 'AGUARDANDO_RETIRADA'].includes(order.execution_status);
        const isWashTaskCompleted = order.is_washed;
        const isPassTaskCompleted = order.is_passed;
        let isThisCardCompleted = false;
        if (taskType === 'delivery') isThisCardCompleted = isOrderGloballyCompleted;
        else if (taskType === 'wash') isThisCardCompleted = isWashTaskCompleted || isOrderGloballyCompleted;
        else if (taskType === 'pass') isThisCardCompleted = isPassTaskCompleted || isOrderGloballyCompleted;
        if (isThisCardCompleted) card.classList.add('card-completed');

        let cardHTML = `${cancelButtonHTML}<div class="order-card-header"><div><h4 class="order-card-title">${order.customer_name}</h4><div class="order-card-subtitle">${order.order_id}</div></div><div class="order-card-value financial-info"><span class="value-text">R$ ${formatCurrency(order.total_amount)}</span></div></div>`;

        if (!isThisCardCompleted) {
            const washStatusClass = order.is_washed ? 'completed' : (order.planned_wash_datetime ? 'scheduled' : '');
            const passStatusClass = order.is_passed ? 'completed' : (order.planned_iron_datetime ? 'scheduled' : '');
            const packedStatusClass = order.is_packed ? 'completed' : '';
            let scheduleTimeHTML = `<p>Entrega: ${formatTimeFromISO(order.pickup_datetime)}</p>`;
            if (isScheduled) {
                const scheduleDateStr = taskType === 'wash' ? order.planned_wash_datetime : order.planned_iron_datetime;
                const timeText = formatTimeFromISO(scheduleDateStr) || 'Definir horário'; // <-- MUDANÇA AQUI
                scheduleTimeHTML = `<p class="scheduled-time-container" style="cursor: pointer; color: #0056b3;" title="Clique para editar o horário">Agendado: <span class="editable-time">${timeText}</span></p>`;
            }
            cardHTML += `<div class="order-card-footer">${scheduleTimeHTML}<div class="status-indicators"><div class="status-item"><div class="status-circle ${washStatusClass}" data-status="is_washed"></div><span class="status-label">L</span></div><div class="status-item"><div class="status-circle ${passStatusClass}" data-status="is_passed"></div><span class="status-label">P</span></div><div class="status-item"><div class="status-circle ${packedStatusClass}" data-status="is_packed"></div><span class="status-label">E</span></div></div></div>`;
        }
        card.innerHTML = cardHTML;
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
        if (isScheduled) card.querySelector('.cancel-schedule-btn')?.addEventListener('click', handleCancelSchedule);
        card.querySelectorAll('.status-circle').forEach(circle => {
            circle.addEventListener('click', (e) => {
                e.stopPropagation();
                updateOrderStatus(order.order_id, e.currentTarget.dataset.status, !e.currentTarget.classList.contains('completed'), e.currentTarget);
            });
        });
        return card;
    }
    
    // ... (função sortCardsInColumn permanece a mesma)
    function sortCardsInColumn(container) {
        if (!container) return;
        const taskType = container.dataset.taskType;
        const cards = Array.from(container.children);
        const pending = cards.filter(c => !c.classList.contains('card-completed'));
        const completed = cards.filter(c => c.classList.contains('card-completed'));
        const getDateForCard = (card) => {
            let dateStr;
            switch (taskType) {
                case 'wash': dateStr = card.dataset.plannedWashDatetime; break;
                case 'pass': dateStr = card.dataset.plannedIronDatetime; break;
                default: dateStr = card.dataset.pickupDatetime; break;
            }
            return dateStr && dateStr !== 'null' ? new Date(dateStr) : null;
        };
        pending.sort((a, b) => {
            const dateA = getDateForCard(a);
            const dateB = getDateForCard(b);
            if (dateA && dateB) return dateA - dateB;
            if (dateA) return -1; if (dateB) return 1; return 0;
        });
        container.innerHTML = '';
        pending.forEach(c => container.appendChild(c));
        completed.forEach(c => container.appendChild(c));
    }


    // ... (funções de Drag & Drop permanecem as mesmas)
    function handleDragStart(e) {
        const card = e.currentTarget;
        if (card.classList.contains('card-completed')) { e.preventDefault(); return; }
        const container = card.closest('.orders-container');
        draggedCardInfo = {
            orderId: card.dataset.orderId,
            element: card,
            sourceTaskType: container.dataset.taskType || 'delivery'
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
        if (scrollInterval) { clearInterval(scrollInterval); scrollInterval = null; }
    }

    function handleDragScrolling(e) {
        if (!draggedCardInfo) return;
        const y = e.clientY; const windowHeight = window.innerHeight; const scrollZone = 80; const scrollSpeed = 15;
        if (y > windowHeight - scrollZone) {
            if (!scrollInterval) scrollInterval = setInterval(() => { window.scrollBy(0, scrollSpeed); }, 15);
        } else if (y < scrollZone) {
            if (!scrollInterval) scrollInterval = setInterval(() => { window.scrollBy(0, -scrollSpeed); }, 15);
        } else {
            if (scrollInterval) { clearInterval(scrollInterval); scrollInterval = null; }
        }
    }
    
    function handleDragOver(e) { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }
    function handleDragLeave(e) { e.currentTarget.classList.remove('drag-over'); }

    async function handleDrop(e) {
        e.preventDefault();
        const dropContainer = e.currentTarget;
        dropContainer.classList.remove('drag-over');
        if (!draggedCardInfo) return;
        const { orderId, element: originalCard, sourceTaskType } = draggedCardInfo;
        const targetTaskType = dropContainer.dataset.taskType;
        const targetColumn = dropContainer.closest('.day-column');
        const targetDateStr = targetColumn.dataset.date;
        if (!targetTaskType) return;
        
        const pickupDateTimeStr = originalCard.dataset.pickupDatetime;
        const timePart = pickupDateTimeStr && pickupDateTimeStr.includes('T') ? pickupDateTimeStr.split('T')[1].substring(0, 8) : '09:00:00';
        const newScheduleDateTime = `${targetDateStr}T${timePart}`;

        try {
            await scheduleTask(orderId, targetTaskType, newScheduleDateTime);
            const originalCardData = allOrdersData.find(o => o.order_id == orderId);
            if (originalCardData) {
                const newCard = createOrderCard(originalCardData, true, targetTaskType);
                dropContainer.appendChild(newCard);
                sortCardsInColumn(dropContainer);
                updateColumnTotals(targetColumn);
            }
            if (sourceTaskType === targetTaskType) {
                 const sourceColumn = originalCard.closest('.day-column');
                 originalCard.remove();
                 updateColumnTotals(sourceColumn);
            }
        } catch (error) {
            console.error("Erro no processo de drop:", error);
            alert("Ocorreu um erro ao mover a tarefa. A página será atualizada.");
            updateView();
        }
    }
    
    async function scheduleTask(orderId, taskType, scheduleDateTime) {
        const response = await fetch('/api/v1/planning/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: orderId, task_type: taskType, schedule_date: scheduleDateTime })
        });
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Falha ao agendar tarefa no backend:', errorData);
            throw new Error(errorData.details || 'Falha ao agendar tarefa no backend.');
        }
        const order = allOrdersData.find(o => o.order_id === orderId);
        if (order) {
            if(taskType === 'wash') order.planned_wash_datetime = scheduleDateTime;
            if(taskType === 'pass') order.planned_iron_datetime = scheduleDateTime;
        }
    }

    async function handleCancelSchedule(e) {
        e.stopPropagation();
        const card = e.currentTarget.closest('.order-card');
        const column = card.closest('.day-column');
        const orderId = card.dataset.orderId;
        const taskType = card.closest('.orders-container').dataset.taskType;
        try {
            // Para cancelar, enviamos uma data simbólica do passado, que será substituída por NULL no backend.
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
            const card = circleElement.closest('.order-card');
            const container = card.closest('.orders-container');
            const taskType = container.dataset.taskType;
            await fetch('/api/v1/planning/update-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: orderId, status_field: statusType, status_value: newValue })
            });
            const order = allOrdersData.find(o => o.order_id === orderId);
            if (order) order[statusType] = newValue;
            const newCard = createOrderCard(order, taskType !== 'delivery', taskType);
            card.replaceWith(newCard);
            sortCardsInColumn(container);
        } catch (error) {
            console.error("Erro ao atualizar status:", error);
            alert('Não foi possível atualizar o estado.');
        }
    }
    
    /**
     * FUNÇÃO CORRIGIDA
     * Adiciona validação para não salvar horários vazios e melhora a experiência de edição.
     */
    function handleEditableTimeClick(e) {
        const target = e.target;
        if (!target.classList.contains('editable-time') || target.querySelector('input')) return;

        const timeContainer = target.parentElement;
        const originalText = target.textContent;
        // Se o texto for "Definir horário", o input começa vazio para o usuário preencher.
        const originalTime = originalText === 'Definir horário' ? '' : originalText;
        
        target.style.display = 'none';

        const input = document.createElement('input');
        input.type = 'time';
        input.className = 'time-input';
        input.value = originalTime;
        
        timeContainer.appendChild(input);
        input.focus();

        const finishEditing = async () => {
            const newTime = input.value;
            
            // Se o valor estiver vazio ou for igual ao original, apenas reverte a UI sem chamar a API.
            if (!newTime || newTime === originalTime) {
                target.style.display = '';
                input.remove();
                return;
            }
            
            const card = input.closest('.order-card');
            const container = card.closest('.orders-container');
            const column = card.closest('.day-column');
            const orderId = card.dataset.orderId;
            const taskType = container.dataset.taskType;
            const dateStr = column.dataset.date;
            const newScheduleDateTime = `${dateStr}T${newTime}:00`;

            try {
                await scheduleTask(orderId, taskType, newScheduleDateTime);
                if (taskType === 'wash') card.dataset.plannedWashDatetime = newScheduleDateTime;
                if (taskType === 'pass') card.dataset.plannedIronDatetime = newScheduleDateTime;
                target.textContent = newTime;
                sortCardsInColumn(container);
            } catch (error) {
                console.error('Erro ao salvar novo horário:', error);
                // Exibe o erro vindo do backend, que é mais claro para o usuário.
                alert(`Não foi possível salvar: ${error.message}`);
            } finally {
                target.style.display = '';
                input.remove();
            }
        };

        input.addEventListener('blur', finishEditing);
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') input.blur();
            if (event.key === 'Escape') {
                input.value = originalTime;
                input.blur();
            }
        });
    }

    // --- Funções Utilitárias ---
    
    function formatTimeFromISO(isoString) {
        if (!isoString || !isoString.includes('T')) {
            return null; // Retorna null se a data for inválida ou nula
        }
        return isoString.split('T')[1].substring(0, 5);
    }

    function updateColumnTotals(column) {
        if (!column) return;
        const totalContainer = column.querySelector('[data-total-container]');
        if (!totalContainer) return;
        const cards = column.querySelectorAll('.order-card');
        let totalValue = 0;
        cards.forEach(card => { totalValue += parseFloat(card.dataset.orderValue) || 0; });
        const valueTextElement = totalContainer.querySelector('.value-text');
        if (valueTextElement) { valueTextElement.textContent = `R$ ${formatCurrency(totalValue)}`; }
    }

    function formatCurrency(amountInCents) {
        if (amountInCents === null || amountInCents === undefined) return '0,00';
        return (amountInCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
        if (startDate && endDate) { fetchAndRenderSchedules(startDate, endDate); }
    }

    initialize();
});