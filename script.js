
const $ = id => document.getElementById(id);

let employees = JSON.parse(localStorage.getItem("payEmployees") || "[]");
let attendance = JSON.parse(localStorage.getItem("payAttendance") || "[]");
let payslips = JSON.parse(localStorage.getItem("paySlips") || "[]");

let currentSlip = null;
let loggedInEmployee = null;

// Save data
function saveData() {
    localStorage.setItem("payEmployees", JSON.stringify(employees));
    localStorage.setItem("payAttendance", JSON.stringify(attendance));
    localStorage.setItem("paySlips", JSON.stringify(payslips));
}

// Format currency
function money(amount) {
    return Number(amount).toLocaleString("en-IN", {
        style: "currency",
        currency: "INR"
    });
}

// Safe HTML output
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[ch]);
}

function emptyRow(cols, message = "No records found") {
    return `<tr><td colspan="${cols}" class="empty">${escapeHTML(message)}</td></tr>`;
}

// ================= LOGIN =================

$("loginForm").addEventListener("submit", function(e) {
    e.preventDefault();

    const role = $("loginRole").value;
    const username = $("loginUser").value.trim();
    const password = $("loginPass").value;

    $("loginError").textContent = "";

    // Demo Admin Login
    if (role === "admin") {
        if (username === "admin" && password === "admin123") {
            $("loginPage").hidden = true;
            $("adminPortal").hidden = false;
            $("userPortal").hidden = true;

            renderAll();
        } else {
            $("loginError").textContent = "Invalid Admin Login!";
        }
        return;
    }

    // Demo Employee Login
    const emp = employees.find(e =>
        e.id.toLowerCase() === username.toLowerCase()
    );

    if (!emp || password !== "demo123") {
        $("loginError").textContent =
            "Invalid Employee ID or Password!";
        return;
    }

    loggedInEmployee = emp;

    $("loginPage").hidden = true;
    $("adminPortal").hidden = true;
    $("userPortal").hidden = false;

    renderUserPortal();
});

// Logout
function logout() {
    loggedInEmployee = null;
    currentSlip = null;

    $("loginUser").value = "";
    $("loginPass").value = "";

    $("adminPortal").hidden = true;
    $("userPortal").hidden = true;
    $("loginPage").hidden = false;

    $("loginError").textContent = "";
}

$("adminLogout").addEventListener("click", logout);
$("userLogout").addEventListener("click", logout);

// ================= ADMIN NAVIGATION =================

function showPage(pageId) {
    document.querySelectorAll("#adminPortal .page")
        .forEach(p => p.classList.remove("active-page"));

    document.querySelectorAll("#adminPortal .nav")
        .forEach(b => {
            b.classList.toggle("active", b.dataset.page === pageId);
        });

    $(pageId).classList.add("active-page");

    const titles = {
        dashboard: "Dashboard",
        register: "Employee Registration",
        attendance: "Attendance",
        payroll: "Salary Calculation",
        payslips: "Payslips",
        employees: "Employee Search"
    };

    $("pageTitle").textContent = titles[pageId];
}

document.querySelectorAll(".nav").forEach(btn => {
    btn.addEventListener("click", () => showPage(btn.dataset.page));
});

document.querySelectorAll("[data-goto]").forEach(btn => {
    btn.addEventListener("click", () => showPage(btn.dataset.goto));
});

// Employee dropdowns
function updateEmployeeOptions() {
    ["attEmployee", "payEmployee"].forEach(id => {
        const select = $(id);
        const oldValue = select.value;

        select.innerHTML =
            '<option value="">Select employee</option>' +
            employees.map(emp => `
                <option value="${escapeHTML(emp.id)}">
                    ${escapeHTML(emp.id)} - ${escapeHTML(emp.name)}
                </option>
            `).join("");

        if (employees.some(emp => emp.id === oldValue)) {
            select.value = oldValue;
        }
    });
}

// ================= EMPLOYEE REGISTRATION =================

$("employeeForm").addEventListener("submit", function(e) {
    e.preventDefault();

    const id = $("empId").value.trim();
    const email = $("empEmail").value.trim();
    const salary = Number($("empSalary").value);

    if (employees.some(emp =>
        emp.id.toLowerCase() === id.toLowerCase()
    )) {
        alert("Employee ID already exists!");
        return;
    }

    if (employees.some(emp =>
        emp.email.toLowerCase() === email.toLowerCase()
    )) {
        alert("Email already registered!");
        return;
    }

    if (!Number.isFinite(salary) || salary < 0) {
        alert("Enter a valid salary!");
        return;
    }

    const employee = {
        id,
        name: $("empName").value.trim(),
        email,
        phone: $("empPhone").value.trim(),
        dept: $("empDept").value,
        role: $("empRole").value.trim(),
        salary,
        join: $("empJoin").value
    };

    employees.push(employee);

    saveData();
    updateEmployeeOptions();
    renderAll();

    e.target.reset();

    alert(
        "Employee registered successfully!\n" +
        "Demo Employee Password: demo123"
    );

    showPage("employees");
});

