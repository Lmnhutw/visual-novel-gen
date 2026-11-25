import assert from "node:assert/strict";
import test from "node:test";

import { STORE_PAGE_LIMIT } from "./publication-contract";
import {
  parsePublishedChapterNumber,
  parseStorePage,
  publishedChapterHref,
  publishedStoryHref,
} from "./publication-url";

test("published story and chapter links use the public Store path", () => {
  assert.equal(publishedStoryHref("the-tower"), "/store/the-tower");
  assert.equal(publishedChapterHref("the-tower", 3), "/store/the-tower/chapters/3");
});

test("catalog pagination defaults invalid and over-limit requests to the first page", () => {
  assert.equal(parseStorePage("2"), 2);
  assert.equal(parseStorePage(String(STORE_PAGE_LIMIT)), STORE_PAGE_LIMIT);
  for (const value of [undefined, "0", "-1", "2.5", ["2", "3"], String(STORE_PAGE_LIMIT + 1)]) {
    assert.equal(parseStorePage(value), 1);
  }
});

test("chapter links accept only positive canonical chapter numbers within the database integer range", () => {
  assert.equal(parsePublishedChapterNumber("1"), 1);
  assert.equal(parsePublishedChapterNumber("2147483647"), 2_147_483_647);
  for (const value of ["0", "01", "+2", "-1", " 2", "2e3", "2.5", "2147483648"]) {
    assert.equal(parsePublishedChapterNumber(value), null);
  }
});
