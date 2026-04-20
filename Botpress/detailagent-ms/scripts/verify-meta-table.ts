import { client } from '@botpress/runtime';

async function main() {
  try {
    const res = await client.findTableRows({
      table: 'productMetaTable',
      limit: 1,
    });
    console.log(`✓ productMetaTable exists. Rows: ${res.rows.length}`);
  } catch (e) {
    console.error('❌ Table check fail:', (e as Error).message);
  }
}

main();
