<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AiServiceClient
{
    public function chat(string $message): string
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
                return $response->json('reply', 'Sorry, I did not get a response.');
            }

            Log::warning('AI service returned an error', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return "Sorry, I'm having trouble answering right now. Please try again.";
        } catch (ConnectionException $e) {
            Log::error('AI service connection failed', ['error' => $e->getMessage()]);

            return "Sorry, I'm having trouble connecting right now. Please try again shortly.";
        }
    }
}