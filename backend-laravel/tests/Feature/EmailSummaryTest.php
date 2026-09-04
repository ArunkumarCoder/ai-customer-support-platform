<?php

namespace Tests\Feature;

use App\Jobs\SummarizeEmailJob;
use App\Models\Message;
use App\Models\Ticket;
use App\Services\AiServiceClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class EmailSummaryTest extends TestCase
{
    use RefreshDatabase;

    public function test_summarize_email_job_saves_summary_on_ticket(): void
    {
        Http::fake([
            '*/summarize' => Http::response(['summary' => 'Customer is asking for a refund on order #123.']),
        ]);

        $ticket = Ticket::create([
            'visitor_id' => 'customer@example.com',
            'status' => 'open',
            'priority' => 'normal',
        ]);

        $message = Message::create([
            'ticket_id' => $ticket->id,
            'sender' => 'customer',
            'body' => 'Subject: Refund request

I would like a refund for order #123, it never arrived.',
        ]);

        SummarizeEmailJob::dispatch($ticket, $message);

        $this->assertSame(
            'Customer is asking for a refund on order #123.',
            $ticket->refresh()->summary
        );
    }

    public function test_ai_service_client_summarize_falls_back_to_truncated_text_on_non_2xx_response(): void
    {
        Http::fake([
            '*/summarize' => Http::response(['error' => 'internal error'], 500),
        ]);

        $text = str_repeat('a', 300);

        $result = app(AiServiceClient::class)->summarize($text);

        $this->assertSame(Str::limit($text, 200), $result);
    }

    public function test_ai_service_client_summarize_falls_back_to_truncated_text_on_connection_failure(): void
    {
        Http::fake(function () {
            throw new ConnectionException('Could not connect to AI service');
        });

        $text = str_repeat('b', 300);

        $result = app(AiServiceClient::class)->summarize($text);

        $this->assertSame(Str::limit($text, 200), $result);
    }
}
