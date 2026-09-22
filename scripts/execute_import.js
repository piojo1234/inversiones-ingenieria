const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Ensure env vars are loaded
const envPath = fs.existsSync('.env.local') ? '.env.local' : '.env';
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    envVars[match[1]] = value;
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function chunkUpsert(tableName, items, chunkSize = 400) {
  console.log(`Upserting ${items.length} records into [${tableName}] in chunks of ${chunkSize}...`);
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const { error } = await supabase.from(tableName).upsert(chunk, { onConflict: 'id' });
    if (error) {
      console.error(`Error upserting into ${tableName} at index ${i}:`, error);
      throw error;
    }
    process.stdout.write(`  Upserted ${Math.min(i + chunkSize, items.length)} / ${items.length} into ${tableName}\r`);
  }
  console.log(`\nDone upserting [${tableName}]!`);
}

async function run() {
  console.log("=== STARTING IMPORT TO SANTA ISABEL ===");
  const payloadPath = path.join(__dirname, '..', 'scratch', 'santa_isabel_payload.json');
  if (!fs.existsSync(payloadPath)) {
    console.error("Payload file not found at:", payloadPath);
    process.exit(1);
  }

  const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf-8'));
  console.log(`Loaded payload from ${payloadPath}:`);
  console.log(`  - Inmuebles: ${payload.inmuebles.length}`);
  console.log(`  - Clientes: ${payload.clientes.length}`);
  console.log(`  - Contratos: ${payload.contratos.length}`);
  console.log(`  - Contratantes: ${payload.contratantes_contrato.length}`);
  console.log(`  - Plan Pagos: ${payload.plan_pagos.length}`);
  console.log(`  - Pagos Bitacora: ${payload.pagos_bitacora.length}`);

  // Step 1: Clean up demo records for Santa Isabel
  console.log("\n--- Step 1: Cleaning up Santa Isabel demo records ---");
  const demoContratoId = '8f984e93-a401-451f-b31f-40d0339c1f9a';
  const demoLotId = '00000000-0000-0000-0000-000000000332';

  const { data: demoCuotas } = await supabase.from('plan_pagos').select('id').eq('contrato_id', demoContratoId);
  if (demoCuotas && demoCuotas.length > 0) {
    const cuotaIds = demoCuotas.map(c => c.id);
    await supabase.from('pagos_bitacora').delete().in('plan_pagos_id', cuotaIds);
  }
  await supabase.from('plan_pagos').delete().eq('contrato_id', demoContratoId);
  await supabase.from('contratantes_contrato').delete().eq('contrato_id', demoContratoId);
  await supabase.from('gestion_cartera').delete().eq('contrato_id', demoContratoId);
  await supabase.from('contratos').delete().eq('id', demoContratoId);
  await supabase.from('inmuebles').delete().eq('id', demoLotId);
  console.log("Demo records cleaned up.");

  // Step 2: Upsert Inmuebles
  console.log("\n--- Step 2: Upserting Inmuebles ---");
  await chunkUpsert('inmuebles', payload.inmuebles, 200);

  // Step 3: Upsert Clientes
  console.log("\n--- Step 3: Upserting Clientes ---");
  await chunkUpsert('clientes', payload.clientes, 200);

  // Step 4: Upsert Contratos
  console.log("\n--- Step 4: Upserting Contratos ---");
  await chunkUpsert('contratos', payload.contratos, 200);

  // Step 5: Upsert Contratantes
  console.log("\n--- Step 5: Upserting Contratantes Contrato ---");
  await chunkUpsert('contratantes_contrato', payload.contratantes_contrato, 200);

  // Step 6: Upsert Plan Pagos
  console.log("\n--- Step 6: Upserting Plan de Pagos ---");
  await chunkUpsert('plan_pagos', payload.plan_pagos, 400);

  // Step 7: Upsert Pagos Bitacora
  console.log("\n--- Step 7: Upserting Pagos Bitacora ---");
  await chunkUpsert('pagos_bitacora', payload.pagos_bitacora, 400);

  // Step 8: Verify Final Database Counts
  console.log("\n--- Step 8: Verifying Database Counts ---");
  const { count: inmCount } = await supabase.from('inmuebles').select('*', { count: 'exact', head: true }).eq('proyecto_id', '00000000-0000-0000-0000-000000000101');
  const { count: cliCount } = await supabase.from('clientes').select('*', { count: 'exact', head: true });
  const { count: conCount } = await supabase.from('contratos').select('*', { count: 'exact', head: true }).eq('empresa_id', '00000000-0000-0000-0000-000000000001');
  const { count: planCount } = await supabase.from('plan_pagos').select('*', { count: 'exact', head: true });
  const { count: pagCount } = await supabase.from('pagos_bitacora').select('*', { count: 'exact', head: true });

  console.log("FINAL DATABASE COUNTS FOR SANTA ISABEL / INVERSIONES GC:");
  console.log(`  - Santa Isabel Inmuebles: ${inmCount} (Expected: 245)`);
  console.log(`  - Total Clientes: ${cliCount}`);
  console.log(`  - Santa Isabel Contratos: ${conCount} (Expected: 224)`);
  console.log(`  - Total Plan Pagos: ${planCount}`);
  console.log(`  - Total Pagos Bitacora: ${pagCount}`);

  console.log("\n=== IMPORT COMPLETED SUCCESSFULLY! ===");
}

run().catch(err => {
  console.error("FATAL ERROR DURING IMPORT:", err);
  process.exit(1);
});
