document.addEventListener('DOMContentLoaded', () => {
    // --- REFERÊNCIAS GLOBAIS DO DOM ---
    const mainContainer = document.querySelector('main');
    const toggleViewBtn = document.getElementById('toggle-view-btn');
    const planningViewContainer = document.getElementById('planning-view-container');
    const dailyViewContainer = document.getElementById('daily-view-container');
    const toggleVisibilityButton = document.getElementById('toggle-visibility-button');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const endDateLabel = document.getElementById('end-date-label');
    const filterButton = document.getElementById('filter-button');

    // --- ESTADO DA APLICAÇÃO ---
    let allOrdersData = [];
    let draggedCardInfo = null;
    let autoRefreshInterval = null;
    let currentView = 'planning';

    // --- INICIALIZAÇÃO ---
    function initialize() {
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);
        startDateInput.value = today.toISOString().split('T')[0];
        endDateInput.value = tomorrow.toISOString().split('T')[0];

        addEventListeners();
        updateView();
        
        if (autoRefreshInterval) clearInterval(autoRefreshInterval);
        autoRefreshInterval = setInterval(updateView, 120000);
    }

    function addEventListeners() {
        toggleViewBtn.addEventListener('click', toggleView);
        filterButton.addEventListener('click', updateView);
        toggleVisibilityButton.addEventListener('click', toggleValuesVisibility);
    }
    
    // --- LÓGICA DE TROCA DE VISÃO E ATUALIZAÇÃO ---
    function toggleView() {
        currentView = (currentView === 'planning') ? 'daily' : 'planning';
        updateView();
    }
    
    function updateView() {
        let startDate = startDateInput.value;
        let endDate;

        if (currentView === 'daily') {
            const day1 = new Date(startDate + 'T00:00:00');
            const day2 = new Date(day1);
            day2.setDate(day1.getDate() + 1);
            endDate = day2.toISOString().split('T')[0];
        } else {
            endDate = endDateInput.value;
        }

        if (startDate && endDate) { 
            console.log(`Atualizando... Visão: ${currentView}, de ${startDate} a ${endDate}`);
            fetchAndRenderData(startDate, endDate); 
        }
    }

    async function fetchAndRenderData(startDate, endDate) {
        try {
            const url = `/api/v1/planning/daily-orders?start_date=${startDate}&end_date=${endDate}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Erro na API: ${response.statusText}`);
            
            allOrdersData = await response.json();
            renderCurrentView();
        } catch (error) {
            console.error("Erro ao carregar dados de planeamento:", error);
        }
    }

    function renderCurrentView() {
        if (currentView === 'planning') {
            planningViewContainer.classList.remove('hidden');
            dailyViewContainer.classList.add('hidden');
            endDateInput.style.display = 'inline-block';
            endDateLabel.style.display = 'inline-block';
            toggleViewBtn.textContent = 'Visão Lado a Lado';
            renderPlanningView();
        } else {
            dailyViewContainer.classList.remove('hidden');
            planningViewContainer.classList.add('hidden');
            endDateInput.style.display = 'none';
            endDateLabel.style.display = 'none';
            toggleViewBtn.textContent = 'Visão de Planejamento';
            renderDailyView();
        }
    }

    // --- RENDERIZAÇÃO DA VISÃO DE PLANEJAMENTO ---
    function renderPlanningView() {
        const grids = {
            delivery: document.getElementById('delivery-schedule-grid'),
            wash: document.getElementById('wash-schedule-grid'),
            pass: document.getElementById('pass-schedule-grid')
        };
        Object.values(grids).forEach(grid => grid.innerHTML = '');

        const start = new Date(startDateInput.value + 'T00:00:00');
        const end = new Date(endDateInput.value + 'T23:59:59');

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            Object.keys(grids).forEach(type => {
                grids[type].appendChild(createPlanningDayColumn(d, dateStr, type));
            });
        }
        distributeCards();
    }
    
    function createPlanningDayColumn(date, dateStr, taskType) {
        const dayColumn = document.createElement('div');
        dayColumn.className = 'day-column';
        
        let detailsHTML = '';
        if (taskType === 'delivery') {
            detailsHTML = `<div class="day-financials financial-info" data-total-container="true">Total: <span class="value-text">R$ 0,00</span></div>`;
        } else {
            detailsHTML = `<div class="day-scheduled-financials financial-info" data-total-container="true">Total Agendado: <span class="value-text">R$ 0,00</span></div>`;
        }
        
        dayColumn.innerHTML = `
            <div class="day-header">
                <h3 class="day-title">${date.toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</h3>
                ${detailsHTML}
            </div>
            <div class="orders-container" data-date-iso="${dateStr}" data-task-type="${taskType}"></div>
        `;
        addDropListeners(dayColumn.querySelector('.orders-container'));
        return dayColumn;
    }

    // --- RENDERIZAÇÃO DA VISÃO DIÁRIA ---
    function renderDailyView() {
        const day1 = new Date(startDateInput.value + 'T00:00:00');
        const day2 = new Date(day1);
        day2.setDate(day1.getDate() + 1);

        const day1Str = day1.toISOString().split('T')[0];
        const day2Str = day2.toISOString().split('T')[0];
        
        document.getElementById('today-title').textContent = `Dia: ${day1.toLocaleDateString('pt-BR', {weekday: 'long', day: '2-digit', month: '2-digit'})}`;
        document.getElementById('tomorrow-title').textContent = `Dia: ${day2.toLocaleDateString('pt-BR', {weekday: 'long', day: '2-digit', month: '2-digit'})}`;
        
        document.querySelectorAll('#daily-view-container .orders-container').forEach(c => {
            const parentId = c.closest('.task-column').id;
            c.dataset.dateIso = parentId.startsWith('today') ? day1Str : day2Str;
            addDropListeners(c);
        });
        distributeCards();
    }
    
    // --- FUNÇÕES COMPARTILHADAS ---
    function addDropListeners(container) {
        if (container.dataset.taskType === 'wash' || container.dataset.taskType === 'pass') {
            container.addEventListener('dragover', handleDragOver);
            container.addEventListener('dragleave', handleDragLeave);
            container.addEventListener('drop', handleDrop);
        }
    }

    function distributeCards() {
        document.querySelectorAll('.orders-container').forEach(c => c.innerHTML = '');

        allOrdersData.forEach(order => {
            if (order.planned_wash_datetime) {
                const washDate = order.planned_wash_datetime.split('T')[0];
                document.querySelectorAll(`.orders-container[data-task-type="wash"][data-date-iso="${washDate}"]`)
                    .forEach(c => c.appendChild(createOrderCard(order, true, 'wash')));
            }
            if (order.planned_iron_datetime) {
                const passDate = order.planned_iron_datetime.split('T')[0];
                document.querySelectorAll(`.orders-container[data-task-type="pass"][data-date-iso="${passDate}"]`)
                    .forEach(c => c.appendChild(createOrderCard(order, true, 'pass')));
            }
            if (order.pickup_datetime) {
                const deliveryDate = order.pickup_datetime.split('T')[0];
                document.querySelectorAll(`.orders-container[data-task-type="delivery"][data-date-iso="${deliveryDate}"]`)
                    .forEach(c => c.appendChild(createOrderCard(order, false, 'delivery')));
            }
        });
        document.querySelectorAll('.orders-container').forEach(sortCardsInColumn);
        updateAllColumnTotals();
    }
    
    function createOrderCard(order, isScheduled = false, taskType = null) {
        const card = document.createElement('div');
        card.className = 'order-card';
        card.dataset.orderId = order.order_id;
        card.dataset.orderValue = order.total_amount;
        card.dataset.pickupDatetime = order.pickup_datetime;
        card.dataset.plannedWashDatetime = order.planned_wash_datetime;
        card.dataset.plannedIronDatetime = order.planned_iron_datetime;
        card.draggable = true;
        
        const isCompleted = ['CONCLUIDO', 'AGUARDANDO_RETIRADA'].includes(order.execution_status) || (taskType === 'wash' && order.is_washed) || (taskType === 'pass' && order.is_passed);
        if (isCompleted) card.classList.add('card-completed');

        const cancelButtonHTML = isScheduled ? `<button class="cancel-schedule-btn">×</button>` : '';
        let cardHTML = `${cancelButtonHTML}<div class="order-card-header"><div><h4 class="order-card-title">${order.customer_name}</h4><div class="order-card-subtitle">${order.order_id}</div></div><div class="order-card-value financial-info"><span class="value-text">R$ ${formatCurrency(order.total_amount)}</span></div></div>`;

        if (!isCompleted) {
            const washStatus = order.is_washed ? 'completed' : (order.planned_wash_datetime ? 'scheduled' : '');
            const passStatus = order.is_passed ? 'completed' : (order.planned_iron_datetime ? 'scheduled' : '');
            const timeText = isScheduled ? (formatTimeFromISO(taskType === 'wash' ? order.planned_wash_datetime : order.planned_iron_datetime) || 'Definir horário') : `Entrega: ${formatTimeFromISO(order.pickup_datetime)}`;
            const scheduleClass = isScheduled ? 'scheduled-time-container' : '';
            const scheduleTitle = isScheduled ? 'Clique para editar o horário' : '';
            const schedulePrefix = isScheduled ? 'Agendado: ' : '';

            cardHTML += `<div class="order-card-footer"><p class="${scheduleClass}" title="${scheduleTitle}">${schedulePrefix}<span class="editable-time">${timeText}</span></p><div class="status-indicators"><div class="status-item"><div class="status-circle ${washStatus}" data-status="is_washed"></div><span class="status-label">L</span></div><div class="status-item"><div class="status-circle ${passStatus}" data-status="is_passed"></div><span class="status-label">P</span></div></div></div>`;
        }
        card.innerHTML = cardHTML;
        
        card.addEventListener('dragstart', handleDragStart);
        card.querySelector('.cancel-schedule-btn')?.addEventListener('click', handleCancelSchedule);
        card.querySelectorAll('.status-circle').forEach(circle => circle.addEventListener('click', handleStatusClick));
        card.querySelector('.editable-time')?.addEventListener('click', handleEditableTimeClick);
        
        return card;
    }
    
    function sortCardsInColumn(container) {
        if (!container) return;
        const taskType = container.dataset.taskType;
        const cards = Array.from(container.children);
        const pending = cards.filter(c => !c.classList.contains('card-completed'));
        const completed = cards.filter(c => c.classList.contains('card-completed'));
        const getDateForCard = (card) => {
            const dateStr = card.dataset[taskType === 'wash' ? 'plannedWashDatetime' : taskType === 'pass' ? 'plannedIronDatetime' : 'pickupDatetime'];
            return dateStr && dateStr !== 'null' ? new Date(dateStr) : null;
        };
        pending.sort((a, b) => {
            const dateA = getDateForCard(a);
            const dateB = getDateForCard(b);
            if (dateA && dateB) return dateA - dateB;
            if (dateA) return -1; if (dateB) return 1; return 0;
        });
        
        const fragment = document.createDocumentFragment();
        pending.forEach(c => fragment.appendChild(c));
        completed.forEach(c => fragment.appendChild(c));
        container.innerHTML = '';
        container.appendChild(fragment);
    }

    // --- LÓGICA DE EVENTOS (DRAG & DROP, CLIQUES) ---

    // --- NOVA FUNÇÃO DE AUTO-SCROLL ---
    const SCROLL_THRESHOLD = 60; // Distância em pixels da borda para ativar
    const SCROLL_SPEED = 15;     // Velocidade da rolagem

    function handleAutoScroll(e) {
        // Rola para baixo
        if (e.clientY > window.innerHeight - SCROLL_THRESHOLD) {
            window.scrollBy(0, SCROLL_SPEED);
        } 
        // Rola para cima
        else if (e.clientY < SCROLL_THRESHOLD) {
            window.scrollBy(0, -SCROLL_SPEED);
        }
    }

    /**
     * FUNÇÃO MODIFICADA
     * Agora adiciona e remove o listener de auto-scroll
     */
    function handleDragStart(e) {
        const card = e.target.closest('.order-card');
        if (!card || card.classList.contains('card-completed')) { e.preventDefault(); return; }
        
        draggedCardInfo = { orderId: card.dataset.orderId, element: card };
        
        // Ativa o auto-scroll quando o arraste começa
        document.addEventListener('dragover', handleAutoScroll);

        setTimeout(() => card.classList.add('dragging'), 0);
        
        // Desativa o auto-scroll quando o arraste termina
        document.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            document.removeEventListener('dragover', handleAutoScroll);
        }, { once: true });
    }
    
    function handleDragOver(e) { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }
    function handleDragLeave(e) { e.currentTarget.classList.remove('drag-over'); }

    async function handleDrop(e) {
        e.preventDefault();
        const dropContainer = e.currentTarget;
        dropContainer.classList.remove('drag-over');
        if (!draggedCardInfo) return;
        
        const { orderId, element: originalCard } = draggedCardInfo;
        const targetTaskType = dropContainer.dataset.taskType;
        const targetDateStr = dropContainer.dataset.dateIso;
        if (!targetTaskType || !targetDateStr) return;
        
        const originalPickupDate = new Date(originalCard.dataset.pickupDatetime);
        const hours = originalPickupDate.toString() !== 'Invalid Date' ? originalPickupDate.getHours() : 12;
        const minutes = originalPickupDate.toString() !== 'Invalid Date' ? originalPickupDate.getMinutes() : 0;
        
        const newScheduleDate = new Date(`${targetDateStr}T00:00:00`);
        newScheduleDate.setHours(hours, minutes);
        const newScheduleDateTimeUTC = newScheduleDate.toISOString();

        try { 
            await scheduleTask(orderId, targetTaskType, newScheduleDateTimeUTC); 
            updateView(); 
        } 
        catch (error) { 
            alert(`Não foi possível agendar: ${error.message}`); 
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
            throw new Error(errorData.details || 'Falha ao agendar tarefa.');
        }
    }

    function handleCancelSchedule(e) {
        const card = e.target.closest('.order-card');
        const orderId = card.dataset.orderId;
        const taskType = card.closest('.orders-container').dataset.taskType;
        fetch('/api/v1/planning/cancel-schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: orderId, task_type: taskType })
        }).then(res => res.ok ? updateView() : alert('Não foi possível cancelar.'));
    }

    function handleStatusClick(e) {
        const circle = e.target;
        const card = circle.closest('.order-card');
        const orderId = card.dataset.orderId;
        const statusType = circle.dataset.status;
        const newValue = !circle.classList.contains('completed');
        fetch('/api/v1/planning/update-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: orderId, status_field: statusType, status_value: newValue })
        }).then(res => res.ok ? updateView() : alert('Não foi possível atualizar o status.'));
    }
    
    function handleEditableTimeClick(e) {
        const target = e.target.closest('.editable-time');
        if (!target || target.querySelector('input')) return;
        
        const originalText = target.textContent;
        const originalTime = originalText === 'Definir horário' ? '' : originalText;
        target.style.display = 'none';

        const input = document.createElement('input');
        input.type = 'time';
        input.className = 'time-input';
        input.value = originalTime;
        target.parentElement.appendChild(input);
        input.focus();

        const finishEditing = async () => {
            const newTime = input.value;
            if (!newTime || newTime === originalTime) {
                target.style.display = '';
                if (document.body.contains(input)) input.remove();
                return;
            }
            
            const card = input.closest('.order-card');
            const orderId = card.dataset.orderId;
            const taskType = card.closest('.orders-container').dataset.taskType;
            const dateStr = card.closest('.orders-container').dataset.dateIso;
            
            const [hours, minutes] = newTime.split(':');
            const newScheduleDate = new Date(`${dateStr}T00:00:00`);
            newScheduleDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));
            const newScheduleDateTimeUTC = newScheduleDate.toISOString();

            try { 
                await scheduleTask(orderId, taskType, newScheduleDateTimeUTC); 
                updateView(); 
            } 
            catch (error) { 
                alert(`Não foi possível salvar: ${error.message}`); 
                updateView(); 
            }
        };
        
        input.addEventListener('blur', finishEditing, { once: true });
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') input.blur();
            if (event.key === 'Escape') { input.value = originalTime; input.blur(); }
        });
    }

    // --- FUNÇÕES UTILITÁRIAS ---
    function updateAllColumnTotals() {
        document.querySelectorAll('.day-column, .task-column').forEach(column => {
            const totalContainer = column.querySelector('[data-total-container], .column-total');
            if (!totalContainer) return;

            const container = column.querySelector('.orders-container');
            const cards = container.querySelectorAll('.order-card');
            let totalValue = 0;
            cards.forEach(card => {
                totalValue += parseFloat(card.dataset.orderValue) || 0;
            });
            
            const valueTextElement = totalContainer.querySelector('.value-text');
            if (valueTextElement) {
                valueTextElement.textContent = `R$ ${formatCurrency(totalValue)}`;
            }
        });
    }

    function formatCurrency(amountInCents) {
        if (amountInCents === null || amountInCents === undefined) return '0,00';
        return (amountInCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function formatTimeFromISO(isoString) {
        if (!isoString || !isoString.includes('T')) return null;
        const localDate = new Date(isoString);
        return localDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    function toggleValuesVisibility() {
        mainContainer.classList.toggle('values-hidden');
        const isHidden = mainContainer.classList.contains('values-hidden');
        document.getElementById('eye-icon-open').style.display = isHidden ? 'none' : 'block';
        document.getElementById('eye-icon-closed').style.display = isHidden ? 'block' : 'none';
    }

    initialize();
});