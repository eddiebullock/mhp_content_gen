import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env
const envPath = path.resolve(process.cwd(), '.env');
console.log('Loading environment from:', envPath);
dotenv.config({ path: envPath });

// Debug environment variables
console.log('Environment variables:');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set');

type ArticleCategory = 'mental_health' | 'neuroscience' | 'psychology' | 'brain_health' | 
                      'neurodiversity' | 'interventions' | 'lifestyle_factors' | 'lab_testing';

interface BaseArticle {
  title: string;
  slug: string;
  summary: string;
  category: ArticleCategory;
  overview: string;
  future_directions: string;
  references_and_resources: string;
  status: 'published' | 'draft' | 'archived';
  tags: string[];
  faqs?: Array<{
    question: string;
    answer: string;
  }>;
  key_evidence?: string;
  practical_takeaways?: string;
  content_blocks?: Record<string, string>;
}

interface MentalHealthArticle extends BaseArticle {
  category: 'mental_health';
  prevalence: string;
  causes_and_mechanisms: string;
  symptoms_and_impact: string;
  evidence_summary: string;
  practical_takeaways: string;
  common_myths: string;
}

interface NeuroscienceArticle extends BaseArticle {
  category: 'neuroscience' | 'psychology' | 'brain_health';
  definition: string;
  mechanisms: string;
  relevance: string;
  key_studies: string;
  common_misconceptions: string;
  practical_implications: string;
}

interface PsychologyArticle extends BaseArticle {
  category: 'psychology';
  definition: string;
  core_principles: string;
  relevance: string;
  key_studies_and_theories: string;
  common_misconceptions: string;
  practical_applications: string;
}

interface NeurodiversityArticle extends BaseArticle {
  category: 'neurodiversity';
  neurodiversity_perspective: string;
  common_strengths_and_challenges: string;
  prevalence_and_demographics: string;
  mechanisms_and_understanding: string;
  evidence_summary: string;
  common_misconceptions: string;
  practical_takeaways: string;
  lived_experience: string;
}

interface InterventionArticle extends BaseArticle {
  category: 'interventions' | 'lifestyle_factors';
  how_it_works: string;
  evidence_base: string;
  effectiveness: string;
  practical_applications: string;
  common_myths: string;
  risks_and_limitations: string;
}

interface LabTestingArticle extends BaseArticle {
  category: 'lab_testing';
  how_it_works: string;
  applications: string;
  strengths_and_limitations: string;
  risks_and_limitations: string;
}

type Article = MentalHealthArticle | NeuroscienceArticle | PsychologyArticle | 
              NeurodiversityArticle | InterventionArticle | LabTestingArticle;

// List of all possible content fields to be merged into content_blocks
const ALL_CONTENT_FIELDS = [
  'overview',
  'prevalence',
  'causes_and_mechanisms',
  'symptoms_and_impact',
  'evidence_summary',
  'practical_takeaways',
  'common_myths',
  'definition',
  'mechanisms',
  'relevance',
  'key_studies',
  'key_studies_and_theories',
  'core_principles',
  'practical_applications',
  'practical_implications',
  'common_misconceptions',
  'neurodiversity_perspective',
  'common_strengths_and_challenges',
  'prevalence_and_demographics',
  'mechanisms_and_understanding',
  'lived_experience',
  'how_it_works',
  'evidence_base',
  'effectiveness',
  'risks_and_limitations',
  'future_directions',
  'references_and_resources',
  'applications',
  'strengths_and_limitations',
  'key_evidence',
  'practical_takeaways'
];

// Validate article data
function validateArticle(article: any): boolean {
  const requiredFields = ['title', 'slug', 'summary', 'category'];
  const hasRequiredFields = requiredFields.every(field => article[field]);
  
  if (!hasRequiredFields) {
    console.error('Missing required fields:', requiredFields.filter(field => !article[field]));
    return false;
  }

  if (!article.content_blocks) {
    console.error('Missing content_blocks');
    return false;
  }

  return true;
}

// Transform article: always merge all content fields into content_blocks
function transformArticle(article: any) {
  const baseTransformation = {
    title: article.title,
    slug: article.slug,
    summary: article.summary,
    category: article.category,
    status: article.status || 'draft',
    tags: article.tags || [],
  };
  // Merge all content fields into content_blocks
  const content_blocks: Record<string, string> = {};
  for (const field of ALL_CONTENT_FIELDS) {
    if (article[field]) {
      content_blocks[field] = article[field];
    }
  }
  // If the article already has a content_blocks object, merge it in
  if (article.content_blocks && typeof article.content_blocks === 'object') {
    Object.assign(content_blocks, article.content_blocks);
  }
  return {
    ...baseTransformation,
    content_blocks
  };
}

async function bulkUploadArticles() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const articlesData = JSON.parse(fs.readFileSync('articles-data.json', 'utf-8'));
  let uploaded = 0, failed = 0;
  for (const article of articlesData) {
    const transformedArticle = transformArticle(article);
        if (!validateArticle(transformedArticle)) {
      console.error('Validation failed for article:', article.title);
      failed++;
          continue;
        }
    const { error: insertError } = await supabase
            .from('articles')
      .upsert(transformedArticle, { onConflict: 'slug' });
    if (insertError) {
      console.error('Error upserting article (slug: ' + transformedArticle.slug + '): ', insertError);
      failed++;
    } else {
      console.log('Article ' + transformedArticle.slug + ' upserted.');
      uploaded++;
    }
  }
  console.log('Bulk upload completed. Uploaded ' + uploaded + ' article(s) (' + failed + ' failed).');
  }

bulkUploadArticles().catch(console.error); 