// ================= ATTENDANCE =================

$("attendanceForm").addEventListener("submit", function(e) {
    e.preventDefault();

    const id = $("attEmployee").value;
    const month = $("attMonth").value;
    const working = Number($("workingDays").value);
    const present = Number($("daysPresent").value);
    const paidLeave = Number($("paidLeave").value);

    if (!employees.some(emp => emp.id === id)) {
        alert("Please select an employee!");
        return;
    }

    if (
        !month ||
        !Number.isInteger(working) || working < 1 || working > 31 ||
        !Number.isInteger(present) || present < 0 ||
        !Number.isInteger(paidLeave) || paidLeave < 0 ||
        present + paidLeave > working
    ) {
        alert("Please enter valid attendance details!");
        return;
    }

    const index = attendance.findIndex(a =>
        a.id === id && a.month === month
    );

    const record = {
        id,
        month,
        working,
        present,
        paidLeave
    };

    if (index >= 0) {
        if (!confirm("Attendance exists. Update record?")) return;
        attendance[index] = record;
    } else {
        attendance.push(record);
    }

    saveData();
    renderAll();

    alert("Attendance saved successfully!");
});

// ================= SALARY CALCULATION =================

$("payrollForm").addEventListener("submit", function(e) {
    e.preventDefault();

    const id = $("payEmployee").value;
    const month = $("payMonth").value;
    const allowance = Number($("allowance").value);
    const deduction = Number($("deduction").value);

    const emp = employees.find(x => x.id === id);

    const att = attendance.find(a =>
        a.id === id && a.month === month
    );

    if (!emp || !att) {
        alert("Please register employee and save attendance for this month!");
        return;
    }

    if (
        !month ||
        !Number.isFinite(allowance) || allowance < 0 ||
        !Number.isFinite(deduction) || deduction < 0
    ) {
        alert("Enter valid allowance and deductions!");
        return;
    }

    const alreadyExists = payslips.some(s =>
        s.id === id && s.month === month
    );

    if (alreadyExists &&
        !confirm("Payslip already exists. Regenerate?")) {
        return;
    }

    // Demo formula
    const eligibleDays = att.present + att.paidLeave;

    const payableBasic = Math.round(
        emp.salary * eligibleDays / att.working * 100
    ) / 100;

    const gross = payableBasic + allowance;
    const totalDeductions = deduction;
    const net = gross - totalDeductions;

    if (net < 0) {
        alert("Deductions cannot exceed gross salary!");
        return;
    }

    const slip = {
        id: emp.id,
        name: emp.name,
        dept: emp.dept,
        role: emp.role,
        month,
        basic: emp.salary,
        working: att.working,
        present: att.present,
        paidLeave: att.paidLeave,
        payableBasic,
        allowance,
        gross,
        deductions: totalDeductions,
        net,
        generatedAt: new Date().toLocaleDateString("en-IN")
    };

    const index = payslips.findIndex(s =>
        s.id === id && s.month === month
    );

    if (index >= 0) {
        payslips[index] = slip;
    } else {
        payslips.push(slip);
    }

    currentSlip = slip;

    saveData();
    renderAll();
    renderSalary(slip);

    alert("Payslip generated successfully!");
});

