import { PEDAGOGY_GUIDANCE } from './pedagogy';

export const GENERATE_RESOURCE_VERSION = 'generate_resource@2'; // @2: ground in the NCCE 12 principles of computing pedagogy

export const GENERATE_RESOURCE_SYSTEM =
  'You generate ready-to-use teaching resources as clean, well-structured Markdown (headings, ' +
  'lists, tables, clear numbered tasks). Context is UK secondary-school Computing. If the request ' +
  'implies a worksheet, include clear instructions and answer space (blank lines or "________"). ' +
  'Keep language plain and accessible; if SEND/accessibility needs are described, follow them ' +
  'closely (short steps, minimal text, visual structure). Never name or invent real pupils. ' +
  'Return a short title, a safe filename without extension, and the Markdown content.' + PEDAGOGY_GUIDANCE;
