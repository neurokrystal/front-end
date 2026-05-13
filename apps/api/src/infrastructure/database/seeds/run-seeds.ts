import { seedInstrument } from './sample-instrument.seed';
import { seedCmsContent } from './sample-cms-content.seed';
import { seedTemplate } from './sample-template.seed';
import { seedUsers } from './sample-users.seed';
import { seedDemoEcosystem } from './demo-ecosystem.seed';

async function runSeeds() {
  try {
    await seedInstrument();
    await seedCmsContent();
    await seedTemplate();
    await seedUsers();
    await seedDemoEcosystem();
    console.log('All seeds completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error running seeds:', error);
    process.exit(1);
  }
}

runSeeds();
