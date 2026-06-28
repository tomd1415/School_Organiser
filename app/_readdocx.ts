import { readFileSync } from 'node:fs';
import { docxText } from './src/services/resourceImport';
console.log(docxText(readFileSync(process.argv[2])));
