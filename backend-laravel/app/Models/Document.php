<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Document extends Model
{
    protected $fillable = [
        'title',
        'source_file',
        'uploaded_by',
        'content',
    ];

    // Hidden from the default index() listing (which would otherwise ship
    // every document's full text on a page that only needs metadata for a
    // table row) — show() re-adds it explicitly for the single-document
    // view where it's actually needed.
    protected $hidden = [
        'content',
    ];

    // Named "uploader", not "uploadedBy" — a relation method that Eloquent
    // serializes to "uploaded_by" would collide with (and silently overwrite)
    // the plain uploaded_by foreign-key column already on this model.
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(Agent::class, 'uploaded_by');
    }
}
