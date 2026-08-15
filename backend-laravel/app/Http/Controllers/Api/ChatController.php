<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AiServiceClient;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    public function __construct(private AiServiceClient $aiServiceClient)
    {
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'message' => 'required|string|max:2000',
        ]);

        $reply = $this->aiServiceClient->chat($validated['message']);

        return response()->json(['reply' => $reply]);
    }
}