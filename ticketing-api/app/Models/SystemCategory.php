<?php

namespace App\Models;


use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SystemCategory extends Model
{
    protected $fillable = [
        'system_id',
        'code',
        'name',
        'description',
        'sort_order',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'system_id' => 'integer',
            'sort_order' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function system(): BelongsTo
    {
        return $this->belongsTo(
            System::class
        );
    }


    public function tickets(): HasMany
    {
        return $this->hasMany(
            Ticket::class,
            'system_category_id'
        );
    }
}
