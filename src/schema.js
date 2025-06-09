import { z } from 'zod';

// Base article schema
const BaseArticleSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  summary: z.string().min(1),
  category: z.enum([
    'mental_health',
    'neuroscience',
    'psychology',
    'brain_health',
    'neurodiversity',
    'interventions',
    'lifestyle_factors',
    'lab_testing'
  ]),
  overview: z.string().min(1),
  future_directions: z.string().min(1),
  references_and_resources: z.string().min(1),
  status: z.enum(['published', 'draft', 'archived']).default('draft'),
  tags: z.array(z.string()),
  faqs: z.array(z.object({
    question: z.string(),
    answer: z.string()
  })).optional(),
  keyEvidence: z.string().describe('A single string containing key evidence points, formatted as a cohesive paragraph. Do not return as an array.'),
  practicalTakeaways: z.string().describe('A single string containing practical takeaways, formatted as a cohesive paragraph. Do not return as an array.')
});

// Category-specific schemas
const MentalHealthArticleSchema = BaseArticleSchema.extend({
  category: z.literal('mental_health'),
  prevalence: z.string().min(1),
  causes_and_mechanisms: z.string().min(1),
  symptoms_and_impact: z.string().min(1),
  evidence_summary: z.string().min(1),
  practical_takeaways: z.string().min(1),
  common_myths: z.string().min(1)
});

const NeuroscienceArticleSchema = BaseArticleSchema.extend({
  category: z.enum(['neuroscience', 'psychology', 'brain_health']),
  definition: z.string().min(1),
  mechanisms: z.string().min(1),
  relevance: z.string().min(1),
  key_studies: z.string().min(1),
  common_misconceptions: z.string().min(1),
  practical_implications: z.string().min(1)
});

const NeurodiversityArticleSchema = BaseArticleSchema.extend({
  category: z.literal('neurodiversity'),
  neurodiversity_perspective: z.string().min(1),
  common_strengths_and_challenges: z.string().min(1),
  prevalence_and_demographics: z.string().min(1),
  mechanisms_and_understanding: z.string().min(1),
  evidence_summary: z.string().min(1),
  common_misconceptions: z.string().min(1),
  practical_takeaways: z.string().min(1),
  lived_experience: z.string().min(1)
});

const InterventionArticleSchema = BaseArticleSchema.extend({
  category: z.enum(['interventions', 'lifestyle_factors']),
  how_it_works: z.string().min(1),
  evidence_base: z.string().min(1),
  effectiveness: z.string().min(1),
  practical_applications: z.string().min(1),
  common_myths: z.string().min(1),
  risks_and_limitations: z.string().min(1)
});

const LabTestingArticleSchema = BaseArticleSchema.extend({
  category: z.literal('lab_testing'),
  how_it_works: z.string().min(1),
  applications: z.string().min(1),
  strengths_and_limitations: z.string().min(1),
  risks_and_limitations: z.string().min(1)
});

// Combined schema for all article types
export const ArticleSchema = z.discriminatedUnion('category', [
  MentalHealthArticleSchema,
  NeuroscienceArticleSchema,
  NeurodiversityArticleSchema,
  InterventionArticleSchema,
  LabTestingArticleSchema
]);

// Helper function to validate an article
export function validateArticle(article) {
  try {
    return {
      isValid: true,
      article: ArticleSchema.parse(article)
    };
  } catch (error) {
    return {
      isValid: false,
      errors: error.errors
    };
  }
}

// Helper function to get the appropriate schema for a category
export function getSchemaForCategory(category) {
  switch (category) {
    case 'mental_health':
      return MentalHealthArticleSchema;
    case 'neuroscience':
    case 'psychology':
    case 'brain_health':
      return NeuroscienceArticleSchema;
    case 'neurodiversity':
      return NeurodiversityArticleSchema;
    case 'interventions':
    case 'lifestyle_factors':
      return InterventionArticleSchema;
    case 'lab_testing':
      return LabTestingArticleSchema;
    default:
      throw new Error(`Invalid category: ${category}`);
  }
} 