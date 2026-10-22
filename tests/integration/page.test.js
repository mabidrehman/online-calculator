import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { describe, it } from 'node:test';

import { createPageDom } from '../helpers/dom.js';

const { document } = createPageDom().window;
const normalize = (text) => text.replace(/\s+/g, ' ').trim();
const publicPath = (path) => new URL(`../../public/${path}`, import.meta.url);

describe('page: SEO', () => {
  it('declares Spanish as the page language', () => assert.equal(document.documentElement.lang, 'es'));

  it('has a concise title', () => {
    assert.ok(document.title.length > 20 && document.title.length <= 65, document.title);
  });

  it('has a meta description of search-snippet length', () => {
    const description = document.querySelector('meta[name="description"]').content;
    assert.ok(description.length >= 120 && description.length <= 170, `${description.length} chars`);
  });

  it('has exactly one h1', () => assert.equal(document.querySelectorAll('h1').length, 1));

  it('does not skip heading levels', () => {
    let previous = 0;
    for (const heading of document.querySelectorAll('h1, h2, h3, h4, h5, h6')) {
      const level = Number(heading.tagName[1]);
      assert.ok(level <= previous + 1, `${heading.tagName} "${heading.textContent}" skips a level`);
      previous = level;
    }
  });

  it('has a responsive viewport', () => {
    assert.match(document.querySelector('meta[name="viewport"]').content, /width=device-width/);
  });

  it('has valid JSON-LD for the app and FAQ', () => {
    const data = JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent);
    const types = data['@graph'].map((node) => node['@type']);
    assert.deepEqual(types, ['WebApplication', 'FAQPage']);
  });

  it('keeps FAQ structured data identical to the visible FAQ', () => {
    const data = JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent);
    const structured = data['@graph']
      .find((node) => node['@type'] === 'FAQPage')
      .mainEntity.map((question) => [question.name, question.acceptedAnswer.text]);
    const visible = [...document.querySelectorAll('.faq details')].map((details) => [
      normalize(details.querySelector('summary').textContent),
      normalize(details.querySelector('p').textContent),
    ]);
    assert.deepEqual(structured, visible);
  });
});

describe('page: security', () => {
  it('sets a strict Content-Security-Policy', () => {
    const csp = document.querySelector('meta[http-equiv="Content-Security-Policy"]').content;
    assert.match(csp, /script-src 'self'/);
    assert.match(csp, /object-src 'none'/);
    assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval/);
  });

  it('has no inline executable scripts', () => {
    for (const script of document.querySelectorAll('script:not([src])')) {
      assert.equal(script.type, 'application/ld+json', 'inline scripts would be blocked by CSP');
    }
  });

  it('has no inline event handlers or style attributes', () => {
    for (const element of document.querySelectorAll('*')) {
      for (const { name } of element.attributes) {
        assert.ok(!name.startsWith('on'), `<${element.tagName.toLowerCase()} ${name}>`);
        assert.notEqual(name, 'style', `<${element.tagName.toLowerCase()} style>`);
      }
    }
  });

  it('loads only local assets that exist', () => {
    const references = [
      ...[...document.querySelectorAll('script[src]')].map((script) => script.getAttribute('src')),
      ...[...document.querySelectorAll('link[href]')].map((link) => link.getAttribute('href')),
    ];
    assert.ok(references.length > 0);
    for (const reference of references) {
      assert.doesNotMatch(reference, /^(https?:)?\/\//, `external asset ${reference}`);
      assert.ok(existsSync(publicPath(reference)), `missing ${reference}`);
    }
  });
});

describe('page: accessibility', () => {
  const keys = [...document.querySelectorAll('#keypad button')];

  it('has the full keypad', () => {
    assert.equal(keys.length, 20);
    const digits = keys.filter((key) => key.dataset.action === 'digit').map((key) => key.dataset.value);
    assert.deepEqual(digits.sort(), ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
  });

  it('uses non-submitting buttons', () => {
    for (const button of document.querySelectorAll('button')) assert.equal(button.type, 'button');
  });

  it('labels every symbol key in Spanish', () => {
    for (const key of keys.filter((button) => button.dataset.action !== 'digit')) {
      assert.ok(key.getAttribute('aria-label'), `key "${key.textContent}" needs an aria-label`);
    }
  });

  it('announces results and errors to screen readers', () => {
    assert.equal(document.getElementById('display-primary').getAttribute('aria-live'), 'polite');
    assert.equal(document.getElementById('display-error').getAttribute('role'), 'alert');
  });

  it('labels the theme dropdown', () => {
    const select = document.getElementById('theme-select');
    assert.equal(select.tagName, 'SELECT');
    assert.equal(normalize(document.querySelector(`label[for="${select.id}"]`).textContent), 'Tema de color');
  });
});

describe('deployment files', () => {
  it('ships robots.txt and a favicon', () => {
    assert.ok(existsSync(publicPath('robots.txt')));
    assert.ok(existsSync(publicPath('favicon.svg')));
  });

  it('blocks the project root and allows the public folder on Apache', () => {
    assert.ok(existsSync(new URL('../../.htaccess', import.meta.url)));
    assert.ok(existsSync(publicPath('.htaccess')));
  });
});
