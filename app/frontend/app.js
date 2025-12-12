/*********************************************************
 *                     CONFIG
 *********************************************************/
const API_BASE = "";

function apiUrl(path) {
    return path.startsWith("/") ? path : "/" + path;
}

/*********************************************************
 *                     TOKEN
 *********************************************************/
function saveToken(token) {
    localStorage.setItem("access_token", token);
}
function getToken() {
    return localStorage.getItem("access_token");
}
function clearToken() {
    localStorage.removeItem("access_token");
}

/*********************************************************
 *                     API WRAPPER
 *********************************************************/
async function apiFetch(path, options = {}) {
    const token = getToken();
    const headers = options.headers || {};
    headers["Content-Type"] = "application/json";

    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(apiUrl(path), { ...options, headers });
    const contentType = res.headers.get("content-type") || "";

    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
    }

    if (contentType.includes("application/json")) return res.json();

    return null;
}

/*********************************************************
 *                     ROUTING
 *********************************************************/
document.addEventListener("DOMContentLoaded", () => {
    const page = document.body.dataset.page;

    if (page === "auth") initAuthPage();
    if (page === "dashboard") initDashboardPage();
    if (page === "habits") initHabitsPage();
    if (page === "logs") initLogsPage();
});

/*********************************************************
 *                     COMMON
 *********************************************************/
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

/*********************************************************
 *                     AUTH PAGE
 *********************************************************/
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
            document.getElementById(btn.dataset.tab + "-form").classList.add("active");
        });
    });

    /** LOGIN */
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

            setTimeout(() => (window.location.href = "/logs"), 500);
        } catch (err) {
            msg.textContent = "Đăng nhập thất bại: " + err.message;
            msg.classList.add("error");
        }
    });

    /** REGISTER */
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

/*********************************************************
 *                     HEATMAP (GLOBAL FIX)
 *********************************************************/
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

        const el = document.createElement("div");
        el.className = "heat-cell level-" + lvl;

        container.appendChild(el);
    }
}
/*********************************************************
 *         CÂU NÓI TẠO ĐỘNG LỰC (CHỈ THÊM – KHÔNG SỬA)
 *********************************************************/
const MOTIVATIONAL_QUOTES = [
    "Thành công là tổng của những nỗ lực nhỏ lặp lại mỗi ngày.",
    "Không cần nhanh, chỉ cần đều đặn.",
    "Kỷ luật là cầu nối giữa mục tiêu và thành tựu.",
    "Hôm nay bạn chỉ cần tốt hơn hôm qua 1%.",
    "10 phút mỗi ngày cũng đủ để thay đổi cuộc đời.",
    "Thói quen tốt tạo nên cuộc sống tốt.",
    "Bắt đầu nhỏ – Kiên trì lớn."
];

function getDailyQuote() {
    const day = new Date().getDate();
    return MOTIVATIONAL_QUOTES[day % MOTIVATIONAL_QUOTES.length];
}

/*********************************************************
 *                     DASHBOARD PAGE
 *********************************************************/
