// The tools the model can call. Each input is validated with Zod before it runs.
import { z } from 'zod/v4';
import type { ChatFunctionTool } from '@openrouter/sdk/models';
import { SCHOOL_TYPES, SearchError, countBy, describe, filterSchools, gradeLabel, type Filters, type School } from './schools';

const filterFields = {
  name: z.string().min(1).max(120).optional()
    .describe('Words from the school\'s name, e.g. "coral way" or "mater academy". Every word must appear.'),
  types: z.array(z.enum(SCHOOL_TYPES)).max(5).optional()
    .describe('Only these kinds of school. Head Start is free pre-K for low-income families; Early Head Start serves infants and toddlers.'),
  city: z.string().min(1).max(60).optional()
    .describe('City as written in the data, e.g. "Hialeah", "Homestead", "Miami Gardens". Unincorporated areas such as Kendall are listed as "Miami-Dade" or "Miami", so prefer zip or near for neighborhoods.'),
  zip: z.string().regex(/^\d{5}$/).optional().describe('Five-digit zip code the school is in.'),
  grade: z.string().min(1).max(30).optional()
    .describe('A grade the school must serve: "infant", "pre-K", "K", or 1 to 12 (e.g. "3", "9th").'),
  near: z.object({
    zip: z.string().regex(/^\d{5}$/).optional().describe('Measure from the center of this zip code.'),
    school: z.string().min(1).max(120).optional().describe('Measure from this school\'s location.'),
    lat: z.number().min(24.9).max(26.2).optional(),
    lon: z.number().min(-81.2).max(-79.9).optional(),
  }).optional().describe('Find schools close to a place. Results are sorted nearest first and include distance_miles.'),
  radius_miles: z.number().min(0.1).max(30).optional().describe('How far from `near` to look. Defaults to 3 miles.'),
};

const SearchInput = z.object({
  ...filterFields,
  limit: z.number().int().min(1).max(25).optional().describe('How many schools to return, default 10.'),
  offset: z.number().int().min(0).optional().describe('Skip this many results, to page through long lists.'),
}).strict();

const CountInput = z.object({
  ...filterFields,
  group_by: z.enum(['type', 'city', 'zip']).optional().describe('Break the count down by this field. Defaults to type.'),
}).strict();

type FilterInput = Omit<z.infer<typeof SearchInput>, 'limit' | 'offset'>;

function toFilters(input: FilterInput): Filters {
  return {
    name: input.name, types: input.types, city: input.city, zip: input.zip, grade: input.grade,
    near: input.near, radiusMiles: input.radius_miles,
  };
}

function parameters(schema: z.ZodType): Record<string, unknown> {
  const { $schema: _ignored, ...json } = z.toJSONSchema(schema) as Record<string, unknown>;
  return json;
}

export const toolDefinitions: ChatFunctionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_schools',
      description:
        'Search the list of Miami-Dade schools (public, charter, private, Head Start and Early Head Start, infant through grade 12). ' +
        'Combine any filters. Returns the total number of matches and one page of schools with name, type, grades, address, phone and website. ' +
        'Call it again with offset to see more.',
      parameters: parameters(SearchInput),
    },
  },
  {
    type: 'function',
    function: {
      name: 'count_schools',
      description:
        'Count Miami-Dade schools that match the same filters as search_schools, broken down by type, city or zip. ' +
        'Use it for "how many" questions instead of paging through search results.',
      parameters: parameters(CountInput),
    },
  },
];

export type ToolOutcome = { content: string; isError: boolean };

/**
 * Runs one tool call. `rawArguments` is the JSON string the model wrote.
 * Bad input comes back as an error result so the model can correct itself.
 */
export function runTool(schools: School[], name: string, rawArguments: string): ToolOutcome {
  let input: unknown;
  try {
    input = rawArguments.trim() ? JSON.parse(rawArguments) : {};
  } catch {
    return error('The arguments were not valid JSON. Call the tool again with a JSON object.');
  }
  try {
    if (name === 'search_schools') {
      const parsed = SearchInput.safeParse(input);
      if (!parsed.success) return error(`Invalid input: ${z.prettifyError(parsed.error)}`);
      const { limit = 10, offset = 0, ...rest } = parsed.data;
      const { matches, center, grade } = filterSchools(schools, toFilters(rest));
      return ok({
        total_matches: matches.length,
        showing: `${Math.min(offset + 1, matches.length)}-${Math.min(offset + limit, matches.length)}`,
        ...(center ? { measured_from: center.description, radius_miles: rest.radius_miles ?? 3 } : {}),
        ...(grade !== undefined ? { grade: gradeLabel(grade) } : {}),
        schools: matches.slice(offset, offset + limit).map(describe),
      });
    }
    if (name === 'count_schools') {
      const parsed = CountInput.safeParse(input);
      if (!parsed.success) return error(`Invalid input: ${z.prettifyError(parsed.error)}`);
      const { group_by = 'type', ...rest } = parsed.data;
      const { matches, center, grade } = filterSchools(schools, toFilters(rest));
      const groups = Object.entries(countBy(matches, group_by));
      return ok({
        total: matches.length,
        ...(center ? { measured_from: center.description, radius_miles: rest.radius_miles ?? 3 } : {}),
        ...(grade !== undefined ? { grade: gradeLabel(grade) } : {}),
        [`by_${group_by}`]: Object.fromEntries(groups.slice(0, 40)),
        ...(groups.length > 40 ? { note: `Showing the 40 largest of ${groups.length} groups.` } : {}),
      });
    }
    return error(`Unknown tool "${name}".`);
  } catch (e) {
    if (e instanceof SearchError) return error(e.message);
    throw e;
  }
}

const ok = (value: unknown): ToolOutcome => ({ content: JSON.stringify(value), isError: false });
const error = (message: string): ToolOutcome => ({ content: `Error: ${message}`, isError: true });
