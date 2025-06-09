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

// Transform article based on category
function transformArticle(article: any) {
  const baseTransformation = {
    title: article.title,
    slug: article.slug,
    summary: article.summary,
    category: article.category,
    status: article.status || 'draft',
    tags: article.tags || [],
  };

  switch (article.category) {
    case 'neurodiversity':
      return {
        ...baseTransformation,
        content_blocks: {
          overview: article.overview,
          neurodiversity_perspective: article.neurodiversity_perspective,
          common_strengths_and_challenges: article.common_strengths_and_challenges,
          prevalence_and_demographics: article.prevalence_and_demographics,
          mechanisms_and_understanding: article.mechanisms_and_understanding,
          evidence_summary: article.evidence_summary,
          common_misconceptions: article.common_misconceptions,
          practical_takeaways: article.practical_takeaways,
          lived_experience: article.lived_experience,
          future_directions: article.future_directions,
          references_and_resources: article.references_and_resources
        }
      };

    case 'mental_health':
      return {
        ...baseTransformation,
        content_blocks: {
          overview: article.overview,
          prevalence: article.prevalence,
          causes_and_mechanisms: article.causes_and_mechanisms,
          symptoms_and_impact: article.symptoms_and_impact,
          evidence_summary: article.evidence_summary,
          practical_takeaways: article.practical_takeaways,
          common_myths: article.common_myths,
          future_directions: article.future_directions,
          references_and_resources: article.references_and_resources,
          key_evidence: article.key_evidence
        }
      };

    case 'psychology':
      return {
        ...baseTransformation,
        content_blocks: {
          overview: article.overview,
          definition: article.definition,
          core_principles: article.core_principles,
          relevance: article.relevance,
          key_studies_and_theories: article.key_studies_and_theories,
          common_misconceptions: article.common_misconceptions,
          practical_applications: article.practical_applications,
          future_directions: article.future_directions,
          references_and_resources: article.references_and_resources,
          key_evidence: article.key_evidence,
          practical_takeaways: article.practical_takeaways
        }
      };

    case 'neuroscience':
      return {
        ...baseTransformation,
        content_blocks: {
          overview: article.overview,
          definition: article.definition,
          mechanisms: article.mechanisms,
          relevance: article.relevance,
          key_studies: article.key_studies,
          common_misconceptions: article.common_misconceptions,
          practical_implications: article.practical_implications,
          future_directions: article.future_directions,
          references_and_resources: article.references_and_resources,
          key_evidence: article.key_evidence,
          practical_takeaways: article.practical_takeaways
        }
      };

    default:
      console.warn(`No specific transformation for category: ${article.category}`);
      return {
        ...baseTransformation,
        content_blocks: {
          overview: article.overview,
          future_directions: article.future_directions,
          references_and_resources: article.references_and_resources,
          key_evidence: article.key_evidence,
          practical_takeaways: article.practical_takeaways,
          ...article
        }
      };
  }
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials. Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Load and parse JSON data
    const filePath = path.join(__dirname, '..', 'articles-data.json');
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const articles = JSON.parse(rawData) as Article[];

    if (!Array.isArray(articles)) {
      throw new Error('Articles data must be an array');
    }

    console.log(`Found ${articles.length} articles to process`);

    // Process articles in batches
    const batchSize = 5;
    const batches: Article[][] = [];
    
    for (let i = 0; i < articles.length; i += batchSize) {
      batches.push(articles.slice(i, i + batchSize));
    }

    let successCount = 0;
    let errorCount = 0;

    for (const [batchIndex, batch] of batches.entries()) {
      console.log(`Processing batch ${batchIndex + 1}/${batches.length}`);

      for (const article of batch) {
        // Transform article based on its category
        const transformedArticle = transformArticle(article);

        if (!validateArticle(transformedArticle)) {
          console.error(`Validation failed for article: ${article.title}`);
          errorCount++;
          continue;
        }

        try {
          const { error } = await supabase
            .from('articles')
            .upsert({
              id: uuidv4(),
              ...transformedArticle,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'slug'
            });

          if (error) throw error;
          successCount++;
        } catch (error) {
          console.error(`Error upserting article ${article.title}:`, error);
          errorCount++;
        }
      }
    }

    console.log(`\nUpload complete!`);
    console.log(`Successfully uploaded: ${successCount} articles`);
    console.log(`Failed to upload: ${errorCount} articles`);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main().catch(console.error); 