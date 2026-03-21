/**
 * PPT Benchmark CLI Runner
 *
 * Usage:
 *   npx tsx scripts/run-benchmark.ts <path-to-finaldeckplan.json>
 *   npx tsx scripts/run-benchmark.ts <path-to-finaldeckplan.json> --report
 *
 * Input: FinalDeckPlan JSON file
 * Output: StructuralBenchmarkResult (JSON to stdout, markdown report with --report)
 */

import * as fs from 'fs';
import * as path from 'path';
import { FinalDeckPlan } from '../src/lib/types';
import { runStructuralBenchmark } from '../src/lib/benchmark/scorer';
import { generateStructuralReport } from '../src/lib/benchmark/report';

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: npx tsx scripts/run-benchmark.ts <finaldeckplan.json> [--report]');
    console.error('');
    console.error('Options:');
    console.error('  --report    Output markdown report instead of JSON');
    console.error('  --save      Save result to benchmark-results/');
    process.exit(1);
  }

  const inputFile = args[0];
  const showReport = args.includes('--report');
  const saveResult = args.includes('--save');

  if (!fs.existsSync(inputFile)) {
    console.error(`File not found: ${inputFile}`);
    process.exit(1);
  }

  let plan: FinalDeckPlan;
  try {
    const raw = fs.readFileSync(inputFile, 'utf-8');
    plan = JSON.parse(raw) as FinalDeckPlan;
  } catch (err) {
    console.error(`Failed to parse JSON: ${err}`);
    process.exit(1);
  }

  // Validate basic structure
  if (!plan.slides || !plan.contentSpec || !plan.deckDesignPlan) {
    console.error('Invalid FinalDeckPlan: missing slides, contentSpec, or deckDesignPlan');
    process.exit(1);
  }

  const result = runStructuralBenchmark(plan);

  if (showReport) {
    console.log(generateStructuralReport(result));
  } else {
    console.log(JSON.stringify(result, null, 2));
  }

  if (saveResult) {
    const resultsDir = path.join(process.cwd(), 'benchmark-results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const caseName = path.basename(inputFile, '.json');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = path.join(resultsDir, `${caseName}-${timestamp}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
    console.error(`Result saved to: ${outputFile}`);
  }

  // Exit with non-zero if grade is D or F
  if (result.grade === 'D' || result.grade === 'F') {
    process.exit(2);
  }
}

main();
