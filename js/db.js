const DB_CONFIG = {
    locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.6.2/${file}`
};

let db = null;

async function initDB() {
    try {
        const SQL = await initSqlJs(DB_CONFIG);
        const savedDB = localStorage.getItem('namaz_db_v2');
        
        if (savedDB) {
            try {
                db = new SQL.Database(new Uint8Array(JSON.parse(savedDB)));
            } catch (err) {
                db = new SQL.Database();
                createSchema();
            }
        } else {
            db = new SQL.Database();
            createSchema();
            // Initial seed for current month
            ensureMonthExists(2026, 2); // March (0-indexed)
        }
    } catch (err) {
        console.error("SQLite Init Error", err);
    }
}

function createSchema() {
    db.run(`
        CREATE TABLE IF NOT EXISTS prayers (
            year INTEGER,
            month INTEGER,
            day INTEGER,
            type_idx INTEGER,
            completed INTEGER DEFAULT 0,
            PRIMARY KEY (year, month, day, type_idx)
        );
        CREATE TABLE IF NOT EXISTS trends (
            year INTEGER,
            week_num INTEGER,
            percent REAL
        );
    `);
}

function ensureMonthExists(year, month) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const existing = db.exec(`SELECT COUNT(*) FROM prayers WHERE year = ${year} AND month = ${month}`)[0].values[0][0];
    
    if (existing === 0) {
        db.run("BEGIN TRANSACTION");
        for (let d = 1; d <= daysInMonth; d++) {
            for (let p = 0; p < 6; p++) {
                db.run(`INSERT INTO prayers (year, month, day, type_idx, completed) VALUES (?, ?, ?, ?, 0)`, [year, month, d, p]);
            }
        }
        db.run("COMMIT");
        saveDB();
    }
}

function saveDB() {
    try {
        const data = db.export();
        localStorage.setItem('namaz_db_v2', JSON.stringify(Array.from(data)));
        window.dispatchEvent(new CustomEvent('db-saved'));
        
        // Push to cloud if available
        if (window.NamazSync) {
            window.NamazSync.syncToCloud(data);
        }
    } catch (err) { console.error("Save Error", err); }
}


const Database = {
    async getDays(year, month) {
        ensureMonthExists(year, month);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days = [];
        const dayNames = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];
        
        for (let d = 1; d <= daysInMonth; d++) {
            const dateObj = new Date(year, month, d);
            const name = dayNames[dateObj.getDay()];
            const history = [];
            const res = db.exec(`SELECT completed FROM prayers WHERE year = ${year} AND month = ${month} AND day = ${d} ORDER BY type_idx`);
            res[0].values.forEach(v => history.push(v[0] === 1));
            
            days.push({ name, date: d, history });
        }
        return days;
    },

    togglePrayer(year, month, day, pIdx) {
        db.run(`UPDATE prayers SET completed = 1 - completed WHERE year = ? AND month = ? AND day = ? AND type_idx = ?`, 
               [year, month, day, pIdx]);
        saveDB();
    },

    getStats(year, month) {
        const res = db.exec(`SELECT COUNT(*) FROM prayers WHERE year = ${year} AND month = ${month} AND completed = 1`);
        const completed = res[0].values[0][0];
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const total = daysInMonth * 6;
        return {
            completed,
            missed: 0,
            notMarked: total - completed,
            percent: Math.round((completed / total) * 100)
        };
    },

    getTrends(year) {
        // Simple mock for trends tied to year
        return {
            direction: 'up',
            change: '+12%',
            history: [10, 15, 12, 18, 20, 25, 22]
        };
    },

    exportDB() { return db.export(); }
};

window.NamazDB = { initDB, Database };
