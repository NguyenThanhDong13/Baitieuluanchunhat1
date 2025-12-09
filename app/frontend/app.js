// ======================= CONFIG ==========================
const API_BASE = "";

function apiUrl(path) {
    return path.startsWith("/") ? path : "/" + path;
}

// ======================= TOKEN ==========================
function saveToken(token) {
    localStorage.setItem("access_token", token);
}
function getToken() {
    return localStorage.getItem("access_token");
}
function clearToken() {
    localStorage.removeItem("access_token");
}

// ======================= API WRAPPER ====================
async function apiFetch(path, options = {}) {
    const token = getToken();
    const headers = options.headers || {};
    headers["Content-Type"] = "application/json";

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(apiUrl(path), { ...options, headers });
    const contentType = res.headers.get("content-type") || "";

    if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
    }

    if (contentType.includes("application/json")) {
        return res.json();
    }

    return null;
}

// ======================= PAGE ROUTING ====================
document.addEventListener("DOMContentLoaded", () => {
    const page = document.body.dataset.page;

    if (page === "auth")      initAuthPage();
    if (page === "dashboard") initDashboardPage();
    if (page === "habits")    initHabitsPage();
    if (page === "logs")      initLogsPage();
});

// ======================= COMMON ==========================
function guardAuth() {
    if (!getToken()) window.location.href = "/";
}

function bindLogout() {
    const btn = document.getElementById("logout-btn");
    if (btn) {
        btn.addEventListener("click", () => {
            clearToken();
            window.location.href = "/";
        });
    }
}

// ======================= AUTH PAGE =======================
function initAuthPage() {
    const tabs = document.querySelectorAll(".tab-button");
    const contents = document.querySelectorAll(".tab-content");
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const msg = document.getElementById("auth-message");

    tabs.forEach((btn) => {
        btn.addEventListener("click", () => {
            tabs.forEach((b) => b.classList.remove("active"));
            contents.forEach((c) => c.classList.remove("active"));

            btn.classList.add("active");
            document
                .getElementById(btn.dataset.tab + "-form")
                .classList.add("active");
        });
    });

    // LOGIN
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        msg.textContent = "";
        msg.className = "message";

        try {
            const payload = {
                email: loginForm.email.value,
                password: loginForm.password.value,
            };

            const data = await apiFetch("/auth/login", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            saveToken(data.access_token);
            msg.textContent = "Đăng nhập thành công!";
            msg.classList.add("success");

            // ĐĂNG NHẬP XONG → VÀO NHẬT KÝ
            setTimeout(() => (window.location.href = "/logs"), 500);
        } catch (err) {
            msg.textContent = "Đăng nhập thất bại: " + err.message;
            msg.classList.add("error");
        }
    });

    // REGISTER
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        msg.textContent = "";
        msg.className = "message";

        try {
            const payload = {
                full_name: registerForm.full_name.value,
                email: registerForm.email.value,
                password: registerForm.password.value,
            };

            await apiFetch("/auth/register", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            msg.textContent = "Đăng ký thành công! Hãy đăng nhập.";
            msg.classList.add("success");
        } catch (err) {
            msg.textContent = "Đăng ký thất bại: " + err.message;
            msg.classList.add("error");
        }
    });
}

// ======================= DASHBOARD PAGE ===================
async function initDashboardPage() {
    guardAuth();
    bindLogout();

    try {
        const habits = await apiFetch("/habits/");
        const logs = await apiFetch("/logs/");

        renderDashboardStats(habits, logs);
        renderHeatmap(logs);
        renderRecentLogs(logs, habits);
        await loadProgress();
    } catch (err) {
        alert("Lỗi tải dữ liệu dashboard: " + err.message);
    }
}

function renderDashboardStats(habits, logs) {
    const totalEl = document.getElementById("stat-total-habits");
    const todayDoneEl = document.getElementById("stat-today-completed");
    const streakEl = document.getElementById("stat-current-streak");

    if (!totalEl || !todayDoneEl || !streakEl) return;

    totalEl.textContent = habits.length;

    const today = new Date().toISOString().slice(0, 10);
    const todayLogs = logs.filter((l) => l.date?.slice(0, 10) === today);
    todayDoneEl.textContent = todayLogs.length;

    const logDates = new Set(logs.map((l) => l.date?.slice(0, 10)));
    let streak = 0;
    let cursor = new Date();

    while (true) {
        const d = cursor.toISOString().slice(0, 10);
        if (logDates.has(d)) {
            streak++;
            cursor.setDate(cursor.getDate() - 1);
        } else break;
    }

    streakEl.textContent = streak + " ngày";
}

