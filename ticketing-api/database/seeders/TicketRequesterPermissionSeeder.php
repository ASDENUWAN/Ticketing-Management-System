<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class TicketRequesterPermissionSeeder extends Seeder
{
    public function run(): void
    {
        $permission = Permission::findOrCreate(
            'tickets.change_request.create',
            'web'
        );

        $role = Role::findOrCreate(
            'System Head',
            'web'
        );

        // Grant the capability to the existing
        // System Head role.
        //
        // This does NOT grant access to every system.
        // Laravel also checks the system_user
        // assignment and is_head flag.
        if (! $role->hasPermissionTo($permission)) {
            $role->givePermissionTo($permission);
        }

        app(PermissionRegistrar::class)
            ->forgetCachedPermissions();
    }
}
