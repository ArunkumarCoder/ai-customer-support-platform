<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\ChatMessageRequest;
use App\Jobs\AnalyzeSentimentJob;
use App\Models\Message;
use App\Models\Ticket;
use App\Services\AiServiceClient;

class ChatController extends Controller
{
    public function __construct(private AiServiceClient $aiServiceClient)
    {
    }

    public function store(ChatMessageRequest $request)
    {
        $validated = $request->validated();

        $ticket = Ticket::where('visitor_id', $validated['visitor_id'])
            ->whereNotIn('status', ['resolved', 'closed'])
            ->latest()
            ->first();

        if (! $ticket) {
            $ticket = Ticket::create([
                'visitor_id' => $validated['visitor_id'],
                'status' => 'open',
                'priority' => 'normal',
            ]);
        }

        $customerMessage = Message::create([
            'ticket_id' => $ticket->id,
            'sender' => 'customer',
            'body' => $validated['message'],
        ]);

        AnalyzeSentimentJob::dispatch($customerMessage);

        $aiResponse = $this->aiServiceClient->chat($validated['message']);

        Message::create([
            'ticket_id' => $ticket->id,
            'sender' => 'bot',
            'body' => $aiResponse['reply'],
        ]);

        if ($aiResponse['escalate']) {
            $ticket->update(['status' => 'escalated']);
        }

        return response()->json([
            'reply' => $aiResponse['reply'],
            'ticket_id' => $ticket->id,
            'escalated' => $aiResponse['escalate'],
        ]);
    }
}
