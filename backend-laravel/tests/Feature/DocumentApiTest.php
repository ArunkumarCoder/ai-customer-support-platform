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

    public function test_admin_can_list_documents_with_uploader_included(): void
    {
        $admin = $this->makeAgent('admin');

        Document::create([
            'title' => 'Refund Policy',
            'source_file' => 'documents/refund.txt',
            'content' => 'Refunds are issued within 5-7 business days.',
            'uploaded_by' => $admin->id,
        ]);

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/documents');

        $response->assertStatus(200);
        $response->assertJsonFragment(['title' => 'Refund Policy']);
        $response->assertJsonPath('0.uploader.email', $admin->email);
        // content is deliberately hidden from the listing (see Document::$hidden)
        // — a table of many documents shouldn't ship every one's full text.
        $response->assertJsonMissingPath('0.content');
    }

    public function test_non_admin_agent_is_forbidden_from_listing_documents(): void
    {
        $agent = $this->makeAgent('agent');

        $response = $this->actingAs($agent, 'sanctum')->getJson('/api/documents');

        $response->assertStatus(403);
    }

    public function test_unauthenticated_request_to_list_documents_returns_401(): void
    {
        $response = $this->getJson('/api/documents');

        $response->assertStatus(401);
    }

    public function test_admin_can_view_document_content(): void
    {
        Storage::fake('local');
        Storage::disk('local')->put('documents/refund.txt', 'Refunds are issued within 5-7 business days.');

        $admin = $this->makeAgent('admin');

        $document = Document::create([
            'title' => 'Refund Policy',
            'source_file' => 'documents/refund.txt',
            'uploaded_by' => $admin->id,
        ]);

        $response = $this->actingAs($admin, 'sanctum')->getJson("/api/documents/{$document->id}");

        $response->assertStatus(200);
        $response->assertJsonPath('title', 'Refund Policy');
        $response->assertJsonPath('content_available', true);
        $response->assertJsonPath('content', 'Refunds are issued within 5-7 business days.');
        $response->assertJsonPath('uploader.email', $admin->email);
    }

    public function test_viewing_document_with_missing_file_returns_content_unavailable(): void
    {
        Storage::fake('local');

        $admin = $this->makeAgent('admin');

        $document = Document::create([
            'title' => 'Refund Policy',
            'source_file' => 'documents/does-not-exist.txt',
            'uploaded_by' => $admin->id,
        ]);

        $response = $this->actingAs($admin, 'sanctum')->getJson("/api/documents/{$document->id}");

        $response->assertStatus(200);
        $response->assertJsonPath('content_available', false);
        $response->assertJsonPath('content', null);
    }

    public function test_uploaded_document_content_is_persisted_to_database(): void
    {
        Storage::fake('local');
        Queue::fake();
        Http::fake();

        $admin = $this->makeAgent('admin');
        $file = UploadedFile::fake()->createWithContent('policy.txt', 'Refunds are issued within 5-7 business days.');

        $this->actingAs($admin, 'sanctum')->postJson('/api/documents', [
            'title' => 'Refund Policy',
            'file' => $file,
        ])->assertStatus(201);

        $this->assertDatabaseHas('documents', [
            'title' => 'Refund Policy',
            'content' => 'Refunds are issued within 5-7 business days.',
        ]);
    }

    public function test_document_view_works_even_when_disk_file_is_missing(): void
    {
        Storage::fake('local');

        $admin = $this->makeAgent('admin');

        // Simulates the real-world case this column exists to fix: the
        // free-tier host's disk was wiped by a redeploy after upload, so
        // no file exists at source_file — content only lives in the DB.
        $document = Document::create([
            'title' => 'Refund Policy',
            'source_file' => 'documents/refund.txt',
            'content' => 'Refunds are issued within 5-7 business days.',
            'uploaded_by' => $admin->id,
        ]);

        $response = $this->actingAs($admin, 'sanctum')->getJson("/api/documents/{$document->id}");

        $response->assertStatus(200);
        $response->assertJsonPath('content_available', true);
        $response->assertJsonPath('content', 'Refunds are issued within 5-7 business days.');
    }

    public function test_viewing_nonexistent_document_returns_404(): void
    {
        $admin = $this->makeAgent('admin');

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/documents/999');

        $response->assertStatus(404);
    }

    public function test_non_admin_agent_is_forbidden_from_viewing_document(): void
    {
        Storage::fake('local');

        $admin = $this->makeAgent('admin');
        $agent = $this->makeAgent('agent');

        $document = Document::create([
            'title' => 'Refund Policy',
            'source_file' => 'documents/refund.txt',
            'uploaded_by' => $admin->id,
        ]);

        $response = $this->actingAs($agent, 'sanctum')->getJson("/api/documents/{$document->id}");

        $response->assertStatus(403);
    }

    public function test_upload_is_rejected_when_uploads_are_disabled(): void
    {
        config(['services.documents.uploads_enabled' => false]);

        Storage::fake('local');
        Queue::fake();
        Http::fake();

        $admin = $this->makeAgent('admin');
        $file = UploadedFile::fake()->create('policy.txt', 10, 'text/plain');

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/documents', [
            'title' => 'Refund Policy',
            'file' => $file,
        ]);

        $response->assertStatus(403);
        $response->assertJsonPath('message', 'Document uploads are temporarily disabled.');

        Queue::assertNothingPushed();
        $this->assertDatabaseCount('documents', 0);
    }
}
