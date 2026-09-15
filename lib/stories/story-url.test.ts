import assert from "node:assert/strict";
import test from "node:test";

import {
  libraryStoryHref,
  storyIdFromQuery,
  storyQueryValue,
  storySlug,
} from "@/lib/stories/story-url";

const story = {
  id: "cmta3kip30000js04lvzdslfm",
  slug: "the-last-heir-of-the-forgotten-realm",
  title: "The Last Heir of the Forgotten Realm",
};

test("story URLs use the stable readable slug without exposing the database ID", () => {
  assert.equal(
    storyQueryValue(story),
    "the-last-heir-of-the-forgotten-realm",
  );
  assert.equal(
    libraryStoryHref(story, { view: "detail" }),
    "/library/story?story=the-last-heir-of-the-forgotten-realm&view=detail",
  );
  assert.equal(
    libraryStoryHref(story, { chapter: 2 }),
    "/library/story?story=the-last-heir-of-the-forgotten-realm&chapter=2",
  );
});

test("story slugs support Vietnamese titles and legacy ID references remain valid", () => {
  assert.equal(storySlug("Đêm ở Vương quốc!"), "dem-o-vuong-quoc");
  assert.equal(
    storyIdFromQuery("the-last-heir-of-the-forgotten-realm--cmta3kip-3000-0js0-4lvz-dslfm"),
    story.id,
  );
  assert.equal(storyIdFromQuery(story.id), story.id);
  assert.equal(storyIdFromQuery(story.slug), "");
});
