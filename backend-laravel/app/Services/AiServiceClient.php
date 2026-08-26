<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AiServiceClient
{
    public function chat(string $message): array
    {
      try {
          $response = Http::withHeaders([
                  'X-Internal-Api-Key' => config('services.ai.secret'),
              ])
              ->timeout(15)
              ->post(config('services.ai.url') . '/chat', [
                  'message' => $message,
              ]);

          if ($response->successful()) {
              return [
                  'reply' => $response->json('reply', 'Sorry, I did not get a response.'),
                  'escalate' => $response->json('escalate', false),
              ];
          }

          Log::warning('AI service returned an error', [
              'status' => $response->status(),
              'body' => $response->body(),
          ]);

          return [
              'reply' => "Sorry, I'm having trouble answering right now. Please try again.",
              'escalate' => true,
          ];
      } catch (ConnectionException $e) {
          Log::error('AI service connection failed', ['error' => $e->getMessage()]);

          return [
              'reply' => "Sorry, I'm having trouble connecting right now. Please try again shortly.",
              'escalate' => true,
          ];
      }
    }

    public function ingest(int $documentId, string $text): bool
    {
      try {
          $response = Http::withHeaders([
                  'X-Internal-Api-Key' => config('services.ai.secret'),
              ])
              ->timeout(30)
              ->post(config('services.ai.url') . '/ingest', [
                  'document_id' => $documentId,
                  'text' => $text,
              ]);

          if (! $response->successful()) {
              Log::warning('Document ingest failed', [
                  'document_id' => $documentId,
                  'status' => $response->status(),
              ]);
          }

          return $response->successful();
      } catch (ConnectionException $e) {
          Log::error('Document ingest connection failed', ['error' => $e->getMessage()]);
          return false;
      }
    }
}