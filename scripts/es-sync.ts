import { migrationService } from '../src/routes/search/migration.service';

async function syncAllDataToES() {
  try {
    await migrationService.syncAllToES();
    console.log(
      'Data synchronization to Elasticsearch completed successfully.'
    );
  } catch (error) {
    console.error('Error during data synchronization to Elasticsearch:', error);
  }
}

syncAllDataToES();
