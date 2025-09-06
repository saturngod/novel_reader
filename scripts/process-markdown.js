import fs from 'fs';
import path from 'path';
import { marked } from 'marked';

// Get command line arguments
const args = process.argv.slice(2);
const sourceDir = args[0];
const targetDir = args[1];

if (!sourceDir || !targetDir) {
  console.error('Usage: node process-markdown.js <sourceDir> <targetDir>');
  process.exit(1);
}

// Ensure target directory exists
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Read all .md files from source directory that match the pattern ###_mm.md
const files = fs.readdirSync(sourceDir).filter(file => {
  return path.extname(file) === '.md' && /^\d{3}_mm\.md$/.test(file);
});

// Sort files numerically by filename
files.sort((a, b) => {
  const numA = parseInt(a.replace(/\D/g, ''), 10);
  const numB = parseInt(b.replace(/\D/g, ''), 10);
  return numA - numB;
});

// Array to hold chapter metadata
const chapters = [];

// Process each file
files.forEach(file => {
  const filePath = path.join(sourceDir, file);
  const fileContent = fs.readFileSync(filePath, 'utf-8');

  // Extract chapter number from filename
  const chapterNumber = parseInt(file.replace(/\D/g, ''), 10);

  // Extract chapter title from the first line (starts with #)
  const lines = fileContent.split('\n');
  let chapterTitle = `Chapter ${chapterNumber}`;
  let subTitle = '';
  if (lines.length > 0) {
    // Try to extract title from the first line
    const titleLine = lines[0];
    if (titleLine.startsWith('# ')) {
      chapterTitle = titleLine.replace('# ', '').trim();
    }
    let subTitleLine = lines[1];
    if (subTitleLine == "") {
      subTitleLine = lines[2];
    }

    if (subTitleLine.startsWith('## ')) {
      subTitle = subTitleLine.replace('## ', '').trim();
    }

  }

  // Convert markdown to HTML
  const htmlContent = marked(fileContent);

  // Create output filename
  const outputFileName = `chapter-${chapterNumber}.html`;
  const outputPath = path.join(targetDir, outputFileName);

  // Write HTML file
  fs.writeFileSync(outputPath, htmlContent);

  // Add chapter metadata
  chapters.push({
    chapterTitle,
    subTitle,
    path: `content/${outputFileName}`
  });

  console.log(`Processed ${file} -> ${outputPath}`);
});

// Write toc.json
const tocPath = path.join(path.dirname(targetDir), 'toc.json');
fs.writeFileSync(tocPath, JSON.stringify(chapters, null, 2));

console.log(`Generated ${tocPath} with ${chapters.length} chapters`);