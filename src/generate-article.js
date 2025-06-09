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

// Example article structure for GPT reference
const exampleArticle = {
  title: "Understanding Autism Spectrum Disorder",
  slug: "understanding-autism-spectrum-disorder",
  summary: "A comprehensive overview of Autism Spectrum Disorder (ASD), including its neurobiological basis, diagnostic criteria, and evidence-based interventions. This article examines current research on ASD's prevalence, mechanisms, and practical approaches to support.",
  category: "neurodiversity",
  overview: "Autism Spectrum Disorder (ASD) is a neurodevelopmental condition characterized by differences in social communication and interaction, alongside restricted and repetitive patterns of behavior [1]. Research indicates a prevalence of approximately 1-2% of the population [2], with increasing recognition of the condition's diverse presentation across genders and ages.",
  neurodiversity_perspective: "The neurodiversity paradigm views ASD as a natural variation in human neurology rather than a disorder requiring 'fixing' [3]. This perspective emphasizes the importance of understanding and accommodating neurological differences while recognizing both challenges and strengths associated with ASD.",
  common_strengths_and_challenges: "Individuals with ASD often demonstrate exceptional attention to detail, pattern recognition, and deep focus in areas of interest [4]. Common challenges may include sensory processing differences, social communication variations, and executive functioning differences. Research suggests these traits exist on a spectrum, with significant individual variation [5].",
  prevalence_and_demographics: "Recent epidemiological studies estimate ASD prevalence at 1-2% of the population [2]. Research indicates potential underdiagnosis in females and older adults, with growing recognition of the condition's presentation across different genders and age groups [6].",
  mechanisms_and_understanding: "Current research suggests ASD involves complex interactions between genetic and environmental factors [7]. Neuroimaging studies indicate differences in brain connectivity and structure, particularly in regions associated with social processing and sensory integration [8].",
  evidence_summary: "Meta-analyses of intervention studies suggest that early behavioral interventions can improve outcomes in communication and adaptive skills [9]. However, research emphasizes the importance of individualized approaches that respect neurodiversity principles [10].",
  common_misconceptions: "Common misconceptions include viewing ASD as a childhood condition that can be 'outgrown,' or assuming all individuals with ASD have exceptional savant abilities. Research indicates ASD is a lifelong condition with diverse presentations [11].",
  practical_takeaways: "Effective support strategies include: creating sensory-friendly environments, using clear communication methods, and implementing structured routines. Research supports the effectiveness of these approaches when tailored to individual needs [12].",
  lived_experience: "Autistic individuals report that understanding and acceptance from others significantly impacts their well-being [13]. Research emphasizes the importance of including autistic voices in research and support planning [14].",
  future_directions: "Emerging research focuses on understanding the diverse presentations of ASD across the lifespan, developing more effective support strategies, and improving access to diagnosis and services [15].",
  references_and_resources: "[1] American Psychiatric Association. (2022). Diagnostic and Statistical Manual of Mental Disorders (5th ed., text rev.)...",
  status: "draft",
  tags: ["autism", "neurodiversity", "neurodevelopment", "sensory processing", "social communication"],
  key_evidence: "Research indicates that ASD is associated with distinct patterns of brain connectivity and neural processing [8]. Studies have shown that early intervention can lead to significant improvements in communication and social skills [9]. Neuroimaging research has identified differences in brain structure and function, particularly in regions associated with social cognition and sensory processing [7]."
};

// Helper function to process GPT response
function processArticleResponse(article) {
  console.log(chalk.yellow('\nDebug: Original article format:'));
  console.log(chalk.yellow('keyEvidence/key_evidence type:', typeof (article.keyEvidence || article.key_evidence), Array.isArray(article.keyEvidence || article.key_evidence) ? '(array)' : ''));
  console.log(chalk.yellow('practicalTakeaways/practical_takeaways type:', typeof (article.practicalTakeaways || article.practical_takeaways), Array.isArray(article.practicalTakeaways || article.practical_takeaways) ? '(array)' : ''));

  // Handle field name conversion and array to string conversion
  const processed = { ...article };
  
  // Convert camelCase to snake_case and handle arrays
  if (processed.keyEvidence !== undefined) {
    processed.key_evidence = Array.isArray(processed.keyEvidence) 
      ? processed.keyEvidence.join('. ') + '.'
      : processed.keyEvidence;
    delete processed.keyEvidence;
  }
  
  if (processed.practicalTakeaways !== undefined) {
    processed.practical_takeaways = Array.isArray(processed.practicalTakeaways)
      ? processed.practicalTakeaways.join('. ') + '.'
      : processed.practicalTakeaways;
    delete processed.practicalTakeaways;
  }

  console.log(chalk.yellow('\nDebug: After processing:'));
  console.log(chalk.yellow('key_evidence type:', typeof processed.key_evidence));
  console.log(chalk.yellow('practical_takeaways type:', typeof processed.practical_takeaways));

  return processed;
}

