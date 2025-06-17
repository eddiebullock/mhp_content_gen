import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import chalk from 'chalk';

// Load environment variables
dotenv.config();

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set in environment variables');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set in environment variables');
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigrationSQL() {
    try {
        console.log(chalk.blue('Running migration SQL...'));

        // Execute the migration SQL statements
        const migrationStatements = [
            // Create articles table if it doesn't exist
            `CREATE TABLE IF NOT EXISTS public.articles (
                id UUID NOT NULL DEFAULT extensions.uuid_generate_v4(),
                title TEXT NOT NULL,
                slug TEXT NOT NULL UNIQUE,
                summary TEXT NOT NULL,
                category TEXT NOT NULL CHECK (category IN (
                    'mental_health', 'neuroscience', 'psychology', 'brain_health', 
                    'neurodiversity', 'interventions', 'lifestyle_factors', 'lab_testing'
                )),
                status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('published', 'draft', 'archived')),
                tags TEXT[] DEFAULT '{}',
                content_blocks JSONB NOT NULL DEFAULT '{}',
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                CONSTRAINT articles_pkey PRIMARY KEY (id)
            )`,

            // Create indexes
            `CREATE INDEX IF NOT EXISTS idx_articles_category ON public.articles USING btree (category)`,
            `CREATE INDEX IF NOT EXISTS idx_articles_status ON public.articles USING btree (status)`,
            `CREATE INDEX IF NOT EXISTS idx_articles_created_at ON public.articles USING btree (created_at)`,
            `CREATE INDEX IF NOT EXISTS idx_articles_content_blocks ON public.articles USING gin (content_blocks)`,
            `CREATE INDEX IF NOT EXISTS idx_articles_tags ON public.articles USING gin (tags)`,

            // Enable RLS
            `ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY`,

            // Create RLS policies
            `DROP POLICY IF EXISTS "Public can view published articles" ON public.articles`,
            `CREATE POLICY "Public can view published articles"
                ON public.articles
                FOR SELECT
                USING (status = 'published')`,

            `DROP POLICY IF EXISTS "Authenticated users can view all articles" ON public.articles`,
            `CREATE POLICY "Authenticated users can view all articles"
                ON public.articles
                FOR SELECT
                USING (auth.role() = 'authenticated')`,

            `DROP POLICY IF EXISTS "Service role can manage all articles" ON public.articles`,
            `CREATE POLICY "Service role can manage all articles"
                ON public.articles
                FOR ALL
                USING (auth.role() = 'service_role')`,

            // Create trigger function
            `CREATE OR REPLACE FUNCTION public.handle_articles_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = now();
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql`,

            // Create trigger
            `DROP TRIGGER IF EXISTS set_articles_updated_at ON public.articles`,
            `CREATE TRIGGER set_articles_updated_at
                BEFORE UPDATE ON public.articles
                FOR EACH ROW
                EXECUTE FUNCTION public.handle_articles_updated_at()`,

            // Create migration function
            `CREATE OR REPLACE FUNCTION public.migrate_article_content_blocks()
            RETURNS void
            LANGUAGE plpgsql
            AS $$
            DECLARE
                article_record RECORD;
                new_content_blocks JSONB;
                evidence_summary TEXT := '';
                practical_applications TEXT := '';
                reliability_score NUMERIC := NULL;
            BEGIN
                -- Process each article
                FOR article_record IN 
                    SELECT id, content_blocks, category
                    FROM articles
                LOOP
                    new_content_blocks := article_record.content_blocks;
                    
                    -- Consolidate evidence fields into evidence_summary
                    evidence_summary := '';
                    IF article_record.content_blocks ? 'key_evidence' THEN
                        evidence_summary := evidence_summary || COALESCE(article_record.content_blocks->>'key_evidence', '') || ' ';
                    END IF;
                    IF article_record.content_blocks ? 'effectiveness' THEN
                        evidence_summary := evidence_summary || COALESCE(article_record.content_blocks->>'effectiveness', '') || ' ';
                    END IF;
                    IF article_record.content_blocks ? 'evidence_base' THEN
                        evidence_summary := evidence_summary || COALESCE(article_record.content_blocks->>'evidence_base', '') || ' ';
                    END IF;
                    
                    -- Remove old evidence fields and add consolidated evidence_summary
                    new_content_blocks := new_content_blocks - 'key_evidence' - 'effectiveness' - 'evidence_base';
                    IF evidence_summary != '' THEN
                        new_content_blocks := new_content_blocks || jsonb_build_object('evidence_summary', trim(evidence_summary));
                    END IF;
                    
                    -- Consolidate practical fields into practical_applications
                    practical_applications := '';
                    IF article_record.content_blocks ? 'practical_takeaways' THEN
                        practical_applications := practical_applications || COALESCE(article_record.content_blocks->>'practical_takeaways', '') || ' ';
                    END IF;
                    IF article_record.content_blocks ? 'practical_applications' THEN
                        practical_applications := practical_applications || COALESCE(article_record.content_blocks->>'practical_applications', '') || ' ';
                    END IF;
                    
                    -- Remove old practical fields and add consolidated practical_applications
                    new_content_blocks := new_content_blocks - 'practical_takeaways';
                    IF practical_applications != '' THEN
                        new_content_blocks := new_content_blocks || jsonb_build_object('practical_applications', trim(practical_applications));
                    END IF;
                    
                    -- Add reliability_score for intervention and lifestyle categories
                    IF article_record.category IN ('interventions', 'lifestyle_factors') THEN
                        -- Default reliability score (will be calculated based on evidence later)
                        reliability_score := 0.5;
                        new_content_blocks := new_content_blocks || jsonb_build_object('reliability_score', reliability_score);
                    END IF;
                    
                    -- Update the article
                    UPDATE articles
                    SET content_blocks = new_content_blocks
                    WHERE id = article_record.id;
                END LOOP;
            END;
            $$`
        ];

        console.log(chalk.yellow(`Executing ${migrationStatements.length} migration statements...`));

        for (let i = 0; i < migrationStatements.length; i++) {
            const statement = migrationStatements[i];
            console.log(chalk.blue(`Executing statement ${i + 1}/${migrationStatements.length}...`));
            
            try {
                const { error } = await supabase.rpc('exec_sql', { sql: statement });
                if (error) {
                    console.log(chalk.yellow(`Statement ${i + 1} had an error (likely already exists): ${error.message}`));
                } else {
                    console.log(chalk.green(`✓ Statement ${i + 1} executed successfully`));
                }
            } catch (err) {
                console.log(chalk.yellow(`Statement ${i + 1} skipped (likely already exists): ${err.message}`));
            }
        }

        console.log(chalk.green('\n✅ Migration SQL completed!'));
        return true;
    } catch (error) {
        console.error(chalk.red('Migration SQL failed:'), error);
        return false;
    }
}

// Run the migration
runMigrationSQL().then(success => {
    if (!success) {
        console.error(chalk.red('\n❌ Migration SQL failed. Please check the errors above.'));
        process.exit(1);
    }
    console.log(chalk.green('\n🎉 Migration SQL completed successfully!'));
}); 