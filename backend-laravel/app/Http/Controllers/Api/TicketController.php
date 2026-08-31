<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
use Illuminate\Http\Request;

class TicketController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Ticket::query();

        if ($request->user()->role !== 'admin') {
            $query->where(function ($q) use ($request) {
                $q->whereNull('assigned_agent_id')
                  ->orWhere('assigned_agent_id', $request->user()->id);
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }
        if ($request->filled('priority')) {
            $query->where('priority', $request->query('priority'));
        }
        if ($request->filled('sentiment')) {
            $query->where('sentiment_summary', $request->query('sentiment'));
        }

        return response()->json($query->latest()->get());
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(Ticket $ticket)
    {
        $ticket->load(['messages' => fn ($q) => $q->orderBy('created_at')]);

        return $ticket;
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Ticket $ticket)
    {
        $validated = $request->validate([
            'status' => 'required|string|in:open,in_progress,escalated,resolved,closed',
        ]);

        $ticket->update($validated);

        return $ticket;
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}