async function initDashboardPage() {

    guardAuth();
    bindLogout();

    try {
        const habits = await apiFetch("/habits/");
        const logs = await apiFetch("/logs/");

        renderDashboardStats(habits, logs);
        renderHeatmap(logs);
        renderRecentLogs(logs, habits);
        loadProgress();
        renderWeeklyChart(logs);

        setupSocialSharing();

        // Hiển thị câu nói tạo động lực
    const q = document.getElementById("quote-text");
    if (q) q.textContent = getDailyQuote();
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
    todayDoneEl.textContent = logs.filter((l) => l.date?.slice(0, 10) === today).length;

    const logDates = new Set(logs.map((l) => l.date?.slice(0, 10)));
    let streak = 0;
    let d = new Date();

    while (true) {
        const key = d.toISOString().slice(0, 10);
        if (logDates.has(key)) {
            streak++;
            d.setDate(d.getDate() - 1);
        } else break;
    }

    streakEl.textContent = `${streak} ngày`;
}

function renderRecentLogs(logs, habits) {
    const wrap = document.getElementById("recent-logs");
    if (!wrap) return;

    wrap.innerHTML = "";

    const mapHabit = {};
    habits.forEach((h) => (mapHabit[h.id] = h.name));

    logs.slice(0, 10).forEach((l) => {
        const name = mapHabit[l.habit_id] || "Không rõ";
        const li = document.createElement("li");

        li.innerHTML = `<strong>${name}</strong> — ${new Date(l.date).toLocaleString("vi-VN")}`;
        wrap.appendChild(li);
    });
}

async function loadProgress() {
    const bar = document.getElementById("progress-bar");
    const text = document.getElementById("progress-text");
    const days = document.getElementById("progress-days");

    if (!bar || !text || !days) return;

    const data = await apiFetch("/progress/month");

    bar.style.width = data.percent + "%";
    text.textContent = data.percent + "% hoàn thành";
    days.textContent = `Hoàn thành ${data.completed_days}/${data.total_days} ngày`;
}

/*********************************************************
 *                     HABITS PAGE
 *********************************************************/
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

        const id = Number(btn.dataset.id);
        const act = btn.dataset.act;

        if (act === "delete") {
            await apiFetch(`/habits/${id}`, { method: "DELETE" });
            load();
        }

        if (act === "done") {
            await apiFetch("/logs/", {
                method: "POST",
                body: JSON.stringify({
                    habit_id: id,
                    date: new Date().toISOString().slice(0, 10),
                }),
            });

            alert("Đã đánh dấu hoàn thành hôm nay!");
        }
    });

    load();
}

/*********************************************************
 *                     LOGS PAGE (CALENDAR + TICK)
 *********************************************************/