// Display generated payslip
function renderSalary(s) {
    $("salaryResult").hidden = false;

    $("salaryDetails").innerHTML = `
        <div class="salary-card">
            <h3>PAYTRACK - PAYSLIP</h3>

            <p>Salary Month: ${escapeHTML(s.month)}</p>

            <hr style="margin:15px 0">

            <p><b>Employee:</b> ${escapeHTML(s.name)}</p>
            <p><b>Employee ID:</b> ${escapeHTML(s.id)}</p>
            <p><b>Department:</b> ${escapeHTML(s.dept)}</p>
            <p><b>Designation:</b> ${escapeHTML(s.role)}</p>

            <hr style="margin:15px 0">

            <div class="salary-row">
                <span>Basic Monthly Salary</span>
                <span>${money(s.basic)}</span>
            </div>

            <div class="salary-row">
                <span>Working Days</span>
                <span>${s.working}</span>
            </div>

            <div class="salary-row">
                <span>Present Days</span>
                <span>${s.present}</span>
            </div>

            <div class="salary-row">
                <span>Paid Leave Days</span>
                <span>${s.paidLeave}</span>
            </div>

            <div class="salary-row">
                <span>Payable Basic</span>
                <span>${money(s.payableBasic)}</span>
            </div>

            <div class="salary-row">
                <span>Allowance</span>
                <span>${money(s.allowance)}</span>
            </div>

            <div class="salary-row">
                <span>Gross Salary</span>
                <span>${money(s.gross)}</span>
            </div>

            <div class="salary-row">
                <span>Deductions</span>
                <span>${money(s.deductions)}</span>
            </div>

            <div class="salary-row net-row">
                <span>Net Salary</span>
                <span>${money(s.net)}</span>
            </div>

            <p style="margin-top:18px;font-size:12px">
                Generated on: ${escapeHTML(s.generatedAt)}
            </p>

            <p style="margin-top:8px;font-size:12px">
                Demo payslip - academic project.
            </p>
        </div>
    `;

    currentSlip = s;
}

$("printSalary").addEventListener("click", function() {
    if (currentSlip) {
        window.print();
    }
});

// ================= EMPLOYEE SEARCH =================

$("employeeSearch").addEventListener("input", renderEmployees);

function renderEmployees() {
    const q = $("employeeSearch").value.toLowerCase().trim();

    const filtered = employees.filter(emp =>
        [emp.id, emp.name, emp.dept, emp.role, emp.email]
            .some(value => String(value).toLowerCase().includes(q))
    );

    $("employeeTable").innerHTML = filtered.length
        ? filtered.map(emp => `
            <tr>
                <td>${escapeHTML(emp.id)}</td>
                <td>${escapeHTML(emp.name)}</td>
                <td>${escapeHTML(emp.dept)}</td>
                <td>${escapeHTML(emp.role)}</td>
                <td>${escapeHTML(emp.email)}</td>
                <td>
                    <button class="danger-btn"
                        data-delete="${escapeHTML(emp.id)}">
                        Delete
                    </button>
                </td>
            </tr>
        `).join("")
        : emptyRow(6);
}

// Delete employee
$("employeeTable").addEventListener("click", function(e) {
    const btn = e.target.closest("[data-delete]");
    if (!btn) return;

    const id = btn.dataset.delete;

    if (!confirm("Delete employee and related records?")) return;

    employees = employees.filter(emp => emp.id !== id);
    attendance = attendance.filter(a => a.id !== id);
    payslips = payslips.filter(s => s.id !== id);

    if (currentSlip?.id === id) {
        currentSlip = null;
        $("salaryResult").hidden = true;
    }

    saveData();
    updateEmployeeOptions();
    renderAll();
});

// ================= ATTENDANCE TABLE =================

function renderAttendance() {
    $("attendanceTable").innerHTML = attendance.length
        ? [...attendance].reverse().map(a => {
            const emp = employees.find(e => e.id === a.id);

            return `
                <tr>
                    <td>${escapeHTML(emp?.name || a.id)}</td>
                    <td>${escapeHTML(a.month)}</td>
                    <td>${a.working}</td>
                    <td>${a.present}</td>
                    <td>${a.paidLeave}</td>
                </tr>
            `;
        }).join("")
        : emptyRow(5);
}

// ================= PAYSLIP HISTORY =================

$("slipSearch").addEventListener("input", renderPayslips);

function renderPayslips() {
    const q = $("slipSearch").value.toLowerCase().trim();

    const filtered = payslips.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
    );

    $("payslipTable").innerHTML = filtered.length
        ? [...filtered].reverse().map(s => `
            <tr>
                <td>${escapeHTML(s.name)} (${escapeHTML(s.id)})</td>
                <td>${escapeHTML(s.month)}</td>
                <td>${money(s.gross)}</td>
                <td>${money(s.deductions)}</td>
                <td><b>${money(s.net)}</b></td>
                <td>
                    <button class="action-btn"
                        data-slip-id="${escapeHTML(s.id)}"
                        data-slip-month="${escapeHTML(s.month)}">
                        View
                    </button>
                </td>
            </tr>
        `).join("")
        : emptyRow(6);
}

$("payslipTable").addEventListener("click", function(e) {
    const btn = e.target.closest("[data-slip-id]");
    if (!btn) return;

    const slip = payslips.find(s =>
        s.id === btn.dataset.slipId &&
        s.month === btn.dataset.slipMonth
    );

    if (slip) {
        showPage("payroll");
        renderSalary(slip);
    }
});

