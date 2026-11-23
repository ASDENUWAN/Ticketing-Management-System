<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

use Illuminate\Database\Eloquent\Relations\BelongsToMany;

use Illuminate\Database\Eloquent\Relations\HasMany;

use LogicException;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, HasRoles, Notifiable;

    protected string $guard_name = 'web';

    protected $fillable = [
        'username',
        'name',
        'email',
        'contact_no',
        'password',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'profile_edit_enabled' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (User $user): void {
            if (blank($user->name)) {
                $user->name = $user->username;
            }
        });

        static::updating(function (User $user): void {
            if ($user->isDirty('username')) {
                throw new LogicException(
                    'Username cannot be changed after account creation.'
                );
            }
        });
    }

    /**
     * Check both the permission and
     * the account-specific edit switch.
     */
    public function canEditOwnProfile(): bool
    {
        return (bool) $this->profile_edit_enabled
            && $this->can('profile.update');
    }


    /**
     * All systems assigned to this user.
     */
    public function systems(): BelongsToMany
    {
        return $this->belongsToMany(
            System::class,
            'system_user'
        )
            ->withPivot('is_head')
            ->withTimestamps();
    }

    /**
     * Systems for which this user is
     * specifically designated as a head.
     *
     * Having this relationship alone does not
     * grant the global System Head role.
     */
    public function headedSystems(): BelongsToMany
    {
        return $this->belongsToMany(
            System::class,
            'system_user'
        )
            ->withPivot('is_head')
            ->wherePivot('is_head', true)
            ->withTimestamps();
    }


    /**
     * Tickets submitted by this user.
     */
    public function requestedTickets(): HasMany
    {
        return $this->hasMany(
            Ticket::class,
            'requester_id'
        );
    }
}
