// ====================== Cấu hình ======================
const API_BASE = "http://localhost:8000";

// ====================== Token helpers =================
function saveToken(token) {
    localStorage.setItem("access_token", token);
}

function getToken() {
    return localStorage.getItem("access_token");
}

function clearToken() {
    localStorage.removeItem("access_token");
}

// fetch có kèm Authorization
async function apiFetch(path, options = {}) {
    const token = getToken();
    const headers = options.headers || {};
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    const res = await fetch(API_BASE + path, { ...options, headers });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
    }
    return res.json();
}

// ====================== Router theo page =================
document.addEventListener("DOMContentLoaded", () => {
    const page = document.body.dataset.page;
    if (page === "auth") initAuthPage();
    if (page === "dashboard") initDashboardPage();
    if (page === "habits") initHabitsPage();
});

// ====================== AUTH PAGE ======================
function initAuthPage() {
    const tabButtons = document.querySelectorAll(".tab-button");
    const tabContents = document.querySelectorAll(".tab-content");

    tabButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            tabButtons.forEach((b) => b.classList.remove("active"));
            tabContents.forEach((c) => c.classList.remove("active"));
            btn.classList.add("active");
            document
                .getElementById(btn.dataset.tab + "-form")
                .classList.add("active");
        });
    });

    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const msg = document.getElementById("auth-message");

    // ---- Đăng nhập ----
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        msg.textContent = "";
        try {
            const email = loginForm.email.value;
            const password = loginForm.password.value;
            const data = await apiFetch("/auth/login", {
                method: "POST",
                body: JSON.stringify({ email, password }),
            });
            saveToken(data.access_token);
            msg.textContent = "Đăng nhập thành công, đang chuyển hướng…";
            msg.className = "message success";
            setTimeout(() => (window.location.href = "dashboard.html"), 600);
        } catch (err) {
            msg.textContent = "Đăng nhập thất bại: " + err.message;
            msg.className = "message error";
        }
    });

    // ---- Đăng ký ----
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        msg.textContent = "";
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
            msg.textContent = "Đăng ký thành công, hãy đăng nhập.";
            msg.className = "message success";
        } catch (err) {
            msg.textContent = "Đăng ký thất bại: " + err.message;
            msg.className = "message error";
        }
    });
}

// ====================== DASHBOARD PAGE ======================
async function initDashboardPage() {
    guardAuth();
    bindLogout();

    try {
        const [habits, logs] = await Promise.all([
            apiFetch("/habits/"),
            apiFetch("/logs/"),
        ]);
        renderDashboardStats(habits, logs);
        renderHeatmap(logs);
        renderRecentLogs(logs, habits);
    } catch (err) {
        alert("Lỗi tải dashboard: " + err.message);
    }
}

function renderDashboardStats(habits, logs) {
    const totalHabits = habits.length || 0;

    const todayStr = new Date().toISOString().slice(0, 10);
    const logsToday = logs.filter((l) => l.date?.slice(0, 10) === todayStr);

    const datesSet = new Set(logs.map((l) => l.date?.slice(0, 10)));
    let streak = 0;
    let cursor = new Date();
    while (true) {
        const d = cursor.toISOString().slice(0, 10);
        if (datesSet.has(d)) {
            streak += 1;
            cursor.setDate(cursor.getDate() - 1);
        } else {
            break;
        }
    }

    document.getElementById("stat-total-habits").textContent = totalHabits;
    document.getElementById("stat-today-completed").textContent =
        logsToday.length;
    document.getElementById("stat-current-streak").textContent =
        streak + " ngày";
}

function renderHeatmap(logs) {
    const container = document.getElementById("heatmap");
    container.innerHTML = "";

    const today = new Date();
    const days = 30;
    const countByDate = {};

    logs.forEach((l) => {
        const d = l.date?.slice(0, 10);
        if (!d) return;
        countByDate[d] = (countByDate[d] || 0) + 1;
    });

    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const count = countByDate[key] || 0;

        let level = 0;
        if (count === 1) level = 1;
        else if (count === 2) level = 2;
        else if (count === 3) level = 3;
        else if (count >= 4) level = 4;

        const cell = document.createElement("div");
        cell.className = "heat-cell" + (level ? ` level-${level}` : "");
        cell.dataset.tooltip = `${key} • ${count} thói quen`;
        container.appendChild(cell);
    }
}

function renderRecentLogs(logs, habits) {
    const listEl = document.getElementById("recent-logs");
    listEl.innerHTML = "";

    const habitById = {};
    habits.forEach((h) => (habitById[h.id] = h));

    const sorted = [...logs].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
    );
    const top = sorted.slice(0, 10);

    top.forEach((log) => {
        const li = document.createElement("li");
        li.className = "activity-item";
        const habitName =
            habitById[log.habit_id]?.name || "Thói quen #" + log.habit_id;
        const dateStr = new Date(log.date).toLocaleString("vi-VN");
        li.innerHTML = `<strong>${habitName}</strong> <span class="date">${dateStr}</span>`;
        listEl.appendChild(li);
    });
}

// ====================== HABITS PAGE ======================
async function initHabitsPage() {
    guardAuth();
    bindLogout();

    const form = document.getElementById("habit-form");
    const msg = document.getElementById("habit-message");
    const list = document.getElementById("habit-list");

    async function loadHabits() {
        const habits = await apiFetch("/habits/");
        list.innerHTML = "";
        habits.forEach((habit) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${habit.name}</td>
                <td>${habit.description || ""}</td>
                <td>
                    <button class="btn primary small" data-action="done" data-id="${habit.id}">
                        Đã làm hôm nay
                    </button>
                    <button class="btn ghost small" data-action="delete" data-id="${habit.id}">
                        Xoá
                    </button>
                </td>
            `;
            list.appendChild(tr);
        });
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        msg.textContent = "";
        try {
            const payload = {
                name: form.name.value,
                description: form.description.value,
            };
            await apiFetch("/habits/", {
                method: "POST",
                body: JSON.stringify(payload),
            });
            form.reset();
            msg.textContent = "Tạo thói quen thành công.";
            msg.className = "message success";
            loadHabits();
        } catch (err) {
            msg.textContent = "Lỗi: " + err.message;
            msg.className = "message error";
        }
    });

    list.addEventListener("click", async (e) => {
        const btn = e.target.closest("button[data-action]");
        if (!btn) return;

        const id = btn.dataset.id;
        const action = btn.dataset.action;

        if (action === "delete") {
            if (!confirm("Xoá thói quen này?")) return;
            try {
                await apiFetch(`/habits/${id}`, { method: "DELETE" });
                loadHabits();
            } catch (err) {
                alert("Lỗi xoá: " + err.message);
            }
        }

        if (action === "done") {
            const today = new Date().toISOString().slice(0, 10);
            try {
                await apiFetch("/logs/", {
                    method: "POST",
                    body: JSON.stringify({ habit_id: Number(id), date: today }),
                });
            } catch (err) {
                alert("Lỗi ghi log: " + err.message);
            }
        }
    });

    loadHabits();
}

// ====================== COMMON ======================
function guardAuth() {
    if (!getToken()) {
        window.location.href = "index.html";
    }
}

function bindLogout() {
    const btn = document.getElementById("logout-btn");
    if (!btn) return;
    btn.addEventListener("click", () => {
        clearToken();
        window.location.href = "index.html";
    });
}