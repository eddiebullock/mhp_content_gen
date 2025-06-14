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
  .option('--no-clear', 'Skip clearing the output file (used when called from generate-multiple.js)')
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

// Example psychology article
const examplePsychologyArticle = {
  title: "Understanding Cognitive Development",
  slug: "understanding-cognitive-development",
  summary: "A comprehensive exploration of cognitive development theories and research, examining how thinking, learning, and problem-solving abilities evolve across the lifespan. This article synthesizes key theories and evidence-based research on cognitive development.",
  category: "psychology",
  overview: "Cognitive development refers to the growth and change in intellectual abilities across the lifespan [1]. Research indicates that cognitive development follows both universal patterns and individual variations, influenced by biological, environmental, and social factors [2].",
  definition: "Cognitive development is the process through which humans acquire, organize, and use knowledge and skills. It encompasses changes in thinking, reasoning, problem-solving, and information processing abilities that occur from infancy through adulthood [3].",
  core_principles: "Key principles of cognitive development include: the interaction of nature and nurture, the importance of early experiences, and the role of social interaction in learning [4]. Research demonstrates that cognitive development is both continuous and stage-like, with critical periods for certain types of learning [5].",
  relevance: "Understanding cognitive development is crucial for education, parenting, and mental health practice [6]. Research shows that developmentally appropriate interventions can significantly impact learning outcomes and cognitive abilities [7].",
  key_studies_and_theories: "Piaget's theory of cognitive development [8] and Vygotsky's sociocultural theory [9] provide foundational frameworks. Recent neuroimaging studies have enhanced our understanding of the neural basis of cognitive development [10].",
  common_misconceptions: "Common misconceptions include viewing cognitive development as purely biological or assuming all children develop at the same rate. Research indicates significant individual variation in developmental trajectories [11].",
  practical_applications: "Practical applications include: developmentally appropriate educational strategies, early intervention programs, and cognitive assessment tools. Research supports the effectiveness of these approaches when tailored to individual needs [12].",
  future_directions: "Emerging research focuses on the role of technology in cognitive development, the impact of environmental factors, and the development of more precise assessment tools [13].",
  references_and_resources: "[1] Piaget, J. (1952). The origins of intelligence in children...",
  status: "draft",
  tags: ["cognitive development", "psychology", "learning", "education", "child development"],
  key_evidence: "Longitudinal studies demonstrate that early cognitive stimulation significantly impacts later academic achievement [14]. Neuroimaging research has identified critical periods for different types of learning [15]. Meta-analyses of intervention studies show that developmentally appropriate programs can enhance cognitive abilities [16].",
  practical_takeaways: "Effective approaches to supporting cognitive development include: providing rich learning environments, engaging in interactive activities, and using developmentally appropriate teaching methods. Research emphasizes the importance of individual differences and the role of social interaction in cognitive growth."
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

// Helper function to get example article for category
function getExampleArticle(category) {
  switch (category) {
    case 'psychology':
      return examplePsychologyArticle;
    case 'neurodiversity':
      return exampleArticle;
    default:
      return exampleArticle; // Default to neurodiversity example
  }
}

// Helper function to generate GPT prompt based on category
function generatePrompt(topic, category) {
  const exampleArticle = getExampleArticle(category);
  const schema = getSchemaForCategory(category);
  
  // Get required fields for the category
  const requiredFields = Object.entries(schema.shape)
    .filter(([_, field]) => !field.isOptional())
    .map(([name]) => name);

  const basePrompt = `Generate a comprehensive, evidence-based article about "${topic}" in the ${category} category.

# Writing Guidelines

## Summary Requirements
- Start with a clear, direct definition of the topic
- Focus on what the condition/topic IS, not what the article will cover
- Avoid phrases like "This article explores..." or "We discuss..."
- Keep it concise (2-3 sentences maximum)
- Use active voice and present tense
- Example good summary: "Obsessive-Compulsive Disorder (OCD) is a mental health condition characterized by persistent, unwanted thoughts (obsessions) and repetitive behaviors (compulsions). It affects approximately 1-2% of the population and can significantly impact daily functioning and quality of life."

## Tone and Style
- Write in clear, accessible language that a general audience can understand
- Explain complex concepts using everyday examples and analogies
- Avoid jargon - if technical terms are necessary, explain them in simple terms
- Maintain scientific accuracy while being conversational and engaging
- Use active voice and shorter sentences for better readability
- Include in-text citations using Vancouver style (numerical references)
- Back claims with high-quality evidence (meta-analyses, systematic reviews, or reputable studies)

## Content Requirements
- Break down complex ideas into digestible chunks
- Use real-world examples to illustrate key points
- Include practical tips and actionable advice
- Address common misconceptions in simple terms
- Provide comprehensive references
- Ensure all required fields contain meaningful content
- Write as if explaining to a friend who's interested in mental health but not a professional

## Required Fields for ${category} Articles
The following fields are REQUIRED and must be included:
${requiredFields.map(field => `- ${field}`).join('\n')}

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
${JSON.stringify(schema.shape, null, 2)}

# Example Output
Here's an example of a well-structured article in the ${category} category:
${JSON.stringify(exampleArticle, null, 2)}

# Important Notes
1. Follow the exact schema structure
2. Use snake_case for all field names
3. Include ALL required fields listed above
4. Include numerical citations in square brackets [1]
5. Provide detailed references at the end
6. Ensure all text fields are comprehensive and well-supported
7. Write in clear, accessible language while maintaining scientific accuracy
8. ALL text fields must be strings, not arrays
9. Combine multiple points into cohesive paragraphs
10. Use everyday examples and analogies to explain complex concepts
11. Avoid unnecessary jargon - explain technical terms when used
12. Write in a conversational, engaging style that's easy to understand`;

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

// Helper function to nest content fields under content_blocks
function nestContentBlocks(article) {
  // List of fields that should go inside content_blocks
  const contentFields = [
    'overview',
    'prevalence',
    'causes_and_mechanisms',
    'symptoms_and_impact',
    'evidence_summary',
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
    'practical_applications',
    'risks_and_limitations',
    'future_directions',
    'references_and_resources'
  ];
  const content_blocks = {};
  const topLevel = {};
  for (const key in article) {
    if (contentFields.includes(key)) {
      content_blocks[key] = article[key];
    } else {
      topLevel[key] = article[key];
    }
  }
  topLevel.content_blocks = content_blocks;
  return topLevel;
}

// Main article generation function
async function generateArticle(topic, category, model) {
  console.log(chalk.blue(`\nGenerating article about "${topic}" in category "${category}"...`));

  // Get the correct schema for the category
  const schema = getSchemaForCategory(category);
  const requiredFields = Object.entries(schema.shape)
    .filter(([_, field]) => !field.isOptional())
    .map(([name]) => name);

  // Get category-specific instructions
  const categorySpecificPrompt = getCategorySpecificInstructions(category);

  // Get section order based on category
  let sectionOrder = '';
  if (category === 'neurodiversity') {
    sectionOrder = `
      Structure the article in this order:
      1. Introduction (overview)
      2. Neurodiversity Perspective (required)
      3. Common Strengths and Challenges (required)
      4. Prevalence and Demographics (required)
      5. Mechanisms and Understanding (required)
      6. Evidence Summary
      7. Common Misconceptions (required)
      8. Practical Takeaways
      9. Lived Experience (required)
      10. References and Resources (required)
    `;
  } else if (category === 'mental_health') {
    sectionOrder = `
      Structure the article in this order:
      1. Introduction (overview)
      2. Evidence Summary
      3. Practical Takeaways
      4. References and Resources (required)
    `;
  } else if (category === 'interventions') {
    sectionOrder = `
      Structure the article in this order:
      1. Introduction (overview)
      2. Evidence Summary
      3. Practical Takeaways
      4. Future Directions
      5. References and Resources (required)
    `;
  }

  const prompt = `Generate a comprehensive article about ${topic} in the context of ${category}. 
    ${categorySpecificPrompt}
    ${sectionOrder}
    
    The article should be informative, evidence-based, and accessible to a general audience.
    Include practical takeaways and key evidence from research.

    # Writing Guidelines
    ## Summary Requirements
    - Start with a clear, direct definition of the topic
    - Focus on what the condition/topic IS, not what the article will cover
    - Avoid phrases like "This article explores..." or "We discuss..."
    - Keep it concise (2-3 sentences maximum)
    - Use active voice and present tense
    - Include key prevalence or impact information if relevant

    Format the response as a JSON object with the following structure:
    {
      "title": "string",
      "slug": "string (URL-friendly version of the title)",
      "summary": "string (2-3 sentences, direct definition only)",
      "category": "${category}",
      "tags": ["string", "string", "string"] (array of relevant tags, e.g. ["mental health", "psychosis", "treatment"]),
      "future_directions": "string (emerging research and future developments)",
      "key_evidence": "string (key research findings and evidence)",
      "references_and_resources": "string (list of key references, resources, and further reading)",
      ${requiredFields.filter(field => !['tags', 'future_directions', 'key_evidence', 'references_and_resources'].includes(field)).map(field => `"${field}": "string"`).join(',\n      ')}
    }
    
    Ensure the content is well-structured with clear headings and subheadings in markdown format.
    The content should be comprehensive but accessible, using clear language and explaining any technical terms.
    Include relevant statistics and research findings where appropriate.
    IMPORTANT: 
    1. The category field must be set to "${category}" exactly as provided.
    2. All fields listed above are required and must be included.
    3. The tags field MUST be an array of strings, not a single string.
    4. All text fields must be strings, not arrays.
    5. The summary must be a direct definition, not a description of what the article covers.
    6. Follow the section order exactly as specified above.
    7. For neurodiversity articles, these fields are REQUIRED:
       - neurodiversity_perspective
       - common_strengths_and_challenges
       - prevalence_and_demographics
       - mechanisms_and_understanding
       - common_misconceptions
       - lived_experience
    8. These base fields are ALWAYS required:
       - future_directions
       - key_evidence
       - references_and_resources`;

  try {
    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content: `You are a mental health content expert. Generate well-researched, accurate, and empathetic content about mental health topics. 
            Always include all required fields in your response exactly as specified in the schema. 
            Ensure the content is comprehensive and evidence-based.
            For summaries, always start with a direct definition of the topic, avoiding phrases like "This article explores..." or "We discuss...".
            Focus on what the condition/topic IS, not what the article will cover.
            For ${category} articles, make sure to include all required fields: ${requiredFields.join(', ')}.
            IMPORTANT: 
            1. The tags field must be an array of strings, not a single string. Example: ["mental health", "psychosis", "treatment"]
            2. Always include future_directions, key_evidence, and references_and_resources fields
            3. For neurodiversity articles, include all neurodiversity-specific fields
            4. For mental health articles, always include references_and_resources with key references and further reading`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0].message.content;
    console.log(chalk.yellow('\nDebug: Raw GPT response:'));
    console.log(chalk.yellow(content.substring(0, 200) + '...')); // Log first 200 chars

    let article = JSON.parse(content);

    // Process the article to handle any array responses
    article = processArticleResponse(article);

    // Ensure tags is an array
    if (article.tags && typeof article.tags === 'string') {
      article.tags = article.tags.split(',').map(tag => tag.trim());
    } else if (!Array.isArray(article.tags)) {
      article.tags = [];
    }

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

    // Nest content fields under content_blocks
    const dbReadyArticle = nestContentBlocks(article);

    return dbReadyArticle;
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

    const filePath = path.join(__dirname, '..', options.output);

    // Only clear the file if --no-clear is not set
    if (options.clear !== false) {
      await fs.writeFile(filePath, '[]');
      console.log(chalk.blue('\nCleared existing articles from output file.'));
    }

    // Generate the article
    const article = await generateArticle(options.topic, options.category, options.model);
    
    // Set status to published by default
    article.status = 'published';
    
    // Read existing articles
    let articles = [];
    try {
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