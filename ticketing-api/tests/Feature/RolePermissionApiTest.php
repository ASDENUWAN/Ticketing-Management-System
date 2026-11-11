<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\AccessControlSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RolePermissionApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(AccessControlSeeder::class);
    }

    private function superAdmin(): User
    {
        $user = User::create([
            'username' => 'root_test',
            'password' => 'TestPassword123!Secure',
        ]);

        $user->assignRole('Super Admin');

        return $user;
    }

    public function test_guest_cannot_view_roles(): void
    {
        $this->getJson('/api/roles')
            ->assertUnauthorized();
    }

    public function test_super_admin_can_create_and_assign_role_permissions(): void
    {
        $this->actingAs($this->superAdmin(), 'web');

        $permissionId = $this->postJson('/api/permissions', [
            'name' => 'tickets.view',
        ])
            ->assertCreated()
            ->json('data.id');

        $roleId = $this->postJson('/api/roles', [
            'name' => 'Support Agent',
        ])
            ->assertCreated()
            ->json('data.id');

        $this->putJson(
            "/api/roles/{$roleId}/permissions",
            [
                'permission_ids' => [$permissionId],
            ]
        )
            ->assertOk()
            ->assertJsonPath(
                'data.permissions.0.name',
                'tickets.view'
            );

        $this->assertTrue(
            Role::findOrFail($roleId)
                ->hasPermissionTo('tickets.view')
        );
    }

    public function test_super_admin_role_cannot_be_changed_or_deleted(): void
    {
        $this->actingAs($this->superAdmin(), 'web');

        $role = Role::findByName(
            'Super Admin',
            'web'
        );

        $this->patchJson("/api/roles/{$role->id}", [
            'name' => 'Another Admin',
        ])->assertForbidden();

        $this->deleteJson("/api/roles/{$role->id}")
            ->assertForbidden();
    }

    public function test_unprivileged_user_cannot_create_roles(): void
    {
        $user = User::create([
            'username' => 'regular_test',
            'password' => 'TestPassword123!Secure',
        ]);

        $this->actingAs($user, 'web')
            ->postJson('/api/roles', [
                'name' => 'New Role',
            ])
            ->assertForbidden();
    }

    public function test_admin_cannot_grant_permissions_they_do_not_have(): void
    {
        $role = Role::create([
            'name' => 'Admin Test',
            'guard_name' => 'web',
        ]);

        $role->givePermissionTo([
            'roles.update',
            'permissions.assign',
        ]);

        $user = User::create([
            'username' => 'admin_test',
            'password' => 'TestPassword123!Secure',
        ]);

        $user->assignRole($role);

        $targetRole = Role::create([
            'name' => 'Team Member',
            'guard_name' => 'web',
        ]);

        $unknownPermission = Permission::create([
            'name' => 'tickets.delete',
            'guard_name' => 'web',
        ]);

        $this->actingAs($user, 'web')
            ->putJson(
                "/api/roles/{$targetRole->id}/permissions",
                [
                    'permission_ids' => [
                        $unknownPermission->id
                    ],
                ]
            )
            ->assertForbidden();

        $this->assertFalse(
            $targetRole->fresh()
                ->hasPermissionTo('tickets.delete')
        );
    }

    public function test_core_permissions_cannot_be_deleted(): void
    {
        $this->actingAs($this->superAdmin(), 'web');

        $permission = Permission::findByName(
            'users.create',
            'web'
        );

        $this->deleteJson(
            "/api/permissions/{$permission->id}"
        )->assertForbidden();
    }
}
