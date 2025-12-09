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
        throw new Error(text || `HTTP ${res.status}`);
    }

    // Chỉ chấp nhận JSON, các loại khác sẽ báo lỗi để tránh lỗi Unexpected "<"
    if (!contentType.includes("application/json")) {
        const text = await res.text();
        throw new Error("Server trả về không phải JSON: " + text.slice(0, 150));
    }

    return res.json();
}

// ======================= PAGE ROUTING ====================
document.addEventListener("DOMContentLoaded", () => {
    const page = document.body.dataset.page;

    if (page === "auth") initAuthPage();
    if (page === "dashboard") initDashboardPage();
    if (page === "habits") initHabitsPage();
});

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
            document.getElementById(btn.dataset.tab + "-form").classList.add("active");
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

            setTimeout(() => (window.location.href = "/dashboard"), 500);

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

// ======================= DASHBOARD ========================
async function initDashboardPage() {
    guardAuth();
    bindLogout();

    try {
        let habits = await apiFetch("/habits/");
        let logs = await apiFetch("/logs/");

        // Bảo vệ tránh null
        habits = Array.isArray(habits) ? habits : [];
        logs   = Array.isArray(logs) ? logs : [];

        renderDashboardStats(habits, logs);
        renderHeatmap(logs);
        renderRecentLogs(logs, habits);

        await loadProgress();

    } catch (err) {
        alert("Lỗi tải dữ liệu dashboard: " + err.message);
        console.error(err);
    }
}

// DASHBOARD STATS
function renderDashboardStats(habits, logs) {
    document.getElementById("stat-total-habits").textContent = habits.length;

    const today = new Date().toISOString().slice(0, 10);
    const todayLogs = logs.filter((l) => l.date?.slice(0, 10) === today);

    document.getElementById("stat-today-completed").textContent = todayLogs.length;

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

    document.getElementById("stat-current-streak").textContent = streak + " ngày";
}

// HEATMAP
function renderHeatmap(logs) {
    const container = document.getElementById("heatmap");
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

// RECENT LOGS
function renderRecentLogs(logs, habits) {
    habits = Array.isArray(habits) ? habits : [];
    logs   = Array.isArray(logs) ? logs : [];

    const map = {};
    habits.forEach(h => map[h.id] = h.name);

    const wrap = document.getElementById("recent-logs");
    wrap.innerHTML = "";

    logs.slice(0, 10).forEach(l => {
        const li = document.createElement("li");
        li.innerHTML = `<strong>${map[l.habit_id] || "Không rõ"}</strong> — ${new Date(l.date).toLocaleString("vi-VN")}`;
        wrap.appendChild(li);
    });
}

// PROGRESS
async function loadProgress() {
    const data = await apiFetch("/progress/month");

    if (!data) return;

    document.getElementById("progress-bar").style.width = data.percent + "%";
    document.getElementById("progress-text").textContent = data.percent + "% hoàn thành";
    document.getElementById("progress-days").textContent =
        `Hoàn thành ${data.completed_days}/${data.total_days} ngày`;
}

// ======================= HABITS PAGE =====================
async function initHabitsPage() {
    guardAuth();
    bindLogout();

    const list = document.getElementById("habit-list");
    const form = document.getElementById("habit-form");
    const msg = document.getElementById("habit-message");

    async function load() {
        const habits = await apiFetch("/habits/");
        list.innerHTML = "";

        habits.forEach(h => {
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

    form.addEventListener("submit", async e => {
        e.preventDefault();

        msg.textContent = "";
        msg.className = "message";

        try {
            await apiFetch("/habits/", {
                method: "POST",
                body: JSON.stringify({
                    name: form.name.value,
                    description: form.description.value
                })
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

    list.addEventListener("click", async e => {
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
                    date: new Date().toISOString().slice(0, 10)
                })
            });

            alert("Đã đánh dấu hoàn thành!");
        }
    });

    load();
}