<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TicketAttachment extends Model
{
    protected $table = 'ticket_attachments';

    protected $fillable = [
        'ticket_id',
        'original_name',
        'file_path',
        'disk',
        'mime_type',
        'file_size',
    ];

    protected function casts(): array
    {
        return [
            'ticket_id' => 'integer',
            'file_size' => 'integer',
        ];
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(
            Ticket::class,
            'ticket_id'
        );
    }
}
