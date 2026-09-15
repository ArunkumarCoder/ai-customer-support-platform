<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreDocumentRequest;
use App\Models\Document;
use App\Jobs\IngestDocumentJob;
use Illuminate\Support\Facades\Storage;

class DocumentController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return response()->json(Document::with('uploader')->latest()->get());
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreDocumentRequest $request)
    {
        // Temporary kill-switch (data/token limitations) — checked here rather
        // than in StoreDocumentRequest::authorize() to keep that method's
        // existing "auth is handled by middleware, not FormRequest" convention
        // intact. One consequence: a malformed request still 422s before
        // reaching this check rather than getting this 403 — acceptable since
        // the frontend never renders a working submit button while disabled,
        // so this path is only reachable via a direct API call anyway.
        if (! config('services.documents.uploads_enabled')) {
            return response()->json([
                'message' => 'Document uploads are temporarily disabled.',
            ], 403);
        }

        $validated = $request->validated();

        $path = $request->file('file')->store('documents');

        $document = Document::create([
            'title' => $validated['title'],
            'source_file' => $path,
            'uploaded_by' => $request->user()->id,
        ]);

        IngestDocumentJob::dispatch($document);

        return response()->json($document, 201);
    }

    /**
     * Display the specified resource, including its raw text content —
     * every document accepted by StoreDocumentRequest is .txt/.md
     * (mimes:txt,md), so there is no binary format to render here.
     */
    public function show(Document $document)
    {
        $document->load('uploader');

        // Checked explicitly rather than catching a "file not found" exception
        // from get() — Storage::fake()'s test double doesn't throw the same
        // way the real local disk does, so exists()-first is both simpler
        // and consistent across environments.
        $contentAvailable = Storage::disk('local')->exists($document->source_file);
        $content = $contentAvailable ? Storage::disk('local')->get($document->source_file) : null;

        return response()->json(array_merge($document->toArray(), [
            'content' => $content,
            'content_available' => $contentAvailable,
        ]));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}
