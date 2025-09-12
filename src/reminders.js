const fs = require('fs');
const path = require('path');

const REMINDERS_FILE = path.join(__dirname, '../reminders.json');

function loadReminders() {
    if (!fs.existsSync(REMINDERS_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(REMINDERS_FILE, 'utf8'));
    } catch {
        return [];
    }
}

function saveReminders(reminders) {
    fs.writeFileSync(REMINDERS_FILE, JSON.stringify(reminders, null, 2));
}

function addReminder(reminder) {
    const reminders = loadReminders();
    reminders.push(reminder);
    saveReminders(reminders);
}

function removeReminder(id) {
    let reminders = loadReminders();
    reminders = reminders.filter(r => r.id !== id);
    saveReminders(reminders);
}

function updateReminder(reminder) {
    let reminders = loadReminders();
    const idx = reminders.findIndex(r => r.id === reminder.id);
    if (idx !== -1) {
        reminders[idx] = reminder;
        saveReminders(reminders);
    }
}

function getUserReminders(userId) {
    return loadReminders().filter(r => r.userId === userId);
}

function getDueReminders() {
    const now = Date.now();
    return loadReminders().filter(r => r.time <= now);
}

function getReminderById(id) {
    return loadReminders().find(r => r.id == id);
}

module.exports = {
    loadReminders,
    saveReminders,
    addReminder,
    removeReminder,
    getUserReminders,
    getDueReminders,
    updateReminder,
    getReminderById
};
