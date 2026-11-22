import { beforeEach, describe, expect, it } from 'vitest';
import '../javascripts/logic.js';

const storage = globalThis.MemoryDecayStorage;
const engine = globalThis.MemoryDecayEngine;

async function resetStorage() {
  storage.closeDatabase();
  await new Promise(resolve => setTimeout(resolve, 20));
  await storage.resetAll();
}

describe('MemoryDecayEngine scoring', () => {
  const concept = {
    id: 'concept-1',
    title: 'Binary search',
    raw: 'Find a target in sorted data by eliminating half the remaining search space.',
    keywords: ['binary', 'search', 'sorted', 'target']
  };

  it('returns zero for empty or malformed answers', () => {
    expect(engine.scoreRecall('', concept).score).toBe(0);
    expect(engine.scoreRecall(null, concept).score).toBe(0);
  });

  it('gives a high score for a matching answer', () => {
    const result = engine.scoreRecall(
      'Binary search finds a target in sorted data by eliminating half the remaining search space.',
      concept
    );
    expect(result.score).toBeGreaterThanOrEqual(90);
  });

  it('bounds very long input safely', () => {
    const result = engine.scoreRecall('binary '.repeat(20000), concept);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

describe('MemoryDecayEngine scheduling and selectors', () => {
  it('schedules at approximately 70 percent retention', () => {
    const concept = { decayRate: 0.3, nextReviewAt: 0 };
    const scheduled = engine.scheduleNext(concept, 3, 10000);
    const interval = scheduled.nextReviewAt - 10000;
    const retention = engine.projectedRetention(scheduled, interval);
    expect(Math.abs(retention - engine.TARGET_RETENTION)).toBeLessThan(0.01);
  });

  it('classifies new, stable, reinforcement-needed and at-risk states', () => {
    const concept = { id: 'c1' };
    expect(engine.classify(concept, [])).toBe('new');
    expect(engine.classify(concept, [
      { conceptId: 'c1', at: 1, score: 60 },
      { conceptId: 'c1', at: 2, score: 85 }
    ])).toBe('stable');
    expect(engine.classify(concept, [
      { conceptId: 'c1', at: 1, score: 85 },
      { conceptId: 'c1', at: 2, score: 70 }
    ])).toBe('reinforcement-needed');
    expect(engine.classify(concept, [
      { conceptId: 'c1', at: 1, score: 85 },
      { conceptId: 'c1', at: 2, score: 40 }
    ])).toBe('at-risk');
  });

  it('calculates due concepts, average, history and labels', () => {
    const now = 10 * engine.DAY_MS;
    const concept = { id: 'c1', nextReviewAt: now - 1 };
    const tests = [
      { id: 't1', conceptId: 'c1', at: now - engine.DAY_MS, score: 60 },
      { id: 't2', conceptId: 'c1', at: now, score: 80 }
    ];
    expect(engine.getDue([concept], tests, now)).toEqual([concept]);
    expect(engine.averageRetention(tests)).toBe(70);
    expect(engine.reviewsCompleted(tests)).toBe(2);
    expect(engine.relativeDueLabel(now - 1, now)).toBe('Today');
    expect(engine.retentionHistory(3, tests, now)).toHaveLength(3);
  });
});

describe('MemoryDecayStorage import and CRUD', () => {
  beforeEach(async () => {
    await resetStorage();
  });

  it('adds, lists, updates and deletes concepts with cascade tests', async () => {
    const concept = await storage.addConcept({
      title: 'Test concept',
      raw: 'Test material',
      keywords: ['test'],
      createdAt: 100,
      decayRate: 0.3,
      nextReviewAt: 100,
      state: 'new'
    });
    await storage.addTest({ conceptId: concept.id, at: 200, score: 80, answer: 'Test answer' });
    expect(await storage.getConcept(concept.id)).toEqual(concept);
    expect(await storage.listTests(concept.id)).toHaveLength(1);
    await storage.updateConcept({ ...concept, title: 'Updated concept' });
    expect((await storage.getConcept(concept.id)).title).toBe('Updated concept');
    await storage.deleteConcept(concept.id);
    expect(await storage.getConcept(concept.id)).toBeUndefined();
    expect(await storage.listTests(concept.id)).toHaveLength(0);
  });

  it('rejects malformed and wrong-schema imports', async () => {
    await expect(storage.importAll('{"bad":true}')).rejects.toMatchObject({
      code: 'INVALID_IMPORT'
    });
    await expect(storage.importAll(JSON.stringify({
      schemaVersion: 999,
      concepts: [],
      tests: [],
      settings: [],
      meta: []
    }))).rejects.toMatchObject({ code: 'INVALID_IMPORT' });
  });

  it('rejects tests that reference missing concepts', async () => {
    await expect(storage.importAll(JSON.stringify({
      schemaVersion: 1,
      concepts: [],
      tests: [{ id: 't1', conceptId: 'missing', at: 1, score: 50, answer: 'answer' }],
      settings: [],
      meta: []
    }))).rejects.toMatchObject({ code: 'INVALID_IMPORT' });
  });
});
