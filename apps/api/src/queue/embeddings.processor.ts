import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('embeddings')
export class EmbeddingsProcessor extends WorkerHost {
  // Un seul handler pour tous les noms de jobs de cette queue
  async process(job: Job): Promise<any> {
    if (job.name === 'generate') {
      const { profileId } = job.data as { profileId: string };
      // TODO: construire profile_text, appel provider embedding, update DB
      // Pour l’instant, on simule un travail:
      await new Promise((r) => setTimeout(r, 200));
      return { ok: true, profileId };
    }
    return { ignored: job.name };
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job, result: unknown) {
    // eslint-disable-next-line no-console
    console.log(`[embeddings] completed #${job.id}`, result);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, err: Error) {
    // eslint-disable-next-line no-console
    console.error(`[embeddings] failed #${job?.id}`, err.message);
  }
}
