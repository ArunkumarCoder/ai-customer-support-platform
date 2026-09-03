<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Ticket extends Model
{
    protected $fillable = [
        'user_id',
        'visitor_id',
        'status',
        'priority',
        'sentiment_summary',
        'assigned_agent_id',
        'summary',
    ];

    public function messages()
    {
        return $this->hasMany(Message::class);
    }
}
