
const { Reminder } = require('./models');

async function loadReminders() {
    return Reminder.find();
}

async function addReminder(reminder) {
    await Reminder.create(reminder);
}

async function removeReminder(id) {
    await Reminder.deleteOne({ $or: [{ id }, { reminder_id: id }] });
}

async function updateReminder(reminder) {
    await Reminder.updateOne(
        { $or: [{ id: reminder.id }, { reminder_id: reminder.id }] },
        { $set: reminder }
    );
}

async function getUserReminders(userId) {
    return Reminder.find({ userId });
}

async function getDueReminders() {
    const now = Date.now();
    return Reminder.find({
        $or: [
            { time: { $lte: now } },
            { time_to_send: { $exists: true, $lte: new Date(now).toISOString() } }
        ]
    });
}

async function getReminderById(id) {
    return Reminder.findOne({ $or: [{ id }, { reminder_id: id }] });
}

module.exports = {
    loadReminders,
    addReminder,
    removeReminder,
    getUserReminders,
    getDueReminders,
    updateReminder,
    getReminderById
};
