<?php

namespace Database\Seeders;


use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

class ProfileUpdatePermissionSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)
            ->forgetCachedPermissions();

        $permission = Permission::firstOrCreate([
            'name' => 'profile.update',
            'guard_name' => 'web',
        ]);

        // Initial rollout: grant personal profile
        // editing to existing normal users.
        //
        // Super Admin already has this authorization
        // through the Gate::before callback.
        User::query()
            ->whereDoesntHave(
                'roles',
                fn($query) => $query
                    ->where('name', 'Super Admin')
                    ->where('guard_name', 'web')
            )
            ->chunkById(100, function ($users) use ($permission) {
                foreach ($users as $user) {
                    if (! $user->hasDirectPermission($permission)) {
                        $user->givePermissionTo($permission);
                    }
                }
            });

        app(PermissionRegistrar::class)
            ->forgetCachedPermissions();
    }
}
