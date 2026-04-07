# Dream-T Management System — User Manual

**Version:** 2026  
**System:** Dream-T DMS (dream-t.vercel.app)

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Dashboards](#2-dashboards)
3. [Guests](#3-guests)
4. [Occupancy](#4-occupancy)
5. [Expenses](#5-expenses)
6. [Revenue](#6-revenue)
7. [Founding Contributions](#7-founding-contributions)
8. [Shareholder Work](#8-shareholder-work)
9. [Tasks](#9-tasks)
10. [Budget](#10-budget)
11. [Shareholder Profiles](#11-shareholder-profiles)
12. [Shareholder Meetings](#12-shareholder-meetings)
13. [Staff Hours](#13-staff-hours)
14. [Legal Review](#14-legal-review)
15. [Currency Toggle](#15-currency-toggle)
16. [Change Password](#16-change-password)
17. [User Management](#17-user-management-admin-only)

---

## 1. Getting Started

### How to Log In

1. Open the system in your browser.
2. Enter your **username** and **password**.
3. Click **Sign In**.

### User Accounts

| Role | Username | Password | What They Can See |
|------|----------|----------|-------------------|
| Admin | admin | Admin123 | Everything |
| Shareholder | shareholder | Shareholder123 | Financial dashboards, budgets, meetings |
| General Manager | gm | GM123 | Operations, guests, staff, tasks |
| Lawyer | lawyer | Lawyer123 | Legal review page |
| Accountant | accountant | Accountant123 | Expenses, revenue, budget |
| Staff | staff | Staff123 | Guests, tasks |

### How to Log Out

Click the **arrow icon** at the bottom of the left sidebar.

---

## 2. Dashboards

There are 3 dashboards, each showing a different view of the business.

### Overview Dashboard (`/`)
- Shows total income, total expenses, net profit, and bank balance.
- Displays monthly charts for revenue and expenses.
- Quick summary of the most important financial numbers.

### Shareholder Dashboard (`/shareholder-dashboard`)
- Shows profit/loss split per shareholder.
- Tracks founding contributions and return on investment.
- Ideal for shareholder review meetings.

### GM Dashboard (`/operations-dashboard`)
- Shows current occupancy, room status, and upcoming check-ins/check-outs.
- Displays tasks and pending items for the General Manager.
- Focused on day-to-day operations.

---

## 3. Guests

**Path:** Guests in the sidebar

### What it does
Tracks all guest bookings — who stayed, which room, how long, and how much they paid.

### How to add a guest
1. Click **+ Add Guest**.
2. Fill in: guest name, room number, check-in date, check-out date, daily rate.
3. The system automatically calculates the total stay amount.
4. Select the payment status (Paid / Unpaid / Partial).
5. Click **Save**.

### Other features
- **Search/filter** guests by name, room, or date.
- **Edit** any booking by clicking the pencil icon.
- **Delete** a booking with the trash icon.
- **Export to CSV** for use in Excel.
- Mark **TM30** (immigration notification) as done with a checkbox.

---

## 4. Occupancy

**Path:** Occupancy in the sidebar

### What it does
Shows a **calendar view** of which rooms are booked on which dates. Useful for seeing gaps and overlaps at a glance.

- Each room has its own row.
- Booked dates are highlighted.
- Click on a booking to see guest details.

---

## 5. Expenses

**Path:** Expenses in the sidebar

### What it does
Records all money going out of the business — bills, salaries, maintenance, etc.

### How to add an expense
1. Click **+ Add Expense**.
2. Fill in: supplier name, category, amount, currency, payment date.
3. Optionally add: invoice number, description, who paid, payment method.
4. Click **Save**.

### Invoice OCR (Auto-fill from photo)
You can **photograph an invoice** and let the AI fill in the form automatically:
1. Click the **camera/upload icon** at the top of the Add Expense form.
2. Select a photo of the invoice (JPG, PNG, or PDF screenshot).
3. The AI will read the invoice and fill in the fields automatically.
4. Fields filled by AI are highlighted in **purple** — review them before saving.
5. Correct anything that looks wrong, then save.

### Legal Expenses
- Tick **"Mark as Legal"** for any expense that needs lawyer review.
- These will appear on the Legal Review page.

### Other features
- Filter by category, date range, currency.
- Export to CSV.

---

## 6. Revenue

**Path:** Revenue in the sidebar

### What it does
Records all money coming in — rental income, other income sources.

### How to add revenue
1. Click **+ Add Revenue**.
2. Fill in: date, type, amount (THB), and any notes.
3. Click **Save**.

---

## 7. Founding Contributions

**Path:** Founding in the sidebar

### What it does
Tracks the initial money each shareholder put into the company to fund operations.

### How to add a contribution
1. Click **+ Add Contribution**.
2. Select the shareholder name.
3. Enter the amount (THB and/or EUR), payment method, and date.
4. Click **Save**.

---

## 8. Shareholder Work

**Path:** Shareholder Work in the sidebar

### What it does
Tracks hours worked by shareholders, at an agreed hourly rate (default: 200 THB/hour).

### How to add work hours
1. Click **+ Add Entry**.
2. Select the shareholder and month.
3. Enter hours worked.
4. Click **Save**.

The system will calculate the total pay automatically.

---

## 9. Tasks

**Path:** Tasks in the sidebar

### What it does
A to-do list for tracking action items across the business.

### How to add a task
1. Click **+ Add Task**.
2. Enter the task topic, who is responsible, target date, and department.
3. Set the status (Pending / In Progress / Done).
4. Click **Save**.

### Updating a task
- Click the task to open it.
- Change the status or add notes.
- Click **Save**.

---

## 10. Budget

**Path:** Budget in the sidebar

The Budget module has 3 sections, accessed by tabs at the top.

### Tab 1: Setup
Define your room assumptions for budgeting purposes:
- For each room, set the **high season rate** and **low season rate** per night (in THB).
- Set the **target occupancy %** for each season.
- This is used to calculate your projected revenue.

### Tab 2: Input
Enter your detailed budget numbers:
- **Revenue Matrix** — Month-by-month budgeted income per room.
- **Expense Items** — Planned expenses by category and month.
- **Rent Schedule** — Annual rent and VAT amounts per year.

### Tab 3: Control (Default view)
Compare your **budget vs actual** performance:
- 6 summary cards showing total budget income, actual income, variance, etc.
- A month-by-month table showing whether you are over or under budget.
- **Green** = on track or better than budget.
- **Red** = over budget or below target.

---

## 11. Shareholder Profiles

**Path:** SH Profiles in the sidebar

### What it does
Stores a profile card for each shareholder with their photo, contact details, and ownership share.

### How to add or edit a profile
1. Click **+ Add Profile** or the edit icon on an existing card.
2. Enter: full name, email, phone, nationality, share percentage, bio.
3. Upload a **profile photo** (from your computer or via URL).
4. Click **Save**.

---

## 12. Shareholder Meetings

**Path:** SH Meetings in the sidebar

### What it does
Records all shareholder meetings — agenda, decisions made, who attended, and any documents.

### How to add a meeting
1. Click **+ Add Meeting**.
2. Enter: meeting title, date, location, agenda.
3. Tick which shareholders attended.
4. Add meeting notes and decisions made.
5. Upload any attached documents (PDFs, images).
6. Click **Save**.

### Viewing meetings
- Meetings are listed from most recent to oldest.
- Click on a meeting to expand it and see full details and attachments.

---

## 13. Staff Hours

**Path:** Staff Hours in the sidebar

### What it does
Tracks hours worked by all staff members (not shareholders), by day and department.

### How to add staff hours
1. Click **+ Add Entry**.
2. Enter: staff name, department, date, hours worked, and hourly rate.
3. The pay for that entry is calculated automatically.
4. Click **Save**.

### Filtering and summary
- Filter by staff name or month using the dropdowns at the top.
- Summary cards at the top show total hours and total pay for the selected period.

---

## 14. Legal Review

**Path:** Legal in the sidebar

### What it does
Shows all expenses that have been marked as legal expenses, organised by review status. This page is designed for the **lawyer** to review and approve expenses.

### Review statuses
| Status | Meaning |
|--------|---------|
| **Pending** | Not yet reviewed |
| **Accepted** | Approved by lawyer |
| **Clarification Needed** | Lawyer has questions |
| **Rejected** | Not accepted |

### How to review an expense
1. Find the expense in the list.
2. Click one of the 3 action icons:
   - ✓ Green tick = Accept
   - ? Yellow question mark = Request clarification
   - ✗ Red cross = Reject
3. A popup appears. Add any notes and confirm the review date.
4. Click **Confirm**.

### Export and Print
- **Export CSV** — Downloads a spreadsheet of all legal expenses with their statuses.
- **Print** — Prints a clean version of the page (no buttons, printer-friendly layout).

---

## 15. Currency Toggle

The system can display all money amounts in **Thai Baht (฿ THB)** or **Euros (€ EUR)**.

### How to switch currencies
- Click the **฿ THB / € EUR** toggle at the bottom of the sidebar.
- All amounts on the page will convert automatically.

### Live Exchange Rate
- The current rate is shown below the toggle (e.g., `1 EUR = 38.12 THB`).
- A **green dot** next to the rate means it is a live rate from the European Central Bank.
- Click the **refresh icon** (circular arrow) to fetch the latest rate manually.
- The date and time of the last rate check is shown next to the refresh button.

---

## 16. Change Password

**Path:** Change Password in the sidebar (visible to all users)

Any logged-in user can change their own password at any time.

### How to change your password
1. Click **Change Password** in the sidebar.
2. Enter your **current password**.
3. Enter your **new password** (minimum 8 characters).
4. Re-enter the new password to confirm.
5. Click **Update Password**.

A strength indicator shows how secure your new password is (Weak / Good / Strong).

---

## 17. User Management *(Admin only)*

**Path:** User Management in the sidebar (only visible to Admin)

The Admin can add new users, reset any user's password, and delete users.

### How to add a new user
1. Click **+ Add User**.
2. Fill in: Display Name, Username, Role, Password.
3. Confirm the password and click **Create User**.

### How to reset another user's password
1. Find the user in the list.
2. Click the **key icon** on the right.
3. Enter and confirm the new password.
4. Click **Reset Password**.

### How to delete a user
1. Click the **trash icon** next to the user.
2. Confirm the deletion.

> Note: You cannot delete your own admin account.

---

## Tips & Reminders

- **Always save your work** — the system does not auto-save forms.
- **OCR is not perfect** — always review AI-filled fields before saving an expense.
- **Currency conversion is approximate** — always use THB as the primary currency for official records.
- **Legal expenses** — mark them when adding so the lawyer can review them in time.
- **Budget vs Actual** — check the Control tab monthly to stay on track.

---

*Dream-T Management System — Built for Dream-T Co., Ltd. © 2026*
