<?php

namespace Tests\Feature;

use App\Models\Agent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    private function makeAgent(string $password = 'password'): Agent
    {
        return Agent::create([
            'name' => 'Jane Agent',
            'email' => 'jane@example.com',
            'password' => Hash::make($password),
            'role' => 'agent',
        ]);
    }

    public function test_login_with_correct_credentials_returns_token_and_agent_data(): void
    {
        $agent = $this->makeAgent('correct-password');

        $response = $this->postJson('/api/login', [
            'email' => 'jane@example.com',
            'password' => 'correct-password',
        ]);

        $response->assertStatus(200);
        $response->assertJsonStructure(['token', 'agent' => ['id', 'name', 'email', 'role']]);
        $response->assertJsonPath('agent.id', $agent->id);
        $response->assertJsonPath('agent.email', 'jane@example.com');
        $this->assertNotEmpty($response->json('token'));
    }

    public function test_login_with_wrong_password_returns_422_and_no_token(): void
    {
        $this->makeAgent('correct-password');

        $response = $this->postJson('/api/login', [
            'email' => 'jane@example.com',
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(422);
        $response->assertJsonMissingPath('token');
    }

    public function test_login_with_invalid_email_format_returns_422(): void
    {
        $response = $this->postJson('/api/login', [
            'email' => 'not-an-email',
            'password' => 'whatever',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['email']);
    }

    public function test_logout_invalidates_the_token(): void
    {
        $agent = $this->makeAgent();
        $token = $agent->createToken('dashboard-token')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/logout')
            ->assertStatus(200);

        // Sanctum's request guard caches its resolved user for the lifetime of the
        // guard instance, so a second request in the same test would otherwise see
        // the stale pre-logout user even though the token row is gone.
        Auth::forgetGuards();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/me')
            ->assertStatus(401);
    }

    public function test_protected_route_without_token_returns_401(): void
    {
        $this->getJson('/api/tickets')->assertStatus(401);
    }

    public function test_protected_route_with_valid_token_succeeds(): void
    {
        $agent = $this->makeAgent();
        $token = $agent->createToken('dashboard-token')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/tickets')
            ->assertStatus(200);
    }
}
