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
    ];

    // Named "uploader", not "uploadedBy" — a relation method that Eloquent
    // serializes to "uploaded_by" would collide with (and silently overwrite)
    // the plain uploaded_by foreign-key column already on this model.
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(Agent::class, 'uploaded_by');
    }
}
