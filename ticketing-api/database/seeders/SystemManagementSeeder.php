<?php

namespace Database\Seeders;


use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class SystemManagementSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            'systems.view',
            'systems.create',
            'systems.update',
            'systems.delete',

            'system_categories.create',
            'system_categories.update',
            'system_categories.delete',

            'systems.members.view',
            'systems.members.assign',
            'systems.heads.assign',
        ];

        foreach ($permissions as $name) {
            Permission::findOrCreate($name, 'web');
        }

        // Required role for System Heads.
        // This role does not receive unrelated
        // management permissions automatically.
        Role::firstOrCreate([
            'name' => 'System Head',
            'guard_name' => 'web',
        ]);

        app(PermissionRegistrar::class)
            ->forgetCachedPermissions();
    }
}
