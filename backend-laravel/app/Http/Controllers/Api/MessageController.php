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

        if (is_null($ticket->assigned_agent_id)) {
            $ticket->assigned_agent_id = $request->user()->id;
        }

        if ($ticket->status === 'escalated') {
            $ticket->update(['status' => 'in_progress']);
        }

        $ticket->save();

        return response()->json($message, 201);
    }
}
