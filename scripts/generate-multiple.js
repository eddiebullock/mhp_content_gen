import { spawn } from 'child_process';
import { program } from 'commander';
import chalk from 'chalk';

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

console.log(chalk.blue(`\nGenerating ${topics.length} articles in the ${options.category} category...`));
console.log(chalk.blue('Topics:'), topics.join(', '));

async function generateArticle(topic) {
  return new Promise((resolve, reject) => {
    console.log(chalk.yellow(`\nGenerating article about "${topic}"...`));
    
    const args = [
      'start',
      '--',
      '--topic', topic,
      '--category', options.category,
      '--model', options.model
    ];

    const child = spawn('npm', args, { stdio: 'inherit' });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(chalk.green(`\n✅ Successfully generated article about "${topic}"`));
        resolve();
      } else {
        console.error(chalk.red(`\n❌ Failed to generate article about "${topic}"`));
        reject(new Error(`Process exited with code ${code}`));
      }
    });

    child.on('error', (err) => {
      console.error(chalk.red(`\n❌ Error generating article about "${topic}":`), err);
      reject(err);
    });
  });
}

async function generateAllArticles() {
  let success = 0;
  let failed = 0;

  for (const topic of topics) {
    try {
      await generateArticle(topic);
      success++;
      
      // Add delay between articles if not the last one
      if (topic !== topics[topics.length - 1]) {
        console.log(chalk.blue(`\nWaiting ${options.delay} seconds before next article...`));
        await new Promise(resolve => setTimeout(resolve, options.delay * 1000));
      }
    } catch (error) {
      failed++;
      console.error(chalk.red(`\nError processing "${topic}":`), error.message);
    }
  }

  console.log(chalk.blue('\nGeneration complete:'));
  console.log(chalk.green(`✅ Successfully generated: ${success} articles`));
  if (failed > 0) {
    console.log(chalk.red(`❌ Failed to generate: ${failed} articles`));
  }
}

// Run the script
generateAllArticles().catch(console.error); 