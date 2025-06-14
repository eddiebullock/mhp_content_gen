# Mental Health & Psychology Content Generator

A proprietary CLI tool for generating structured article content about mental health, psychology, neuroscience, and related topics using GPT-4.

## License

This software is proprietary and confidential. All rights are reserved by Eddie Bullock.

Copyright (c) 2024 Eddie Bullock. All Rights Reserved.

No part of this software, including but not limited to the source code, documentation, 
specifications, and design, may be reproduced, distributed, or transmitted in any form 
or by any means without the prior written permission of the copyright holder.

## Features

- Generate structured article content in JSON format
- Supports multiple article categories (mental health, neuroscience, psychology, etc.)
- Validates generated content against a strict schema
- Easy integration with Supabase for content storage
- Command-line interface for easy use
- Generate multiple articles in sequence
- Bulk upload to database

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

Generate a single article:
```bash
npm start -- --topic "Anxiety Disorders" --category "mental_health" --model "gpt-4o-mini"
```

Generate multiple articles:
```bash
npm run generate-multiple -- -t "Anxiety Disorders,Depression,OCD" -c "mental_health" -m "gpt-4o-mini"
```

Update specific sections of existing articles:
```bash
# Update summaries of the last 10 articles
npm run update-content -- -s summary -c 10

# Update overviews of the last 5 articles
npm run update-content -- -s overview -c 5

# Update practical takeaways of the last 3 articles
npm run update-content -- -s practical_takeaways -c 3
```

Upload articles to database:
```bash
npm run bulk-upload
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

## Support

For licensing inquiries or support, please contact the copyright holder.


