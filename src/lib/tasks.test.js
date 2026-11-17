import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bucket, icsDate, mergeCalendar, parseIcs, readTasks, sortTasks, taskMessage, tasksFromTextPrompt, whatsappShare } from './tasks.js';

test('tasks fall into overdue, today, tomorrow, later, someday and done', () => {
  const today = '2026-11-17';
  assert.equal(bucket({ due: '2026-11-16' }, today), 'overdue');
  assert.equal(bucket({ due: today }, today), 'today');
  assert.equal(bucket({ due: '2026-11-18' }, today), 'tomorrow');
  assert.equal(bucket({ due: '2026-12-01' }, today), 'later');
  assert.equal(bucket({}, today), 'someday');
  assert.equal(bucket({ due: '2026-11-16', done: true }, today), 'done');
  assert.equal(bucket({ due: '2026-12-31' }, '2026-12-30'), 'tomorrow');
});

test('sorting puts sooner, earlier and higher priority first', () => {
  const list = sortTasks([
    { title: 'c', due: '2026-11-18' },
    { title: 'b', due: '2026-11-17', time: '18:00' },
    { title: 'a', due: '2026-11-17', time: '09:00' },
    { title: 'z' },
    { title: 'h', due: '2026-11-18', priority: 'high' },
  ]);
  assert.deepEqual(list.map((t) => t.title), ['a', 'b', 'h', 'c', 'z']);
});

test('AI answers are cleaned into tasks', () => {
  const out = readTasks({ tasks: [
    { title: ' Call the bank ', due: '2026-11-18', time: '9:00', priority: 'urgent', category: 'work', steps: ['find card', ''] },
    { title: '' },
    { title: 'Buy bread', due: 'tomorrow' },
  ] });
  assert.equal(out.length, 2);
  assert.deepEqual(out[0], { title: 'Call the bank', notes: '', due: '2026-11-18', time: '', priority: 'normal', category: 'work', steps: ['find card'] });
  assert.equal(out[1].due, '');
  assert.equal(readTasks({ title: 'One' }).length, 1);
  assert.equal(readTasks(null).length, 0);
  assert.match(tasksFromTextPrompt('x', '2026-11-17', 'ar').prompt, /Tuesday 2026-11-17[\s\S]*Arabic/);
});

const ICS = [
  'BEGIN:VCALENDAR',
  'BEGIN:VEVENT', 'UID:a1', 'DTSTART:20261118T070000Z', 'SUMMARY:Meeting with\\, Ahmed', 'LOCATION:Office', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:a2', 'DTSTART;VALUE=DATE:20261120', 'SUMMARY:Family visit', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:a3', 'DTSTART;TZID=Africa/Cairo:20261116T200000', 'RRULE:FREQ=WEEKLY;BYDAY=MO,WE', 'SUMMARY:English class', 'EXDATE;TZID=Africa/Cairo:20261118T200000', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:a4', 'DTSTART:20261119T100000', 'SUMMARY:Cancelled', 'STATUS:CANCELLED', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:a5', 'DTSTART:20250101T100000', 'SUMMARY:Old', 'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

test('calendar files become dated tasks, with repeats, exceptions and cancellations', () => {
  const from = new Date(2026, 10, 17);
  const to = new Date(2026, 10, 27);
  const events = parseIcs(ICS, { from, to });
  const titles = events.map((e) => `${e.title}@${e.due}${e.time ? ` ${e.time}` : ''}`);
  assert.ok(titles.includes('Family visit@2026-11-20'));
  assert.ok(titles.some((t) => t.startsWith('Meeting with, Ahmed@2026-11-18')));
  assert.ok(titles.includes('English class@2026-11-23 20:00'));
  assert.ok(titles.includes('English class@2026-11-25 20:00'));
  assert.ok(!titles.includes('English class@2026-11-18 20:00'), 'EXDATE skipped');
  assert.ok(!titles.some((t) => t.startsWith('Cancelled') || t.startsWith('Old')));
  assert.equal(events.find((e) => e.title.startsWith('Meeting')).notes, 'Office');
  assert.equal(icsDate('20261120', 'VALUE=DATE').allDay, true);

  const first = mergeCalendar([], events, (e) => ({ ...e, id: e.calendarId }));
  const again = mergeCalendar(first.tasks, events, (e) => ({ ...e, id: e.calendarId }));
  assert.equal(again.added, 0);
  assert.equal(again.tasks.length, events.length);
});

test('WhatsApp messages and links', () => {
  const L = (en) => en;
  const date = () => 'Wednesday 18 November';
  const text = taskMessage({ title: 'Call the bank', due: '2026-11-18', time: '09:00', steps: ['a', 'b'], stepsDone: [true] }, { L, date });
  assert.match(text, /📌 Call the bank\n🗓️ Wednesday 18 November 09:00\n✅ a\n▫️ b/);
  assert.equal(whatsappShare('hi there', '+249 91'), 'https://wa.me/24991?text=hi%20there');
  assert.equal(whatsappShare('x'), 'https://wa.me/?text=x');
});
