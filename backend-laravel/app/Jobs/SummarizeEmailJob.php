<?php

namespace App\Jobs;

use App\Models\Message;
use App\Models\Ticket;
use App\Services\AiServiceClient;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SummarizeEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Number of times the job may be attempted before landing in failed_jobs.
     */
    public $tries = 3;

    /**
     * Max seconds a single attempt may run — comfortably above
     * AiServiceClient::summarize()'s 15s HTTP timeout.
     */
    public $timeout = 30;

    public function __construct(public Ticket $ticket, public Message $message)
    {
    }

    public function handle(AiServiceClient $aiServiceClient): void
    {
        $summary = $aiServiceClient->summarize($this->message->body);

        $this->ticket->update(['summary' => $summary]);
    }
}
