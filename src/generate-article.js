import { Command } from 'commander';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { validateArticle, getSchemaForCategory } from './schema.js';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Initialize CLI
const program = new Command();

program
  .name('mhp-content-gen')
  .description('Generate mental health and psychology article content using GPT')
  .version('1.0.0')
  .requiredOption('-t, --topic <string>', 'The topic of the article')
  .requiredOption('-c, --category <string>', 'The category of the article')
  .option('-o, --output <string>', 'Output file path', 'articles-data.json')
  .option('-m, --model <string>', 'GPT model to use', 'gpt-4-turbo-preview')
  .parse(process.argv);

const options = program.opts();

// Helper function to generate slug from title
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Helper function to generate GPT prompt based on category
function generatePrompt(topic, category) {
  const basePrompt = `Generate a comprehensive article about "${topic}" in the ${category} category. 
The article should be well-researched, evidence-based, and written in a clear, accessible style.
Format the response as a JSON object matching the following schema:`;

  const schema = getSchemaForCategory(category);
  const schemaDescription = JSON.stringify(schema.shape, null, 2);

  return `${basePrompt}\n\n${schemaDescription}\n\nImportant guidelines:
1. All text fields should be detailed and well-written
2. Include relevant scientific evidence and research
3. Use clear, accessible language while maintaining scientific accuracy
4. Include practical takeaways and applications
5. Address common misconceptions
6. Provide comprehensive references
7. Ensure all required fields are filled with meaningful content`;
}

// Main article generation function
async function generateArticle(topic, category, model) {
  console.log(chalk.blue(`\nGenerating article about "${topic}" in category "${category}"...`));

  try {
    const prompt = generatePrompt(topic, category);
    
    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content: "You are an expert content writer specializing in mental health, psychology, and neuroscience. Your task is to generate comprehensive, evidence-based articles that are both scientifically accurate and accessible to a general audience."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0].message.content;
    const article = JSON.parse(content);

    // Add slug if not provided
    if (!article.slug) {
      article.slug = generateSlug(article.title);
    }

    // Validate the generated article
    const validation = validateArticle(article);
    if (!validation.isValid) {
      console.error(chalk.red('\nValidation errors:'));
      validation.errors.forEach(error => {
        console.error(chalk.red(`- ${error.path.join('.')}: ${error.message}`));
      });
      throw new Error('Generated article failed validation');
    }

    return article;
  } catch (error) {
    console.error(chalk.red('\nError generating article:'), error);
    throw error;
  }
}

// Main function to handle file operations and article generation
async function main() {
  try {
    // Validate category
    const validCategories = [
      'mental_health', 'neuroscience', 'psychology', 'brain_health',
      'neurodiversity', 'interventions', 'lifestyle_factors', 'lab_testing'
    ];
    
    if (!validCategories.includes(options.category)) {
      throw new Error(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
    }

    // Generate the article
    const article = await generateArticle(options.topic, options.category, options.model);
    
    // Read existing articles if file exists
    let articles = [];
    try {
      const filePath = path.join(__dirname, '..', options.output);
      const existingContent = await fs.readFile(filePath, 'utf-8');
      articles = JSON.parse(existingContent);
      if (!Array.isArray(articles)) {
        articles = [];
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    // Add new article
    articles.push(article);

    // Save updated articles
    const filePath = path.join(__dirname, '..', options.output);
    await fs.writeFile(filePath, JSON.stringify(articles, null, 2));

    console.log(chalk.green('\nArticle generated successfully!'));
    console.log(chalk.green(`Saved to: ${options.output}`));
    console.log(chalk.green(`Total articles: ${articles.length}`));

  } catch (error) {
    console.error(chalk.red('\nError:'), error.message);
    process.exit(1);
  }
}

// Run the script
main(); 