// Helper function to generate GPT prompt based on category
function generatePrompt(topic, category) {
  const basePrompt = `Generate a comprehensive, evidence-based article about "${topic}" in the ${category} category.

# Writing Guidelines

## Tone and Style
- Maintain an objective, impartial, and balanced tone similar to a scientific review
- Use plain language while maintaining scientific accuracy
- Avoid hype, sensationalism, or personal opinions
- Include in-text citations using Vancouver style (numerical references)
- Back claims with high-quality evidence (meta-analyses, systematic reviews, or reputable studies)

## Content Requirements
- All text fields must be detailed and well-written
- Include relevant scientific evidence and research
- Address common misconceptions
- Provide practical applications and takeaways
- Include comprehensive references
- Ensure all required fields contain meaningful content

## Important Format Requirements
- Use snake_case for all field names (e.g., practical_takeaways, key_evidence)
- ALL text fields must be returned as strings, NOT arrays
- For key_evidence and practical_takeaways, combine multiple points into a single cohesive paragraph
- Use proper paragraph formatting with complete sentences
- Include transitions between ideas
- Maintain consistent citation style throughout

## Category-Specific Instructions
${getCategorySpecificInstructions(category)}

# Required Schema
The article must be formatted as a JSON object matching this schema:
${JSON.stringify(getSchemaForCategory(category).shape, null, 2)}

# Example Output
Here's an example of a well-structured article in the neurodiversity category:
${JSON.stringify(exampleArticle, null, 2)}

# Important Notes
1. Follow the exact schema structure
2. Use snake_case for all field names
3. Include numerical citations in square brackets [1]
4. Provide detailed references at the end
5. Ensure all text fields are comprehensive and well-supported
6. Use clear, accessible language while maintaining scientific accuracy
7. ALL text fields must be strings, not arrays
8. Combine multiple points into cohesive paragraphs`;

  return basePrompt;
}

// Helper function to get category-specific instructions
function getCategorySpecificInstructions(category) {
  const instructions = {
    mental_health: `- Focus on evidence-based understanding of the condition
- Include prevalence statistics and demographic information
- Address both biological and psychosocial factors
- Discuss evidence-based treatment approaches
- Include information about risk factors and protective factors
- Address common myths and misconceptions
- Provide practical strategies for management and support`,

    neuroscience: `- Explain the underlying neural mechanisms
- Include relevant neuroimaging and neurobiological research
- Discuss implications for understanding brain function
- Address both basic science and clinical applications
- Include information about neuroplasticity where relevant
- Discuss current research limitations and future directions
- Provide practical implications for brain health`,

    psychology: `- Focus on psychological theories and research
- Include key studies and theoretical frameworks
- Address both cognitive and behavioral aspects
- Discuss practical applications in daily life
- Include information about assessment and measurement
- Address cultural and individual differences
- Provide evidence-based strategies for application`,

    neurodiversity: `- Emphasize the neurodiversity paradigm
- Include perspectives from the neurodivergent community
- Address both strengths and challenges
- Discuss accommodations and support strategies
- Include information about diagnosis and identification
- Address common misconceptions and stereotypes
- Provide practical approaches for support and inclusion
- Ensure language is respectful and person-first
- Include lived experience perspectives
- Address intersectionality and diverse experiences`,

    interventions: `- Focus on evidence-based interventions
- Include information about effectiveness and limitations
- Discuss practical implementation strategies
- Address potential risks and contraindications
- Include information about monitoring and evaluation
- Discuss integration with other approaches
- Provide clear guidelines for application`,

    lifestyle_factors: `- Focus on modifiable lifestyle factors
- Include evidence for impact on mental health
- Discuss practical implementation strategies
- Address individual differences and preferences
- Include information about monitoring and evaluation
- Discuss integration with other approaches
- Provide clear, actionable recommendations`,

    lab_testing: `- Focus on scientific validity and reliability
- Include information about interpretation
- Discuss limitations and appropriate use
- Address ethical considerations
- Include information about current research
- Discuss integration with clinical assessment
- Provide clear guidelines for application`
  };

  return instructions[category] || 'Follow general writing guidelines for comprehensive, evidence-based content.';
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
          content: "You are an expert content writer specializing in mental health, psychology, and neuroscience. Your task is to generate comprehensive, evidence-based articles that are both scientifically accurate and accessible to a general audience. IMPORTANT: All text fields, including key_evidence and practical_takeaways, must be returned as strings, not arrays. Combine multiple points into cohesive paragraphs."
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
    console.log(chalk.yellow('\nDebug: Raw GPT response:'));
    console.log(chalk.yellow(content.substring(0, 200) + '...')); // Log first 200 chars

    let article = JSON.parse(content);

    // Process the article to handle any array responses
    article = processArticleResponse(article);

    // Add slug if not provided
    if (!article.slug) {
      article.slug = generateSlug(article.title);
    }

    // Log the article before validation
    console.log(chalk.yellow('\nDebug: Article before validation:'));
    console.log(chalk.yellow(JSON.stringify({
      key_evidence: article.key_evidence?.substring(0, 50) + '...',
      practical_takeaways: article.practical_takeaways?.substring(0, 50) + '...'
    }, null, 2)));

    // Validate the generated article
    const validation = validateArticle(article);
    if (!validation.isValid) {
      console.error(chalk.red('\nValidation errors:'));
      validation.errors.forEach(error => {
        console.error(chalk.red(`- ${error.path.join('.')}: ${error.message}`));
        // Log the actual value that caused the error
        console.error(chalk.red(`  Actual value:`, JSON.stringify(error.received)));
      });
      throw new Error('Generated article failed validation');
    }

    return article;
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error(chalk.red('\nError parsing GPT response as JSON:'), error);
      console.error(chalk.red('Raw response:'), content);
    } else {
      console.error(chalk.red('\nError generating article:'), error);
    }
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