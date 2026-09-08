<?php

namespace Tests\Feature;

use App\Jobs\IngestDocumentJob;
use App\Models\Agent;
use App\Models\Document;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DocumentApiTest extends TestCase
{
    use RefreshDatabase;

    private function makeAgent(string $role): Agent
    {
        return Agent::create([
            'name' => ucfirst($role),
            'email' => "{$role}@example.com",
            'password' => Hash::make('password'),
            'role' => $role,
        ]);
    }

    public function test_admin_can_upload_document_and_ingest_job_is_dispatched(): void
    {
        Storage::fake('local');
        Queue::fake();
        Http::fake();

        $admin = $this->makeAgent('admin');

        $file = UploadedFile::fake()->create('policy.txt', 10, 'text/plain');

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/documents', [
            'title' => 'Refund Policy',
            'file' => $file,
        ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('documents', [
            'title' => 'Refund Policy',
            'uploaded_by' => $admin->id,
        ]);

        $document = Document::firstWhere('title', 'Refund Policy');

        Queue::assertPushed(IngestDocumentJob::class, function ($job) use ($document) {
            return $job->document->id === $document->id;
        });
    }

    public function test_non_admin_agent_is_forbidden_from_uploading_document(): void
    {
        Storage::fake('local');
        Queue::fake();
        Http::fake();

        $agent = $this->makeAgent('agent');

        $file = UploadedFile::fake()->create('policy.txt', 10, 'text/plain');

        $response = $this->actingAs($agent, 'sanctum')->postJson('/api/documents', [
            'title' => 'Refund Policy',
            'file' => $file,
        ]);

        $response->assertStatus(403);

        Queue::assertNothingPushed();
        $this->assertDatabaseCount('documents', 0);
    }

    public function test_document_upload_with_missing_title_returns_422(): void
    {
        Storage::fake('local');
        Queue::fake();
        Http::fake();

        $admin = $this->makeAgent('admin');
        $file = UploadedFile::fake()->create('policy.txt', 10, 'text/plain');

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/documents', [
            'file' => $file,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['title']);
        Queue::assertNothingPushed();
    }

    public function test_document_upload_with_disallowed_file_type_returns_422(): void
    {
        Storage::fake('local');
        Queue::fake();
        Http::fake();

        $admin = $this->makeAgent('admin');
        $file = UploadedFile::fake()->create('malware.exe', 10, 'application/octet-stream');

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/documents', [
            'title' => 'Refund Policy',
            'file' => $file,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['file']);
        Queue::assertNothingPushed();
    }

    public function test_unauthenticated_request_to_upload_document_returns_401(): void
    {
        Storage::fake('local');
        Queue::fake();
        Http::fake();

        $file = UploadedFile::fake()->create('policy.txt', 10, 'text/plain');

        $response = $this->postJson('/api/documents', [
            'title' => 'Refund Policy',
            'file' => $file,
        ]);

        $response->assertStatus(401);

        Queue::assertNothingPushed();
        $this->assertDatabaseCount('documents', 0);
    }
}
