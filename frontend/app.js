const API_URL = "http://localhost:8000";  // HOẶC URL Render sau này

// -------- LOGIN ----------
async function login() {
    let email = document.getElementById("login-email").value;
    let password = document.getElementById("login-password").value;

    let res = await fetch(API_URL + "/auth/login", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ email, password })
    });

    let data = await res.json();

    if (!data.access_token) {
        alert("Sai email hoặc mật khẩu!");
        return;
    }

    localStorage.setItem("token", data.access_token);
    window.location.href = "dashboard.html";
}

// -------- REGISTER ----------
async function register() {
    let email = document.getElementById("reg-email").value;
    let full_name = document.getElementById("reg-name").value;
    let password = document.getElementById("reg-password").value;

    await fetch(API_URL + "/auth/register", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ email, full_name, password })
    });

    alert("Đăng ký thành công! Hãy đăng nhập.");
}

// -------- DASHBOARD ----------
async function loadDashboard() {
    let token = localStorage.getItem("token");

    let res = await fetch(API_URL + "/dashboard/streak", {
        headers: { "Authorization": "Bearer " + token }
    });

    let data = await res.json();
    document.getElementById("streak").innerText = data.streak;

    let res2 = await fetch(API_URL + "/habits/", {
        headers: { "Authorization": "Bearer " + token }
    });

    let habits = await res2.json();
    document.getElementById("total-habits").innerText = habits.length;
}

// -------- HABITS ----------
async function loadHabits() {
    let token = localStorage.getItem("token");

    let res = await fetch(API_URL + "/habits/", {
        headers: { "Authorization": "Bearer " + token }
    });

    let habits = await res.json();

    let list = document.getElementById("habit-list");
    list.innerHTML = "";

    habits.forEach(h => {
        list.innerHTML += `
            <li>
                ${h.name}
                <button onclick="markDone(${h.id})">✓</button>
            </li>
        `;
    });
}

async function createHabit() {
    let name = document.getElementById("new-habit-name").value;
    let token = localStorage.getItem("token");

    await fetch(API_URL + "/habits/", {
        method: "POST",
        headers: {
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ name })
    });

    loadHabits();
}

async function markDone(habitId) {
    let token = localStorage.getItem("token");

    await fetch(API_URL + "/logs/", {
        method: "POST",
        headers: {
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ habit_id: habitId })
    });

    alert("Đã đánh dấu hoàn thành!");
}
