import { migrationService } from '../src/routes/search/migration.service';

// 기존 데이터 ES 색인용
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
