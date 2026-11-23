<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ticket extends Model
{
    protected $table = 'tickets';

    protected $fillable = [
        'requester_id',
        'ticket_type_id',
        'priority_id',
        'status_id',
        'system_id',
        'system_category_id',
        'description',
    ];

    protected function casts(): array
    {
        return [
            'requester_id' => 'integer',
            'ticket_type_id' => 'integer',
            'priority_id' => 'integer',
            'status_id' => 'integer',
            'system_id' => 'integer',
            'system_category_id' => 'integer',
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Requester
    |--------------------------------------------------------------------------
    */

    public function requester(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'requester_id'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Ticket type (Personal / Change Request)
    |--------------------------------------------------------------------------
    */

    public function ticketType(): BelongsTo
    {
        return $this->belongsTo(
            Category::class,
            'ticket_type_id'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Ticket priority
    |--------------------------------------------------------------------------
    */

    public function priority(): BelongsTo
    {
        return $this->belongsTo(
            Category::class,
            'priority_id'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Ticket status
    |--------------------------------------------------------------------------
    */

    public function status(): BelongsTo
    {
        return $this->belongsTo(
            Category::class,
            'status_id'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Selected system
    |--------------------------------------------------------------------------
    */

    public function system(): BelongsTo
    {
        return $this->belongsTo(
            System::class,
            'system_id'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Optional system category
    |--------------------------------------------------------------------------
    */

    public function systemCategory(): BelongsTo
    {
        return $this->belongsTo(
            SystemCategory::class,
            'system_category_id'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Initial ticket attachments
    |--------------------------------------------------------------------------
    */

    public function attachments(): HasMany
    {
        return $this->hasMany(
            TicketAttachment::class,
            'ticket_id'
        );
    }
}
