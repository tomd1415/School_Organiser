import { describe, expect, it } from 'vitest';
import { cleanLessonTitle, lessonStructure, unitCandidates } from '../src/services/convertUnit';

// Realistic imported paths: KS3 units wrap each lesson in a "…_v1.zip" folder; GCSE units use
// "L2 - title" folders; loose files at any level are not lessons.
const paths = [
  'KS3/KS3 TCC Curriculum Map_v1.1.xlsx',
  'KS3/year_7/Unit 1/Lesson 1 microbit countdown_v1.zip/Lesson 1 microbit countdown/Activity worksheet.docx',
  'KS3/year_7/Unit 1/Lesson 1 microbit countdown_v1.zip/Lesson 1 microbit countdown/L1 Slides microbit countdown.pptx',
  'KS3/year_7/Unit 1/Lesson 2 first program_v1.zip/Lesson 2 first program/L2 Slides.pptx',
  'KS3/year_7/Unit 2/Lesson 1 networks_v2.zip/Lesson 1 networks/slides.pptx',
  'GCSE Lessons/Data Representation/L9 - Unicode and file size calculation/worksheet.docx',
  'GCSE Lessons/Data Representation/L10 - Representing bitmap images/slides.pptx',
  'GCSE Lessons/Data Representation/L10 - Representing bitmap images/homework.pdf',
  'GCSE Lessons/Data Representation/L12 - Representing sound/slides.pptx',
  'GCSE Lessons/fears.txt',
  'GCSE Lessons/Other/year10_guessing_game_resource_pack/main.py',
];

describe('unitCandidates (5.3 — find convertible downloaded units)', () => {
  it('finds folders with ≥2 lesson-named subfolders, at any depth', () => {
    const c = unitCandidates(paths);
    expect(c).toEqual([
      { folder: 'GCSE Lessons/Data Representation', lessonCount: 3 },
      { folder: 'KS3/year_7/Unit 1', lessonCount: 2 },
    ]);
  });

  it('a single-lesson folder is not a unit candidate', () => {
    expect(unitCandidates(paths).some((c) => c.folder === 'KS3/year_7/Unit 2')).toBe(false);
  });

  it('non-lesson folders (Other/…) are ignored', () => {
    expect(unitCandidates(paths).some((c) => c.folder.includes('Other'))).toBe(false);
  });
});

describe('lessonStructure (5.3 — a unit folder → ordered lessons + files)', () => {
  it('orders lessons by number and cleans the zip suffix', () => {
    const ls = lessonStructure(paths, 'KS3/year_7/Unit 1');
    expect(ls.map((l) => l.title)).toEqual(['Lesson 1 microbit countdown', 'Lesson 2 first program']);
    expect(ls[0]!.files).toEqual(['Activity worksheet.docx', 'L1 Slides microbit countdown.pptx']);
  });

  it('numeric order beats lexicographic (L9 before L10/L12)', () => {
    const ls = lessonStructure(paths, 'GCSE Lessons/Data Representation');
    expect(ls.map((l) => l.title)).toEqual([
      'L9 - Unicode and file size calculation',
      'L10 - Representing bitmap images',
      'L12 - Representing sound',
    ]);
  });

  it('cleanLessonTitle strips packaging noise', () => {
    expect(cleanLessonTitle('Lesson 3 sorting_v1.zip')).toBe('Lesson 3 sorting');
    expect(cleanLessonTitle('Lesson 4 testing v2')).toBe('Lesson 4 testing');
    expect(cleanLessonTitle('L5 - DIVs and classes')).toBe('L5 - DIVs and classes');
  });
});