async function initLogsPage() {
    guardAuth();
    bindLogout();

    const daysContainer = document.getElementById("calendar-days");
    const monthYearEl = document.getElementById("calendar-month-year");
    const weekdayEl = document.getElementById("selected-weekday");
    const dateTextEl = document.getElementById("selected-date-text");
    const habitsContainer = document.getElementById("selected-habits");

    if (!daysContainer || !monthYearEl || !habitsContainer) return;

    try {
        const habits = await apiFetch("/habits/");
        const logs = await apiFetch("/logs/");

        /** Gom log theo ngày */
        const logsByDate = {};
        logs.forEach((l) => {
            const d = l.date?.slice(0, 10);
            if (!logsByDate[d]) logsByDate[d] = [];
            logsByDate[d].push(l);
        });

        const weekdays = ["Chủ nhật","Thứ hai","Thứ ba","Thứ tư","Thứ năm","Thứ sáu","Thứ bảy"];
        const monthNames = [
            "Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6",
            "Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12"
        ];

        let current = new Date();
        let selectedDate = new Date().toISOString().slice(0, 10);

        /** HEADER */
        function renderSelectedHeader() {
            const d = new Date(selectedDate + "T00:00:00");
            weekdayEl.textContent = weekdays[d.getDay()];

            dateTextEl.textContent =
                `${d.getDate().toString().padStart(2,"0")}/${
                    (d.getMonth()+1).toString().padStart(2,"0")
                }/${d.getFullYear()}`;
        }

        /** HABIT LIST */
function renderHabitsForSelected() {
    habitsContainer.innerHTML = "";

    const list = logsByDate[selectedDate] || [];
    const logMap = {};
    list.forEach((l) => (logMap[l.habit_id] = l));

    habits.forEach((h) => {
        const log = logMap[h.id];
        const done = !!log;

        const icon = h.name.split(" ")[0];
        const plain = h.name.replace(/^\S+\s/, "");

        const card = document.createElement("div");
        card.className = "habit-card" + (done ? " habit-card-done" : "");

        card.innerHTML = `
            <div class="habit-left" style="display:flex;align-items:center;gap:12px;">
                <div class="habit-icon">${icon}</div>

                <div class="habit-info">
                    <div class="habit-name">${plain}</div>
                    <div class="habit-status">${done ? "Đã hoàn thành" : "Chưa làm"}</div>
                </div>
            </div>

            <div style="display:flex; align-items:center; gap:14px;">

                <button class="habit-delete-btn"
                        data-id="${h.id}"
                        style="background:#ffe1e1;border:none;padding:8px 10px;border-radius:8px;cursor:pointer;font-size:20px;">
                    ❌
                </button>

                <button class="habit-toggle ${done ? "done" : ""}"
                    data-habit-id="${h.id}"
                    data-log-id="${done ? log.id : ""}">
                    <div class="toggle-circle">
                        <span class="toggle-check">✓</span>
                    </div>
                    ${done ? "Đã xong" : "Đánh dấu xong"}
                </button>
            </div>
        `;

        habitsContainer.appendChild(card);
    });

    // ========================= XOÁ HABIT =========================
    document.querySelectorAll(".habit-delete-btn").forEach((btn) => {
        btn.onclick = async () => {
            const id = btn.dataset.id;

            if (!confirm("Bạn có chắc muốn xoá thói quen này?")) return;

            try {
                await apiFetch(`/habits/${id}`, { method: "DELETE" });

                const newHabits = await apiFetch("/habits/");
                habits.splice(0, habits.length, ...newHabits);

                const newLogs = await apiFetch("/logs/");
                logsByDate = {};
                newLogs.forEach((l) => {
                    const d = l.date.slice(0, 10);
                    (logsByDate[d] ||= []).push(l);
                });

                renderCalendar();
                renderSelectedHeader();
                renderHabitsForSelected();
                renderHeatmap(newLogs);

            } catch (err) {
                alert("Không xóa được: " + err.message);
            }
        };
    });

    // ========================= TICK HOÀN THÀNH ==================
    bindToggleEvents();
}



        /** TICK EVENT */
        function bindToggleEvents() {
            document.querySelectorAll(".habit-toggle").forEach((btn) => {
                btn.onclick = async () => {
                    const habitId = Number(btn.dataset.habitId);
                    const logId = btn.dataset.logId;

                    try {
                        if (logId) {
                            await apiFetch(`/logs/${logId}`, { method: "DELETE" });
                            logsByDate[selectedDate] = logsByDate[selectedDate].filter(
                                (l) => l.id !== Number(logId)
                            );
                        } else {
                            const created = await apiFetch("/logs/", {
                                method: "POST",
                                body: JSON.stringify({
                                    habit_id: habitId,
                                    date: selectedDate,
                                }),
                            });

                            logsByDate[selectedDate] = logsByDate[selectedDate] || [];
                            logsByDate[selectedDate].push(created);
                        }

                        renderCalendar();
                        renderSelectedHeader();
                        renderHabitsForSelected();
                    } catch (err) {
                        alert("Không cập nhật được: " + err.message);
                    }
                };
            });
        }

        /** CALENDAR */
        function renderCalendar() {
            daysContainer.innerHTML = "";

            const display = new Date(current.getFullYear(), current.getMonth(), 1);
            const firstDay = display.getDay();
            const total = new Date(display.getFullYear(), display.getMonth() + 1, 0).getDate();

            monthYearEl.textContent = `${monthNames[display.getMonth()]} ${display.getFullYear()}`;

            ["CN","T2","T3","T4","T5","T6","T7"].forEach((w) => {
                const el = document.createElement("div");
                el.className = "cal-weekday";
                el.textContent = w;
                daysContainer.appendChild(el);
            });

            for (let i = 0; i < firstDay; i++) {
                const e = document.createElement("div");
                e.className = "cal-day empty";
                daysContainer.appendChild(e);
            }

            const todayStr = new Date().toISOString().slice(0,10);

            for (let d = 1; d <= total; d++) {
                const dateObj = new Date(display.getFullYear(), display.getMonth(), d);
                const dateStr = dateObj.toISOString().slice(0,10);

                let classes = "cal-day";
                if (dateStr === todayStr) classes += " today";
                if (dateStr === selectedDate) classes += " selected";
                if (logsByDate[dateStr]?.length) classes += " has-log";

                const cell = document.createElement("div");
                cell.className = classes;
                cell.dataset.date = dateStr;
                cell.textContent = d;

                daysContainer.appendChild(cell);
            }
        }

        /** EVENTS */
        document.getElementById("cal-prev").onclick = () => {
            current.setMonth(current.getMonth() - 1);
            renderCalendar();
        };

        document.getElementById("cal-next").onclick = () => {
            current.setMonth(current.getMonth() + 1);
            renderCalendar();
        };

        daysContainer.onclick = (e) => {
            const cell = e.target.closest(".cal-day");
            if (!cell || cell.classList.contains("empty")) return;

            selectedDate = cell.dataset.date;
            renderCalendar();
            renderSelectedHeader();
            renderHabitsForSelected();
        };

        /** POPUP CREATE HABIT */
        const popup = document.getElementById("create-popup");
        const btnOpenCreate = document.getElementById("btn-open-create");
        const btnClosePopup = document.getElementById("popup-close");

        const iconChoices = document.getElementById("icon-choices");
        const iconHidden = document.getElementById("habit-icon");

        const timePopup = document.getElementById("timepicker");
        const btnOpenTime = document.getElementById("open-timepicker");
        const btnTimeCancel = document.getElementById("time-cancel");
        const btnTimeOk = document.getElementById("time-ok");
        const timeInput = document.getElementById("time-input");
        const selectedTimeEl = document.getElementById("selected-time");

        btnOpenCreate.onclick = () => popup.classList.remove("hidden");
        btnClosePopup.onclick = () => popup.classList.add("hidden");

        btnOpenTime.onclick = () => timePopup.classList.remove("hidden");
        btnTimeCancel.onclick = () => timePopup.classList.add("hidden");
        btnTimeOk.onclick = () => {
            selectedTimeEl.textContent = timeInput.value;
            timePopup.classList.add("hidden");
        };

        if (iconChoices) {
            iconChoices.onclick = (e) => {
                const btn = e.target.closest(".icon-pill");
                if (!btn) return;

                iconChoices.querySelectorAll(".icon-pill").forEach((b) => b.classList.remove("selected"));
                btn.classList.add("selected");

                iconHidden.value = btn.dataset.icon;
            };
        }

        document.getElementById("popup-save").onclick = async () => {
            const nameInput = document.getElementById("habit-name");
            const noteInput = document.getElementById("habit-note");

            const baseName = nameInput.value.trim();
            const icon = iconHidden.value;

            if (!baseName) {
                alert("Vui lòng nhập tên thói quen");
                return;
            }

            const finalName = icon ? `${icon} ${baseName}` : baseName;

            try {
                await apiFetch("/habits/", {
                    method: "POST",
                    body: JSON.stringify({
                        name: finalName,
                        description: noteInput.value || "",
                    }),
                });

                popup.classList.add("hidden");

                const newHabits = await apiFetch("/habits/");
                habits.splice(0, habits.length, ...newHabits);

                renderHabitsForSelected();
            } catch (err) {
                alert("Không tạo được thói quen: " + err.message);
            }
        };
     
        /** INITIAL RENDER */
        renderCalendar();
        renderSelectedHeader();
        renderHabitsForSelected();
        
        /*******************************************************
 *        NOTIFICATION REMINDER (MỖI 5 PHÚT)
 *******************************************************/
requestNotificationPermission().then((granted) => {

    if (!granted) return;

    setInterval(() => {

        const today = new Date().toISOString().slice(0, 10);

        const logsToday = logsByDate[today] || [];
        const doneIds = logsToday.map(l => l.habit_id);

        const todo = habits.filter(h => !doneIds.includes(h.id));

        if (todo.length > 0) {
            sendNotification(
                "Nhắc nhở Habit Tracker",
                `Bạn còn ${todo.length} thói quen chưa hoàn thành hôm nay!`
            );
        }

    }, 1 * 60 * 1000); // 1 phút
});


    } catch (err) {
        alert("Không tải được nhật ký: " + err.message);
    }
}
function renderWeeklyChart(logs) {
    const ctx = document.getElementById("weeklyChart");
    if (!ctx) return;

    // --- Lấy ngày hôm nay ---
    const today = new Date();

    // Tạo mảng 4 tuần gần nhất (tuần 0 = tuần hiện tại)
    let weekRanges = [];
    for (let i = 0; i < 4; i++) {
        let start = new Date(today);
        start.setDate(today.getDate() - today.getDay() - i * 7); // đầu tuần

        let end = new Date(start);
        end.setDate(start.getDate() + 6);

        weekRanges.push({ start, end });
    }

    // --- Đếm số log mỗi tuần ---
    let weeklyCounts = weekRanges.map((range) => {
        return logs.filter((l) => {
            let d = new Date(l.date);
            return d >= range.start && d <= range.end;
        }).length;
    });

    // --- Tính % hoàn thành mỗi tuần ---
    let percent = weeklyCounts.map((c) => {
        const totalPossible = 7; // mỗi tuần 7 ngày
        return Math.round((c / totalPossible) * 100);
    });

    // --- Label tuần đẹp mắt ---
    const labels = weekRanges.map((r, idx) => {
        const d = r.start.getDate().toString().padStart(2, "0");
        const m = (r.start.getMonth() + 1).toString().padStart(2, "0");
        return `Tuần ${4 - idx}\n(${d}/${m})`;
    });

    // --- Xóa chart cũ để tránh lỗi ---
    if (window.weekChart) window.weekChart.destroy();

    // --- Vẽ biểu đồ ---
    window.weekChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels.reverse(),       // tuần 1 → tuần 4
            datasets: [
                {
                    label: "Tỷ lệ hoàn thành (%)",
                    data: percent.reverse(), // tuần 1 → tuần 4
                    backgroundColor: "rgba(54, 162, 235, 0.8)",
                    borderRadius: 6,
                    borderSkipped: false,
                },
            ],
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: (v) => v + "%",
                    },
                },
            },
        },
    });
}
/******************************************************
 *         BIỂU ĐỒ CỘT — HOÀN THÀNH THEO TUẦN
 ******************************************************/
