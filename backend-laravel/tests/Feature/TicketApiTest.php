<?php

namespace Tests\Feature;

use App\Models\Agent;
use App\Models\Ticket;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class TicketApiTest extends TestCase
{
    use RefreshDatabase;

    /**
     * A basic feature test example.
     */
    public function test_example(): void
    {
        $response = $this->get('/');

        $response->assertStatus(200);
    }

    public function test_updating_ticket_with_invalid_status_returns_422(): void
    {
        $agent = Agent::create([
            'name' => 'Jane Agent',
            'email' => 'jane@example.com',
            'password' => Hash::make('password'),
            'role' => 'agent',
        ]);

        $ticket = Ticket::create([
            'visitor_id' => 'visitor-1',
            'status' => 'open',
            'priority' => 'normal',
        ]);

        $response = $this->actingAs($agent, 'sanctum')->putJson("/api/tickets/{$ticket->id}", [
            'status' => 'not-a-real-status',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['status']);
    }
}