// ================= DASHBOARD =================

function renderDashboard() {
    $("totalEmployees").textContent = employees.length;
    $("totalAttendance").textContent = attendance.length;
    $("totalPayslips").textContent = payslips.length;

    const recent = [...employees].reverse().slice(0, 5);

    $("recentEmployees").innerHTML = recent.length
        ? recent.map(emp => `
            <tr>
                <td>${escapeHTML(emp.id)}</td>
                <td>${escapeHTML(emp.name)}</td>
                <td>${escapeHTML(emp.dept)}</td>
                <td>${escapeHTML(emp.role)}</td>
            </tr>
        `).join("")
        : emptyRow(4, "No employees registered yet");
}

function renderAll() {
    updateEmployeeOptions();
    renderDashboard();
    renderEmployees();
    renderAttendance();
    renderPayslips();
}

// ================= EMPLOYEE PORTAL =================

function renderUserPortal() {
    // Find the employee account
    const emp = employees.find(e =>
        e.id === loggedInEmployee?.id
    );

    if (!emp) {
        logout();
        return;
    }

    loggedInEmployee = emp;

    const fields = [
        ["Employee ID", emp.id],
        ["Full Name", emp.name],
        ["Email", emp.email],
        ["Phone", emp.phone],
        ["Department", emp.dept],
        ["Designation", emp.role],
        ["Joining Date", emp.join]
    ];

    $("myProfile").innerHTML = fields.map(([label, value]) => `
        <div class="profile-item">
            <span>${escapeHTML(label)}</span>
            <b>${escapeHTML(value)}</b>
        </div>
    `).join("");

    // Only own attendance
    const myAttendance = attendance.filter(a =>
        a.id === emp.id
    );

    $("myAttendance").innerHTML = myAttendance.length
        ? myAttendance.map(a => `
            <tr>
                <td>${escapeHTML(a.month)}</td>
                <td>${a.working}</td>
                <td>${a.present}</td>
                <td>${a.paidLeave}</td>
            </tr>
        `).join("")
        : emptyRow(4, "No attendance records yet");

    // Only own payslips
    const mySlips = payslips.filter(s =>
        s.id === emp.id
    );

    $("myPayslips").innerHTML = mySlips.length
        ? mySlips.map(s => `
            <tr>
                <td>${escapeHTML(s.month)}</td>
                <td>${money(s.gross)}</td>
                <td>${money(s.deductions)}</td>
                <td><b>${money(s.net)}</b></td>
                <td>
                    <button class="action-btn"
                        data-user-slip="${escapeHTML(s.month)}">
                        View / Print
                    </button>
                </td>
            </tr>
        `).join("")
        : emptyRow(5, "No payslips available");
}

// Employee payslip view
$("myPayslips").addEventListener("click", function(e) {
    const btn = e.target.closest("[data-user-slip]");

    if (!btn || !loggedInEmployee) return;

    const slip = payslips.find(s =>
        s.id === loggedInEmployee.id &&
        s.month === btn.dataset.userSlip
    );

    if (!slip) return;

    const win = window.open("", "_blank");

    if (!win) {
        alert("Please allow popups to view payslip.");
        return;
    }

    const rows = [
        ["Employee", slip.name],
        ["Employee ID", slip.id],
        ["Department", slip.dept],
        ["Month", slip.month],
        ["Payable Basic", money(slip.payableBasic)],
        ["Allowance", money(slip.allowance)],
        ["Gross Salary", money(slip.gross)],
        ["Deductions", money(slip.deductions)],
        ["Net Salary", money(slip.net)]
    ];

    win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>My Payslip</title>
            <style>
                body {
                    font-family: Arial;
                    padding: 28px;
                    max-width: 750px;
                    margin: auto;
                }
                h2 { color: #168563; }
                .line {
                    padding: 11px;
                    border-bottom: 1px solid #ddd;
                }
                button {
                    padding: 10px 16px;
                    margin-top: 18px;
                    cursor: pointer;
                }
                @media print {
                    button { display: none; }
                }
            </style>
        </head>
        <body>
            <h2>PayTrack - Payslip</h2>
            ${rows.map(([k, v]) => `
                <div class="line">
                    <b>${escapeHTML(k)}:</b> ${escapeHTML(v)}
                </div>
            `).join("")}
            <button onclick="window.print()">Print / Save PDF</button>
        </body>
        </html>
    `);

    win.document.close();
});

// Initial setup
updateEmployeeOptions();
renderAll();
