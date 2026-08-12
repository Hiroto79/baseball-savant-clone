const Papa = require('papaparse');
const fs = require('fs');

const fileContent = fs.readFileSync('/Users/ento/baseball-savant/public/data/blast/Player 2312 - 2025-11-11 - 2025-11-11 - 1764042452.csv', 'utf8');

const lines = fileContent.split('\n');
let headerIndex = 0;
for (let i = 0; i < Math.min(lines.length, 20); i++) {
  const line = lines[i];
  if ((line.includes('Date') || line.includes('日付')) &&
      (line.includes('Bat Speed') || line.includes('スイング') || line.includes('バットスピード'))) {
    headerIndex = i;
    break;
  }
}

const csvText = lines.slice(headerIndex).join('\n');

Papa.parse(csvText, {
  header: true,
  dynamicTyping: true,
  skipEmptyLines: true,
  complete: (results) => {
    console.log("Headers found:", results.meta.fields);
    console.log("First row:", results.data[0]);
  }
});
