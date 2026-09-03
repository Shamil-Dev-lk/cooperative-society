const fs = require('fs');

const sqlPath = 'C:\\Users\\USER\\Desktop\\Shamil\\Co-op Members\\co-op members\\database.sql';
const content = fs.readFileSync(sqlPath, 'utf8');

const matches = content.match(/INSERT INTO `divisions`[\s\S]*?;/g);
if (matches) {
  console.log('Found INSERT INTO divisions:');
  console.log(matches[0]);
} else {
  console.log('No matches found.');
}
