// Script to parse Excel budget file and analyze structure
// Run with: node parse-budget-excel.js

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const excelFile = path.join(__dirname, 'Budget fY 26.xlsx');

if (!fs.existsSync(excelFile)) {
  console.error(`File not found: ${excelFile}`);
  process.exit(1);
}

console.log('Reading Excel file...');
const workbook = XLSX.readFile(excelFile);

console.log('\n=== WORKBOOK STRUCTURE ===');
console.log('Sheet names:', workbook.SheetNames);
console.log('Number of sheets:', workbook.SheetNames.length);

// Analyze each sheet
workbook.SheetNames.forEach((sheetName, index) => {
  console.log(`\n--- Sheet ${index + 1}: "${sheetName}" ---`);
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1, 
    defval: '',
    raw: false 
  });
  
  console.log(`Rows: ${data.length}`);
  console.log(`Columns (first row): ${data[0] ? data[0].length : 0}`);
  
  // Show first 10 rows
  console.log('\nFirst 10 rows:');
  data.slice(0, 10).forEach((row, i) => {
    console.log(`Row ${i + 1}:`, JSON.stringify(row.slice(0, 10)));
  });
  
  // Try to detect structure
  if (data.length > 0) {
    const headers = data[0];
    console.log('\nDetected headers:', headers.filter(h => h && h.toString().trim()));
  }
});

// Convert to JSON for easier analysis
const jsonOutput = {};
workbook.SheetNames.forEach(sheetName => {
  const worksheet = workbook.Sheets[sheetName];
  jsonOutput[sheetName] = XLSX.utils.sheet_to_json(worksheet, { 
    defval: null,
    raw: false 
  });
});

// Save JSON output
const jsonFile = path.join(__dirname, 'budget-data-analysis.json');
fs.writeFileSync(jsonFile, JSON.stringify(jsonOutput, null, 2));
console.log(`\n✅ Full data saved to: ${jsonFile}`);

// Try to identify budget structure
console.log('\n=== STRUCTURE ANALYSIS ===');
const firstSheet = workbook.SheetNames[0];
const firstSheetData = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { 
  defval: null,
  raw: false 
});

if (firstSheetData.length > 0) {
  console.log('\nSample record from first sheet:');
  console.log(JSON.stringify(firstSheetData[0], null, 2));
  
  console.log('\nAll column names:');
  Object.keys(firstSheetData[0] || {}).forEach(key => {
    console.log(`  - ${key}`);
  });
}

console.log('\n✅ Analysis complete!');

