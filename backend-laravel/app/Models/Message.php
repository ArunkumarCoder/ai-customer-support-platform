<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Message extends Model
{
    protected $fillable = [
        'ticket_id',
        'sender',
        'body',
        'sentiment_label',
        'sentiment_score',
    ];

    public function ticket()
    {
        return $this->belongsTo(Ticket::class);
    }
}
