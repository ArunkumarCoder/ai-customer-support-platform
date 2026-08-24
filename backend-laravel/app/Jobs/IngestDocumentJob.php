<?php

namespace App\Jobs;

use App\Models\Document;
use App\Services\AiServiceClient;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

class IngestDocumentJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Create a new job instance.
     */
    public function __construct(public Document $document)
    {
        //
    }

    /**
     * Execute the job.
     */
    public function handle(AiServiceClient $aiServiceClient): void
    {
      $text = Storage::disk('local')->get($this->document->source_file);

      if (! $aiServiceClient->ingest($this->document->id, $text)) {
          throw new \RuntimeException("Ingest failed for document {$this->document->id}");
      }
    }
}