function renderHeatmap(logs) {
    const container = document.getElementById("heatmap");
    if (!container) return;

    container.innerHTML = "";

    const today = new Date();
    const countByDate = {};

    logs.forEach((l) => {
        const d = l.date?.slice(0, 10);
        if (!d) return;
        countByDate[d] = (countByDate[d] || 0) + 1;
    });

    for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const count = countByDate[key] || 0;

        let lvl = 0;
        if (count >= 1) lvl = 1;
        if (count >= 2) lvl = 2;
        if (count >= 3) lvl = 3;
        if (count >= 4) lvl = 4;

        const cell = document.createElement("div");
        cell.className = "heat-cell level-" + lvl;
        container.appendChild(cell);
    }
}

function renderRecentLogs(logs, habits) {
    const wrap = document.getElementById("recent-logs");
    if (!wrap) return;

    wrap.innerHTML = "";

    const mapHabit = {};
    habits.forEach((h) => (mapHabit[h.id] = h.name));

    logs.slice(0, 10).forEach((log) => {
        const row = document.createElement("li");
        const name = mapHabit[log.habit_id] || "Không rõ";
        row.innerHTML = `<strong>${name}</strong> — ${new Date(
            log.date
        ).toLocaleString("vi-VN")}`;
        wrap.appendChild(row);
    });
}

// ======================= PROGRESS ========================
async function loadProgress() {
    const bar = document.getElementById("progress-bar");
    const text = document.getElementById("progress-text");
    const days = document.getElementById("progress-days");

    if (!bar || !text || !days) return;

    const data = await apiFetch("/progress/month");
    if (!data) return;

    bar.style.width = data.percent + "%";
    text.textContent = data.percent + "% hoàn thành";
    days.textContent = `Hoàn thành ${data.completed_days}/${data.total_days} ngày`;
}

// ======================= HABITS PAGE ======================
async function initHabitsPage() {
    guardAuth();
    bindLogout();

    const list = document.getElementById("habit-list");
    const form = document.getElementById("habit-form");
    const msg = document.getElementById("habit-message");

    if (!list || !form) return;

    async function load() {
        const habits = await apiFetch("/habits/");
        list.innerHTML = "";

        habits.forEach((h) => {
            list.innerHTML += `
                <tr>
                    <td>${h.name}</td>
                    <td>${h.description || ""}</td>
                    <td>
                        <button class="btn small primary" data-id="${h.id}" data-act="done">Hoàn thành</button>
                        <button class="btn small secondary" data-id="${h.id}" data-act="delete">Xóa</button>
                    </td>
                </tr>`;
        });
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        msg.textContent = "";
        msg.className = "message";

        try {
            await apiFetch("/habits/", {
                method: "POST",
                body: JSON.stringify({
                    name: form.name.value,
                    description: form.description.value,
                }),
            });

            msg.textContent = "Đã tạo thói quen!";
            msg.classList.add("success");
            form.reset();
            load();
        } catch (err) {
            msg.textContent = "Lỗi: " + err.message;
            msg.classList.add("error");
        }
    });

    list.addEventListener("click", async (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;

        const id = btn.dataset.id;
        const act = btn.dataset.act;

        if (act === "delete") {
            await apiFetch(`/habits/${id}`, { method: "DELETE" });
            load();
        }

        if (act === "done") {
            await apiFetch("/logs/", {
                method: "POST",
                body: JSON.stringify({
                    habit_id: Number(id),
                    date: new Date().toISOString().slice(0, 10),
                }),
            });

            alert("Đã đánh dấu hoàn thành!");
        }
    });

    load();
}

