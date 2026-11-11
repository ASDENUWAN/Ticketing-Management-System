<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\AccessControlSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class UserManagementApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(AccessControlSeeder::class);
    }

    private function user(string $username): User
    {
        return User::create([
            'username' => $username,
            'password' => 'TestPassword123!Secure',
        ]);
    }

    private function superAdmin(): User
    {
        $user = $this->user('super_admin_test');
        $user->assignRole('Super Admin');

        return $user;
    }

    public function test_super_admin_can_create_user(): void
    {
        $this->actingAs($this->superAdmin(), 'web');

        $this->postJson('/api/users', [
            'username' => 'support01',
            'email' => 'support@example.com',
            'password' => 'StrongPassword123!',
            'password_confirmation' => 'StrongPassword123!',
        ])
            ->assertCreated()
            ->assertJsonPath('data.username', 'support01')
            ->assertJsonPath('data.name', 'support01');

        $user = User::where(
            'username',
            'support01'
        )->firstOrFail();

        $this->assertTrue(
            Hash::check(
                'StrongPassword123!',
                $user->password
            )
        );
    }

    public function test_normal_user_cannot_create_user(): void
    {
        $this->actingAs(
            $this->user('normal01'),
            'web'
        );

        $this->postJson('/api/users', [
            'username' => 'another_user',
            'password' => 'StrongPassword123!',
            'password_confirmation' => 'StrongPassword123!',
        ])->assertForbidden();
    }

    public function test_super_admin_can_assign_roles(): void
    {
        $admin = $this->superAdmin();
        $target = $this->user('support02');

        $role = Role::create([
            'name' => 'Support Agent',
            'guard_name' => 'web',
        ]);

        $this->actingAs($admin, 'web')
            ->putJson("/api/users/{$target->id}/roles", [
                'role_ids' => [$role->id],
            ])
            ->assertOk();

        $this->assertTrue(
            $target->fresh()->hasRole('Support Agent')
        );
    }

    public function test_super_admin_can_assign_direct_permissions(): void
    {
        $admin = $this->superAdmin();
        $target = $this->user('support03');

        $permission = Permission::create([
            'name' => 'tickets.export',
            'guard_name' => 'web',
        ]);

        $this->actingAs($admin, 'web')
            ->putJson(
                "/api/users/{$target->id}/permissions",
                [
                    'permission_ids' => [
                        $permission->id
                    ],
                ]
            )
            ->assertOk();

        $this->assertTrue(
            $target->fresh()
                ->hasDirectPermission('tickets.export')
        );
    }

    public function test_admin_cannot_grant_unowned_roles(): void
    {
        $admin = $this->user('limited_admin');

        $role = Role::create([
            'name' => 'Limited Admin',
            'guard_name' => 'web',
        ]);

        $role->givePermissionTo([
            'users.update',
            'roles.assign',
        ]);

        $admin->assignRole($role);

        $privilegedRole = Role::create([
            'name' => 'Privileged Agent',
            'guard_name' => 'web',
        ]);

        $privilegedRole->givePermissionTo('users.delete');

        $target = $this->user('target01');

        $this->actingAs($admin, 'web')
            ->putJson(
                "/api/users/{$target->id}/roles",
                [
                    'role_ids' => [
                        $privilegedRole->id
                    ],
                ]
            )
            ->assertForbidden();

        $this->assertFalse(
            $target->fresh()->hasRole('Privileged Agent')
        );
    }

    public function test_super_admin_role_cannot_be_assigned(): void
    {
        $admin = $this->superAdmin();
        $target = $this->user('target02');

        $role = Role::findByName(
            'Super Admin',
            'web'
        );

        $this->actingAs($admin, 'web')
            ->putJson(
                "/api/users/{$target->id}/roles",
                [
                    'role_ids' => [$role->id],
                ]
            )
            ->assertForbidden();

        $this->assertFalse(
            $target->fresh()->hasRole('Super Admin')
        );
    }

    public function test_username_cannot_be_changed(): void
    {
        $admin = $this->superAdmin();
        $target = $this->user('original_name');

        $this->actingAs($admin, 'web')
            ->patchJson(
                "/api/users/{$target->id}",
                [
                    'username' => 'changed_name',
                ]
            )
            ->assertUnprocessable();

        $this->assertSame(
            'original_name',
            $target->fresh()->username
        );
    }

    public function test_user_can_update_own_name(): void
    {
        $user = $this->user('profile01');

        $this->actingAs($user, 'web')
            ->patchJson('/api/profile', [
                'name' => 'New Display Name',
            ])
            ->assertOk()
            ->assertJsonPath(
                'user.name',
                'New Display Name'
            );

        $this->assertSame(
            'profile01',
            $user->fresh()->username
        );
    }


    public function test_super_admin_account_is_protected(): void
    {
        $admin = $this->superAdmin();

        $this->actingAs($admin, 'web')
            ->deleteJson("/api/users/{$admin->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('users', [
            'id' => $admin->id,
        ]);
    }
}
