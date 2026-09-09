<?php

namespace App\Jobs;

use App\Models\Message;
use App\Services\AiServiceClient;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class AnalyzeSentimentJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Number of times the job may be attempted before landing in failed_jobs.
     */
    public $tries = 3;

    /**
     * Max seconds a single attempt may run — comfortably above
     * AiServiceClient::sentiment()'s 15s HTTP timeout.
     */
    public $timeout = 30;

    public function __construct(public Message $message)
    {
    }

    public function handle(AiServiceClient $aiServiceClient): void
    {
        $result = $aiServiceClient->sentiment($this->message->body);

        $this->message->update([
            'sentiment_label' => $result['label'],
            'sentiment_score' => $result['score'],
        ]);

        $ticket = $this->message->ticket;

        $labels = $ticket->messages()
            ->where('sender', 'customer')
            ->whereNotNull('sentiment_label')
            ->pluck('sentiment_label');

        $summary = match (true) {
            $labels->contains('negative') => 'negative',
            $labels->contains('neutral') => 'neutral',
            default => 'positive',
        };

        if ($ticket->sentiment_summary !== $summary) {
            $ticket->update(['sentiment_summary' => $summary]);
        }
    }
}
