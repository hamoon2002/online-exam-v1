import test from 'node:test';
import assert from 'node:assert/strict';
import { buildContentCards, filterContentCards } from '../src/pages/ContentLibraryPage/contentCards';

const sections = {
  hero: { title: 'بنر جدید' },
  about: {}, features: {}, pricing: {}, news: {}, footer: {},
};

test('content library combines every article and six landing sections in stable cards', () => {
  const cards = buildContentCards(
    [{ id: '1', slug: 'learn', title: 'راهنمای آزمون', excerpt: 'متن', coverImageUrl: null, published: true, createdAt: '2026-11-10T00:00:00Z', updatedAt: '2026-11-10T00:00:00Z', contentMarkdown: 'content', publishedAt: null, authorName: 'admin' }],
    sections,
    ['features']
  );
  assert.equal(cards.length, 7);
  assert.equal(cards.find(item => item.key === 'blog:1')?.published, true);
  assert.equal(cards.find(item => item.key === 'cms:hero')?.title, 'بنر جدید');
  assert.equal(cards.find(item => item.key === 'cms:features')?.published, false);
  assert.equal(cards.find(item => item.key === 'cms:about')?.editUrl, '/site-content?section=about');
});

test('content library can filter published/draft content and search Persian titles', () => {
  const cards = buildContentCards([], sections, ['hero']);
  assert.equal(filterContentCards(cards, 'draft', '').length, 1);
  assert.equal(filterContentCards(cards, 'published', '').length, 5);
  assert.deepEqual(filterContentCards(cards, 'all', 'بنر').map(item => item.key), ['cms:hero']);
  assert.equal(filterContentCards(cards, 'all', 'NOT PRESENT').length, 0);
});
