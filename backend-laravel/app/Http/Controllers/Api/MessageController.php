<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Message;
use App\Models\Ticket;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    public function store(Request $request, Ticket $ticket)
    {
        $validated = $request->validate([
            'body' => 'required|string|max:2000',
        ]);

        $message = Message::create([
            'ticket_id' => $ticket->id,
            'sender' => 'agent',
            'body' => $validated['body'],
        ]);

        if ($ticket->status === 'escalated') {
            $ticket->update(['status' => 'in_progress']);
        }

        return response()->json($message, 201);
    }
}
