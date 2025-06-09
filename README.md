# Mental Health & Psychology Content Generator

A CLI tool for generating structured article content about mental health, psychology, neuroscience, and related topics using GPT-4.

## Features

- Generate structured article content in JSON format
- Supports multiple article categories (mental health, neuroscience, psychology, etc.)
- Validates generated content against a strict schema
- Easy integration with Supabase for content storage
- Command-line interface for easy use

## Setup

1. Clone the repository:
```bash
git clone https://github.com/eddiebullock/mhp_content_gen.git
cd mhp_content_gen
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with your API keys:
```
OPENAI_API_KEY=your_openai_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Usage

Generate a new article:
```bash
npm start -- --topic "Anxiety Disorders" --category "mental_health" --model "gpt-4o-mini"
```

Available categories:
- mental_health
- neuroscience
- psychology
- brain_health
- neurodiversity
- interventions
- lifestyle_factors
- lab_testing

## Output

The tool generates a JSON file (`articles-data.json`) that matches the required schema for the Supabase database. The generated content includes:

- Title and slug
- Summary and overview
- Category-specific content blocks
- Tags and metadata
- References and resources

## Validation

The tool includes built-in validation to ensure generated content matches the required schema. Run validation:

```bash
npm test
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 