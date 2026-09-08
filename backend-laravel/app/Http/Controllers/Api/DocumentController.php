<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreDocumentRequest;
use App\Models\Document;
use App\Jobs\IngestDocumentJob;

class DocumentController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreDocumentRequest $request)
    {
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
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
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
