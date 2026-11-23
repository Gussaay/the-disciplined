import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, SKILLS, dayPlan } from './english.js';
import { LESSONS } from '../data/lessons.js';

// 2026-03-08 is a Sunday, so 8 + i walks one full week (getDay 0..6).
const week = Array.from({ length: 7 }, (_, i) => new Date(2026, 2, 8 + i));
const bilingual = (o) => typeof o?.en === 'string' && o.en.length > 0 && typeof o?.ar === 'string' && o.ar.length > 0;

test('shadowing and communication are skills with bilingual names and icons', () => {
  for (const id of ['shadowing', 'communication']) {
    assert.ok(SKILLS[id], id);
    assert.ok(bilingual(SKILLS[id].name), id);
    assert.ok(SKILLS[id].icon, id);
  }
});

test('every level has a shadowing and a communication task', () => {
  // Walk the whole week at every level: each day's tasks are worded at
  // that level, and across the week both new skills must show up with
  // real bilingual text (their TASKS entry for the level).
  for (const { id: level } of LEVELS) {
    const seen = new Set();
    for (const date of week) {
      for (const task of dayPlan({ level, minutes: 30 }, date)) {
        seen.add(task.skill);
        assert.ok(bilingual(task.text), `${level} ${task.skill}`);
      }
    }
    assert.ok(seen.has('shadowing'), level);
    assert.ok(seen.has('communication'), level);
  }
});

test('a B2 week includes both new skills, and no task is under 5 minutes', () => {
  for (const minutes of [15, 20, 30, 45]) {
    const counts = {};
    for (const date of week) {
      for (const task of dayPlan({ level: 'B2', minutes }, date)) {
        counts[task.skill] = (counts[task.skill] || 0) + 1;
        assert.ok(task.minutes >= 5, `${task.skill} at ${minutes} min/day`);
      }
    }
    assert.ok(counts.shadowing >= 1, `shadowing at ${minutes}`);
    assert.ok(counts.communication >= 1, `communication at ${minutes}`);
  }
  // Under 15 minutes a day only one skill joins vocabulary (the rule
  // that keeps every task at 5 minutes or more).
  for (const date of week) assert.equal(dayPlan({ level: 'B2', minutes: 10 }, date).length, 2);
});

test('lessons: both new skills have a full B2 lesson', () => {
  assert.ok(LESSONS.length >= 2);
  const bySkill = Object.fromEntries(LESSONS.map((l) => [l.skill, l]));
  for (const skill of ['shadowing', 'communication']) {
    const lesson = bySkill[skill];
    assert.ok(lesson, skill);
    assert.equal(lesson.level, 'B2');
    assert.ok(bilingual(lesson.title), skill);
    assert.ok(bilingual(lesson.intro), skill);
    assert.ok(lesson.minutes >= 15, skill);
    assert.ok(lesson.steps.length >= 4, skill);
    for (const step of lesson.steps) assert.ok(bilingual(step), skill);
    assert.ok(lesson.phrases.length >= 6, skill);
    for (const phrase of lesson.phrases) assert.ok(bilingual(phrase), skill);
    assert.ok(lesson.exercises.length >= 3, skill);
  }
});

test('lessons: every exercise is complete and ids are unique', () => {
  const ids = new Set();
  for (const lesson of LESSONS) {
    for (const ex of lesson.exercises) {
      assert.ok(ex.id && !ids.has(ex.id), ex.id);
      ids.add(ex.id);
      assert.ok(bilingual(ex.title), ex.id);
      assert.ok(bilingual(ex.instructions), ex.id);
      assert.ok(ex.minutes >= 5, ex.id);
      for (const line of ex.lines || []) assert.ok(bilingual(line), ex.id);
      for (const prompt of ex.prompts || []) assert.ok(bilingual(prompt), ex.id);
    }
  }
});

test('shadowing lesson: a news script and a two-speaker dialogue to shadow', () => {
  const lesson = LESSONS.find((l) => l.skill === 'shadowing');
  const news = lesson.exercises.find((e) => e.id === 'shadow-news');
  assert.ok(news.lines.length >= 8, `news lines ${news.lines.length}`);
  const dialogue = lesson.exercises.find((e) => e.id === 'shadow-dialogue');
  assert.ok(dialogue.lines.length >= 8, `dialogue turns ${dialogue.lines.length}`);
  const speakers = new Set(dialogue.lines.map((l) => l.en.split(':')[0]));
  assert.ok(speakers.size >= 2, 'two speakers');
  const talk = lesson.exercises.find((e) => e.id === 'shadow-talk');
  assert.ok(talk.lines.length >= 6, 'chunked talk segment');
});

test('communication lesson: opinion prompts, role-play cards and a follow-up drill', () => {
  const lesson = LESSONS.find((l) => l.skill === 'communication');
  const opinion = lesson.exercises.find((e) => e.id === 'comm-opinion');
  assert.ok(opinion.prompts.length >= 3, 'three opinion prompts');
  const roleplay = lesson.exercises.find((e) => e.id === 'comm-roleplay');
  assert.ok(roleplay.prompts.length >= 3, 'three role-play cards');
  for (const card of roleplay.prompts) assert.match(card.en, /goal/i);
  const drill = lesson.exercises.find((e) => e.id === 'comm-followup');
  assert.ok(drill.prompts.length >= 4, 'follow-up statements');
});
