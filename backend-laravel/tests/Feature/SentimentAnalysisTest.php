<?php

namespace Tests\Feature;

use App\Jobs\AnalyzeSentimentJob;
use App\Models\Message;
use App\Models\Ticket;
use App\Services\AiServiceClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SentimentAnalysisTest extends TestCase
{
    use RefreshDatabase;

    public function test_analyze_sentiment_job_saves_label_and_score_on_message(): void
    {
        Http::fake([
            '*/sentiment' => Http::response(['label' => 'negative', 'score' => 0.87]),
        ]);

        $ticket = Ticket::create([
            'visitor_id' => 'visitor-1',
            'status' => 'open',
            'priority' => 'normal',
        ]);

        $message = Message::create([
            'ticket_id' => $ticket->id,
            'sender' => 'customer',
            'body' => 'This is unacceptable, fix it now.',
        ]);

        AnalyzeSentimentJob::dispatch($message);

        $message->refresh();

        $this->assertSame('negative', $message->sentiment_label);
        $this->assertEquals(0.87, $message->sentiment_score);
    }

    public function test_ticket_sentiment_summary_rolls_up_to_negative_when_any_message_is_negative(): void
    {
        Http::fake(function (Request $request) {
            $text = $request->data()['text'] ?? '';

            return Http::response([
                'label' => $text === 'NEGATIVE_TEXT' ? 'negative' : 'positive',
                'score' => 0.8,
            ]);
        });

        $ticket = Ticket::create([
            'visitor_id' => 'visitor-2',
            'status' => 'open',
            'priority' => 'normal',
        ]);

        $positiveMessage = Message::create([
            'ticket_id' => $ticket->id,
            'sender' => 'customer',
            'body' => 'POSITIVE_TEXT',
        ]);

        $negativeMessage = Message::create([
            'ticket_id' => $ticket->id,
            'sender' => 'customer',
            'body' => 'NEGATIVE_TEXT',
        ]);

        AnalyzeSentimentJob::dispatch($positiveMessage);
        AnalyzeSentimentJob::dispatch($negativeMessage);

        $this->assertSame('negative', $ticket->refresh()->sentiment_summary);
    }

    public function test_ticket_sentiment_summary_is_not_negative_when_no_message_is_negative(): void
    {
        Http::fake(function (Request $request) {
            $text = $request->data()['text'] ?? '';

            return Http::response([
                'label' => $text === 'NEUTRAL_TEXT' ? 'neutral' : 'positive',
                'score' => 0.6,
            ]);
        });

        $ticket = Ticket::create([
            'visitor_id' => 'visitor-3',
            'status' => 'open',
            'priority' => 'normal',
        ]);

        $positiveMessage = Message::create([
            'ticket_id' => $ticket->id,
            'sender' => 'customer',
            'body' => 'POSITIVE_TEXT',
        ]);

        $neutralMessage = Message::create([
            'ticket_id' => $ticket->id,
            'sender' => 'customer',
            'body' => 'NEUTRAL_TEXT',
        ]);

        AnalyzeSentimentJob::dispatch($positiveMessage);
        AnalyzeSentimentJob::dispatch($neutralMessage);

        $this->assertNotSame('negative', $ticket->refresh()->sentiment_summary);
    }

    public function test_ai_service_client_sentiment_falls_back_to_neutral_on_non_2xx_response(): void
    {
        Http::fake([
            '*/sentiment' => Http::response(['error' => 'internal error'], 500),
        ]);

        $result = app(AiServiceClient::class)->sentiment('some text');

        $this->assertSame(['label' => 'neutral', 'score' => 0.5], $result);
    }

    public function test_ai_service_client_sentiment_falls_back_to_neutral_on_connection_failure(): void
    {
        Http::fake(function () {
            throw new ConnectionException('Could not connect to AI service');
        });

        $result = app(AiServiceClient::class)->sentiment('some text');

        $this->assertSame(['label' => 'neutral', 'score' => 0.5], $result);
    }
}
