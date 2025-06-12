import { spawn } from 'child_process';
import { program } from 'commander';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs/promises';

program
  .name('generate-multiple')
  .description('Generate multiple articles in sequence')
  .version('1.0.0')
  .requiredOption('-t, --topics <string>', 'Comma-separated list of topics')
  .requiredOption('-c, --category <string>', 'Category for all articles')
  .option('-m, --model <string>', 'GPT model to use', 'gpt-4-turbo-preview')
  .option('-d, --delay <number>', 'Delay between articles in seconds', '5')
  .parse(process.argv);

const options = program.opts();

// Split topics into array and trim whitespace
const topics = options.topics.split(',').map(t => t.trim());

async function generateMultipleArticles(topics, category, model) {
  console.log(chalk.blue(`\nGenerating ${topics.length} articles in the ${category} category...`));
  console.log(chalk.blue('Topics:', topics.join(', '), '\n'));

  // Clear the output file first
  const filePath = path.join(__dirname, '..', 'articles-data.json');
  await fs.writeFile(filePath, '[]');
  console.log(chalk.blue('Cleared existing articles from output file.'));

  let successCount = 0;
  for (const topic of topics) {
    try {
      console.log(chalk.yellow(`\nGenerating article about "${topic}"...`));
      
      // Run the generate-article script for each topic
      const { execSync } = await import('child_process');
      execSync(`node src/generate-article.js --topic "${topic}" --category "${category}" --model "${model}"`, { stdio: 'inherit' });
      
      successCount++;
      
      // Add a delay between articles to avoid rate limits
      if (topic !== topics[topics.length - 1]) {
        console.log(chalk.blue('\nWaiting 5 seconds before next article...'));
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (error) {
      console.error(chalk.red(`\nError generating article about "${topic}":`), error.message);
    }
  }

  console.log(chalk.green('\nGeneration complete:'));
  console.log(chalk.green(`✅ Successfully generated: ${successCount} articles`));
}

// Run the script
generateMultipleArticles(topics, options.category, options.model).catch(console.error); 