// ======================= LOGS PAGE (CALENDAR) ========================
async function initLogsPage() {
    guardAuth();
    bindLogout();

    const daysContainer = document.getElementById("calendar-days");
    const monthYearEl = document.getElementById("calendar-month-year");
    const habitsContainer = document.getElementById("selected-habits");
    const weekdayEl = document.getElementById("selected-weekday");
    const dateTextEl = document.getElementById("selected-date-text");

    if (!daysContainer || !monthYearEl || !habitsContainer) return;

    try {
        const [habits, logs] = await Promise.all([
            apiFetch("/habits/"),
            apiFetch("/logs/"),
        ]);

        // Gom log theo ngày
        const logsByDate = {};
        logs.forEach((l) => {
            const d = l.date?.slice(0, 10);
            if (!d) return;
            if (!logsByDate[d]) logsByDate[d] = [];
            logsByDate[d].push(l);
        });

        const weekdaysShort = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
        const weekdaysFull = [
            "Chủ nhật",
            "Thứ hai",
            "Thứ ba",
            "Thứ tư",
            "Thứ năm",
            "Thứ sáu",
            "Thứ bảy",
        ];
        const monthNames = [
            "Tháng 1",
            "Tháng 2",
            "Tháng 3",
            "Tháng 4",
            "Tháng 5",
            "Tháng 6",
            "Tháng 7",
            "Tháng 8",
            "Tháng 9",
            "Tháng 10",
            "Tháng 11",
            "Tháng 12",
        ];

        let current = new Date(); // tháng đang xem
        let selectedDate = new Date().toISOString().slice(0, 10);

        function renderSelectedHeader() {
            if (!weekdayEl || !dateTextEl) return;
            const d = new Date(selectedDate + "T00:00:00");
            weekdayEl.textContent = weekdaysFull[d.getDay()] || "";

            const day = d.getDate().toString().padStart(2, "0");
            const month = (d.getMonth() + 1).toString().padStart(2, "0");
            const year = d.getFullYear();
            dateTextEl.textContent = `${day}/${month}/${year}`;
        }

        function renderHabitsForSelected() {
            habitsContainer.innerHTML = "";

            const dayLogs = logsByDate[selectedDate] || [];
            const doneIds = new Set(dayLogs.map((l) => l.habit_id));

            habits.forEach((h) => {
                const done = doneIds.has(h.id);
                const card = document.createElement("div");
                card.className =
                    "habit-card" + (done ? " habit-card-done" : "");

                card.innerHTML = `
                    <div class="habit-icon">${done ? "✓" : ""}</div>
                    <div class="habit-info">
                        <div class="habit-name">${h.name}</div>
                        <div class="habit-status">${
                            done ? "Đã hoàn thành" : "Chưa làm"
                        }</div>
                    </div>
                `;
                habitsContainer.appendChild(card);
            });
        }

        function renderCalendar() {
            daysContainer.innerHTML = "";

            const display = new Date(
                current.getFullYear(),
                current.getMonth(),
                1
            );
            const firstDayIndex = display.getDay(); // 0 = CN
            const daysInMonth = new Date(
                display.getFullYear(),
                display.getMonth() + 1,
                0
            ).getDate();

            monthYearEl.textContent = `${monthNames[display.getMonth()]} ${
                display.getFullYear()
            }`;

            // Hàng thứ trong tuần (CN–T7)
            weekdaysShort.forEach((w) => {
                const el = document.createElement("div");
                el.className = "cal-weekday";
                el.textContent = w;
                daysContainer.appendChild(el);
            });

            // Ô trống trước ngày 1
            for (let i = 0; i < firstDayIndex; i++) {
                const empty = document.createElement("div");
                empty.className = "cal-day empty";
                daysContainer.appendChild(empty);
            }

            const todayStr = new Date().toISOString().slice(0, 10);

            // Các ngày trong tháng
            for (let day = 1; day <= daysInMonth; day++) {
                const dateObj = new Date(
                    display.getFullYear(),
                    display.getMonth(),
                    day
                );
                const dateStr = dateObj.toISOString().slice(0, 10);

                const cell = document.createElement("div");
                let classes = "cal-day";

                if (dateStr === todayStr) classes += " today";
                if (dateStr === selectedDate) classes += " selected";
                if (logsByDate[dateStr]?.length) classes += " has-log";

                cell.className = classes;
                cell.dataset.date = dateStr;
                cell.textContent = day.toString();

                daysContainer.appendChild(cell);
            }
        }

        // Nút chuyển tháng
        const btnPrev = document.getElementById("cal-prev");
        const btnNext = document.getElementById("cal-next");

        if (btnPrev) {
            btnPrev.addEventListener("click", () => {
                current.setMonth(current.getMonth() - 1);
                renderCalendar();
            });
        }

        if (btnNext) {
            btnNext.addEventListener("click", () => {
                current.setMonth(current.getMonth() + 1);
                renderCalendar();
            });
        }

        // Click chọn ngày
        daysContainer.addEventListener("click", (e) => {
            const cell = e.target.closest(".cal-day");
            if (!cell || cell.classList.contains("empty")) return;

            const dateStr = cell.dataset.date;
            if (!dateStr) return;

            selectedDate = dateStr;
            renderCalendar();
            renderSelectedHeader();
            renderHabitsForSelected();
        });

        // Lần render đầu tiên
        renderCalendar();
        renderSelectedHeader();
        renderHabitsForSelected();
    } catch (err) {
        alert("Không tải được nhật ký: " + err.message);
    }
}