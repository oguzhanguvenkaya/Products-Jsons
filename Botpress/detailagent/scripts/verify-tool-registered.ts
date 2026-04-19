import * as tools from '../src/tools';
console.log('Exported tools:');
for (const name of Object.keys(tools)) {
  console.log(`  - ${name}`);
}
