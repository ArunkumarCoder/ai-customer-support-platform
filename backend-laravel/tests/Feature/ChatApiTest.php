<?php

namespace Tests\Feature;

use App\Models\Ticket;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ChatApiTest extends TestCase
{
    use RefreshDatabase;

    private function fakeChatAndSentiment(string $reply, bool $escalate): void
    {
        Http::fake([
            '*/chat' => Http::response(['reply' => $reply, 'escalate' => $escalate]),
            '*/sentiment' => Http::response(['label' => 'neutral', 'score' => 0.5]),
        ]);
    }

    public function test_new_visitor_message_creates_ticket_and_message_and_is_not_escalated(): void
    {
        $this->fakeChatAndSentiment('Here is how to reset your password.', false);

        $response = $this->postJson('/api/chat', [
            'message' => 'How do I reset my password?',
            'visitor_id' => 'visitor-new-1',
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'reply' => 'Here is how to reset your password.',
            'escalated' => false,
        ]);

        $this->assertDatabaseCount('tickets', 1);

        $ticket = Ticket::first();
        $this->assertSame('open', $ticket->status);

        $this->assertDatabaseHas('messages', [
            'ticket_id' => $ticket->id,
            'sender' => 'customer',
            'body' => 'How do I reset my password?',
        ]);
        $this->assertDatabaseHas('messages', [
            'ticket_id' => $ticket->id,
            'sender' => 'bot',
            'body' => 'Here is how to reset your password.',
        ]);
    }

    public function test_second_message_from_same_visitor_reuses_existing_ticket(): void
    {
        $this->fakeChatAndSentiment('Sure, happy to help.', false);

        $this->postJson('/api/chat', [
            'message' => 'First message',
            'visitor_id' => 'visitor-repeat-1',
        ])->assertStatus(200);

        $this->postJson('/api/chat', [
            'message' => 'Second message',
            'visitor_id' => 'visitor-repeat-1',
        ])->assertStatus(200);

        $this->assertDatabaseCount('tickets', 1);

        $ticket = Ticket::first();
        $this->assertDatabaseHas('messages', [
            'ticket_id' => $ticket->id,
            'sender' => 'customer',
            'body' => 'First message',
        ]);
        $this->assertDatabaseHas('messages', [
            'ticket_id' => $ticket->id,
            'sender' => 'customer',
            'body' => 'Second message',
        ]);
    }

    public function test_escalate_true_response_flips_ticket_status_to_escalated(): void
    {
        $this->fakeChatAndSentiment("I'm not confident I can help with that.", true);

        $response = $this->postJson('/api/chat', [
            'message' => 'Something very obscure',
            'visitor_id' => 'visitor-escalate-1',
        ]);

        $response->assertStatus(200);
        $response->assertJson(['escalated' => true]);

        $ticket = Ticket::first();
        $this->assertSame('escalated', $ticket->status);
    }

    public function test_chat_request_missing_required_fields_returns_422(): void
    {
        Http::fake();

        $response = $this->postJson('/api/chat', []);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['message', 'visitor_id']);
    }

    public function test_chat_endpoint_is_rate_limited_after_exceeding_ten_requests_per_minute(): void
    {
        $this->fakeChatAndSentiment('Sure, happy to help.', false);

        for ($i = 0; $i < 10; $i++) {
            $this->postJson('/api/chat', [
                'message' => "Message {$i}",
                'visitor_id' => 'visitor-throttle-1',
            ])->assertStatus(200);
        }

        $this->postJson('/api/chat', [
            'message' => 'One too many',
            'visitor_id' => 'visitor-throttle-1',
        ])->assertStatus(429);
    }

    public function test_ai_service_connection_failure_falls_back_gracefully_and_escalates(): void
    {
        Http::fake([
            '*/chat' => function () {
                throw new ConnectionException('Could not connect to AI service');
            },
            '*/sentiment' => Http::response(['label' => 'neutral', 'score' => 0.5]),
        ]);

        $response = $this->postJson('/api/chat', [
            'message' => 'Are you there?',
            'visitor_id' => 'visitor-down-1',
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'reply' => "Sorry, I'm having trouble connecting right now. Please try again shortly.",
            'escalated' => true,
        ]);

        $ticket = Ticket::first();
        $this->assertSame('escalated', $ticket->status);
    }
}
