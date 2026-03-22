document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize DB first (local)
    await window.NamazDB.initDB();
    const { Database, importCloudData } = window.NamazDB;
    const { isTrusted, verifyPassword, setTrusted, pullAllPrayers } = window.NamazSync;

    // 2. DOM Elements
    const authOverlay = document.getElementById('auth-overlay');
    const authPass = document.getElementById('auth-pass');
    const trustCheck = document.getElementById('trust-check');
    const appContainer = document.querySelector('.app-container');
    const statsContainer = document.getElementById('stats-container');
    const trendsContainer = document.getElementById('trends-container');
    const gridHeader = document.getElementById('grid-header');
    const gridBody = document.getElementById('grid-body');
    const saveIndicator = document.getElementById('save-indicator');
    const monthDisplay = document.getElementById('month-display');
    const calendarModal = document.getElementById('calendar-modal');
    const yearList = document.getElementById('year-list');
    const monthList = document.getElementById('month-list');

    lucide.createIcons();

    // 3. Auth
    if (isTrusted()) {
        unlockApp();
    }

    authPass.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleUnlock();
    });

    window.handleUnlock = async () => {
        const pass = authPass.value;
        const valid = await verifyPassword(pass);
        if (valid) {
            if (trustCheck.checked) setTrusted(true);
            unlockApp();
        } else {
            gsap.to('.auth-card', { x: 10, repeat: 5, yoyo: true, duration: 0.05 });
            authPass.value = '';
            authPass.placeholder = 'Неверный пароль';
        }
    };

    async function unlockApp() {
        // Pull cloud data AFTER auth (user is verified)
        const syncIcon = document.getElementById('sync-status');
        if (syncIcon) syncIcon.classList.add('syncing');
        
        try {
            const cloudData = await Promise.race([
                pullAllPrayers(),
                new Promise(resolve => setTimeout(() => resolve(null), 5000))
            ]);
            if (cloudData && cloudData.length > 0) {
                importCloudData(cloudData);
                console.log(`Synced ${cloudData.length} prayers from cloud.`);
            }
        } catch (e) {
            console.warn("Cloud sync on login skipped:", e);
        } finally {
            if (syncIcon) syncIcon.classList.remove('syncing');
        }

        gsap.to(authOverlay, {
            opacity: 0, y: -50, duration: 0.8, ease: "power3.inOut",
            onComplete: () => {
                authOverlay.style.display = 'none';
                appContainer.style.display = 'block';
                gsap.from(appContainer, { opacity: 0, y: 20, duration: 1 });
                renderAll();
            }
        });
    }

    // 4. State
    let currentYear = 2026;
    let currentMonth = 2;

    // 5. Render
    async function renderAll() {
        const stats = Database.getStats(currentYear, currentMonth);
        const days = await Database.getDays(currentYear, currentMonth);
        const trends = Database.getTrends(currentYear);
        updateHeader();
        renderStats(stats);
        renderGrid(days);
        renderTrends(trends);
    }

    function updateHeader() {
        const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
        monthDisplay.innerText = `${months[currentMonth]}, ${currentYear}`;
    }

    function renderStats(stats) {
        const circleLen = 2 * Math.PI * 50;
        const offset = circleLen - (stats.percent / 100) * circleLen;
        statsContainer.innerHTML = `
            <div class="stat-group">
                <div class="stat-item"><span class="stat-label">выполнено</span><span class="stat-value">${stats.completed}</span></div>
                <div class="stat-item"><span class="stat-label">не отмечено</span><span class="stat-value">${stats.notMarked}</span></div>
            </div>
            <div class="progress-container">
                <svg class="progress-circle-svg" width="140" height="140">
                    <circle class="progress-circle-bg" cx="70" cy="70" r="50"></circle>
                    <circle id="progress-bar" class="progress-circle-bar" cx="70" cy="70" r="50" 
                            style="stroke-dasharray: ${circleLen}; stroke-dashoffset: ${circleLen};"></circle>
                </svg>
                <div class="progress-text">${stats.percent}%</div>
            </div>`;
        gsap.to('#progress-bar', { strokeDashoffset: offset, duration: 1.5, ease: "power2.out" });
    }

    function renderGrid(days) {
        const prayerLabels = ['Ф', 'З', 'А', 'М', 'И', 'В'];
        gridHeader.innerHTML = `<div class="sticky-corner"></div>` + days.map(d => `
            <div class="day-col"><span class="day-name">${d.name}</span><span class="day-date">${d.date}</span></div>
        `).join('');

        gridBody.innerHTML = prayerLabels.map((label, pIdx) => `
            <div class="grid-row">
                <div class="prayer-label"><span class="label-tab">${label}</span></div>
                ${days.map(day => `
                    <div class="grid-cell">
                        <div class="circle ${day.history[pIdx] ? 'completed' : 'not-marked'}" 
                             onclick="handleToggle(${day.date}, ${pIdx})">
                            ${day.history[pIdx] ? '<i data-lucide="check" style="width: 20px;"></i>' : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `).join('');
        lucide.createIcons();
    }

    function renderTrends(trends) {
        const isUp = trends.direction === 'up';
        trendsContainer.innerHTML = `
            <div class="trend-card glass">
                <div class="trend-icon-box ${trends.direction}"><i data-lucide="${isUp ? 'trending-up' : 'trending-down'}"></i></div>
                <div class="trend-info">
                    <div class="trend-title">Тренд за год</div>
                    <div class="trend-value" style="color: ${isUp ? 'var(--accent-primary)' : 'var(--accent-red)'}">${trends.change} ${isUp ? 'вверх' : 'вниз'}</div>
                </div>
                <div class="sparkline">
                    ${trends.history.map((h, i) => `<div class="spark-bar ${i === trends.history.length - 1 ? 'accent' : ''}" style="height: 0px;"></div>`).join('')}
                </div>
            </div>`;
        lucide.createIcons();
        gsap.to('.spark-bar', { height: (i) => trends.history[i] * 1.5, stagger: 0.1, duration: 1, ease: "elastic.out(1, 0.3)" });
    }

    // 6. Interaction
    window.handleToggle = async (day, pIdx) => {
        Database.togglePrayer(currentYear, currentMonth, day, pIdx);
        renderAll();
    };

    window.toggleCalendar = () => {
        const isHidden = getComputedStyle(calendarModal).display === 'none';
        if (isHidden) {
            renderSelectors();
            calendarModal.style.display = 'flex';
            gsap.to(calendarModal, { opacity: 1, duration: 0.4 });
        } else {
            gsap.to(calendarModal, { opacity: 0, duration: 0.3, onComplete: () => calendarModal.style.display = 'none' });
        }
    };

    function renderSelectors() {
        const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
        yearList.innerHTML = Array.from({ length: 2026 - 1950 + 1 }, (_, i) => 1950 + i).map(y =>
            `<div class="selector-item ${y === currentYear ? 'active' : ''}" onclick="selectDate(${y}, ${currentMonth})">${y}</div>`
        ).join('');
        monthList.innerHTML = months.map((m, i) =>
            `<div class="selector-item ${i === currentMonth ? 'active' : ''}" onclick="selectDate(${currentYear}, ${i})">${m}</div>`
        ).join('');
        setTimeout(() => {
            yearList.querySelector('.active')?.scrollIntoView({ behavior: 'smooth', inline: 'center' });
            monthList.querySelector('.active')?.scrollIntoView({ behavior: 'smooth', inline: 'center' });
        }, 100);
    }

    window.selectDate = async (year, month) => { currentYear = year; currentMonth = month; renderSelectors(); await renderAll(); };
    window.prevMonth = async () => { if (currentMonth === 0) { currentMonth = 11; currentYear--; } else { currentMonth--; } await renderAll(); };

    window.downloadBackup = () => {
        const u8array = Database.exportDB();
        const blob = new Blob([u8array], { type: "application/x-sqlite3" });
        const a = document.createElement("a");
        a.href = window.URL.createObjectURL(blob);
        a.download = `namaz_backup_${new Date().toISOString().split('T')[0]}.sqlite`;
        a.click();
    };

    window.addEventListener('db-saved', () => {
        saveIndicator.classList.add('active');
        setTimeout(() => saveIndicator.classList.remove('active'), 2000);
    });
});
