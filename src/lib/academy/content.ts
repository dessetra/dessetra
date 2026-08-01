import "server-only";

import fs from "fs";
import path from "path";

export type AcademyLessonMetadata = {
  title?: string;
  lessonNumber?: number;
  duration?: number;
  difficulty?: string;
  objective?: string;
  video?: string;
  resource?: string;
};

export type AcademyLessonContent = {
  metadata: AcademyLessonMetadata;
  content: string;
};

const SAFE_SLUG = /^[a-z0-9-]+$/;

function assertSafeSlug(value: string, label: string) {
  if (!SAFE_SLUG.test(value)) {
    throw new Error(`Invalid ${label}.`);
  }
}

function parseNumber(value: string | undefined) {
  if (!value) return undefined;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseFrontmatter(source: string): AcademyLessonContent {
  const normalized = source.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");

  if (!normalized.startsWith("---\n")) {
    return {
      metadata: {},
      content: normalized.trim(),
    };
  }

  const closingMarkerIndex = normalized.indexOf("\n---\n", 4);

  if (closingMarkerIndex === -1) {
    return {
      metadata: {},
      content: normalized.trim(),
    };
  }

  const frontmatter = normalized.slice(4, closingMarkerIndex);
  const content = normalized.slice(closingMarkerIndex + 5).trim();
  const rawMetadata: Record<string, string> = {};

  for (const line of frontmatter.split("\n")) {
    const separatorIndex = line.indexOf(":");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (key) {
      rawMetadata[key] = value;
    }
  }

  return {
    metadata: {
      title: rawMetadata.title || undefined,
      lessonNumber: parseNumber(rawMetadata.lessonNumber),
      duration: parseNumber(rawMetadata.duration),
      difficulty: rawMetadata.difficulty || undefined,
      objective: rawMetadata.objective || undefined,
      video: rawMetadata.video || undefined,
      resource: rawMetadata.resource || undefined,
    },
    content,
  };
}

function findLessonPath(
  courseSlug: string,
  challengeSlug: string,
  lessonSlug: string
): string | null {
  const academyRoot = path.join(
    process.cwd(),
    "src",
    "content",
    "academy"
  );

  /*
   * Current Academy structure:
   *
   * courseSlug/
   *   challengeSlug/
   *     lessonSlug.md
   */
  const flatLessonPath = path.join(
    academyRoot,
    courseSlug,
    challengeSlug,
    `${lessonSlug}.md`
  );

  if (fs.existsSync(flatLessonPath)) {
    return flatLessonPath;
  }

  /*
   * Backward-compatible structure:
   *
   * courseSlug/
   *   challengeSlug/
   *     lessonSlug/
   *       lesson.md
   *
   * Keeping this fallback prevents any previously created nested
   * lesson content from breaking.
   */
  const nestedLessonPath = path.join(
    academyRoot,
    courseSlug,
    challengeSlug,
    lessonSlug,
    "lesson.md"
  );

  if (fs.existsSync(nestedLessonPath)) {
    return nestedLessonPath;
  }

  return null;
}

export function getAcademyLessonContent(
  courseSlug: string,
  challengeSlug: string,
  lessonSlug: string
): AcademyLessonContent | null {
  assertSafeSlug(courseSlug, "course slug");
  assertSafeSlug(challengeSlug, "challenge slug");
  assertSafeSlug(lessonSlug, "lesson slug");

  const lessonPath = findLessonPath(
    courseSlug,
    challengeSlug,
    lessonSlug
  );

  if (!lessonPath) {
    return null;
  }

  const source = fs.readFileSync(lessonPath, "utf8");

  return parseFrontmatter(source);
}