function renderWeeklyChart(logs) {
    const canvas = document.getElementById("weeklyChart");
    if (!canvas) return; // nếu không có canvas thì bỏ qua

    const ctx = canvas.getContext("2d");

    // Gom log theo ngày
    const countByDate = {};
    logs.forEach(l => {
        const d = l.date?.slice(0, 10);
        countByDate[d] = (countByDate[d] || 0) + 1;
    });

    // Tính 4 tuần gần nhất
    const labels = ["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4"];
    const values = [];
    const today = new Date();

    for (let i = 3; i >= 0; i--) {
        let completed = 0;
        let total = 0;

        for (let d = 0; d < 7; d++) {
            const dateObj = new Date(today);
            dateObj.setDate(today.getDate() - (i * 7 + d));

            const key = dateObj.toISOString().slice(0, 10);

            total += 1; // mỗi ngày ít nhất 1 habit → dùng để tính % đơn giản
            if (countByDate[key]) completed++;
        }

        const percent = Math.round((completed / total) * 100);
        values.push(percent);
    }

    // Nếu đã có chart → xóa trước
    if (window.weekChart) window.weekChart.destroy();

    // Vẽ mới
    window.weekChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [
                {
                    label: "% hoàn thành",
                    data: values,
                    backgroundColor: "rgba(54,162,235,0.85)",
                    borderRadius: 8,
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { callback: v => v + "%" }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}
/*********************************************************
 *                     NOTIFICATION SETUP
 *********************************************************/
async function requestNotificationPermission() {
    if (!("Notification" in window)) {
        console.log("Trình duyệt không hỗ trợ Notification");
        return false;
    }

    if (Notification.permission === "granted") return true;

    const permission = await Notification.requestPermission();
    return permission === "granted";
}

function sendNotification(title, body) {
    if (Notification.permission === "granted") {
        new Notification(title, { body: body });
    }
}
/*********************************************************
 *                 SOCIAL SHARING
 *********************************************************/
function setupSocialSharing() {
    const btn = document.getElementById("share-btn");
    const msg = document.getElementById("share-msg");

    if (!btn) return;

    btn.onclick = async () => {
        const streakEl = document.getElementById("stat-current-streak");
        const totalEl = document.getElementById("stat-total-habits");

        const streak = streakEl ? streakEl.textContent : "0 ngày";
        const total = totalEl ? totalEl.textContent : "0";

        const text = `🔥 Tôi đang duy trì streak ${streak} với ${total} thói quen mỗi ngày!
#HabitTracker`;

        // ✅ Web Share API
        if (navigator.share) {
            try {
                await navigator.share({
                    title: "Habit Tracker",
                    text: text,
                });
                if (msg) msg.textContent = "Đã chia sẻ thành công!";
            } catch (err) {
                console.log("Huỷ chia sẻ");
            }
        } 
        // ✅ Fallback: copy text
        else {
            await navigator.clipboard.writeText(text);
            if (msg) msg.textContent = "Đã sao chép nội dung để chia sẻ!";
        }
    };
}
