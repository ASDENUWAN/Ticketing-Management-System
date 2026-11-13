<?php

namespace Tests\Feature;


use App\Models\User;
use Database\Seeders\AccessControlSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class SecurityRegressionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(AccessControlSeeder::class);

        Permission::findOrCreate(
            'profile.update',
            'web'
        );

        app(PermissionRegistrar::class)
            ->forgetCachedPermissions();
    }

    private function createUser(string $username): User
    {
        return User::create([
            'username' => $username,
            'password' => 'TestPassword123!Secure',
        ]);
    }

    private function superAdmin(): User
    {
        $user = $this->createUser('security_root');
        $user->assignRole('Super Admin');

        return $user;
    }

    /**
     * Unauthenticated requests are rejected.
     */
    public function test_guest_cannot_access_users(): void
    {
        $this->getJson('/api/users')
            ->assertUnauthorized();
    }

    /**
     * Being logged in is not enough to manage users.
     */
    public function test_normal_user_cannot_create_users(): void
    {
        $user = $this->createUser('ordinary_user');

        $this->actingAs($user, 'web')
            ->postJson('/api/users', [
                'username' => 'unauthorized_account',
                'password' => 'StrongPassword123!',
                'password_confirmation' =>
                'StrongPassword123!',
            ])
            ->assertForbidden();

        $this->assertDatabaseMissing('users', [
            'username' => 'unauthorized_account',
        ]);
    }

    /**
     * Role-inherited permissions enable access.
     */
    public function test_role_permission_grants_access(): void
    {
        $role = Role::create([
            'name' => 'Audit Viewers',
            'guard_name' => 'web',
        ]);

        $role->givePermissionTo('users.view');

        $user = $this->createUser('role_viewer');
        $user->assignRole($role);

        $this->actingAs($user, 'web')
            ->getJson('/api/users')
            ->assertOk();
    }

    /**
     * Removed permissions must no longer authorize.
     */
    public function test_revoked_role_permission_denies_access(): void
    {
        $role = Role::create([
            'name' => 'Audit Limited',
            'guard_name' => 'web',
        ]);

        $role->givePermissionTo('users.view');

        $user = $this->createUser('revoked_viewer');
        $user->assignRole($role);

        $role->revokePermissionTo('users.view');

        $this->actingAs($user->fresh(), 'web')
            ->getJson('/api/users')
            ->assertForbidden();
    }

    /**
     * Direct permissions authorize independently.
     */
    public function test_direct_permission_grants_access(): void
    {
        $user = $this->createUser('direct_viewer');

        $user->givePermissionTo('roles.view');

        $this->actingAs($user, 'web')
            ->getJson('/api/roles')
            ->assertOk();
    }

    /**
     * Admin cannot grant more permissions
     * than they already possess.
     */
    public function test_admin_cannot_grant_unowned_permission(): void
    {
        $role = Role::create([
            'name' => 'Security Limited Admin',
            'guard_name' => 'web',
        ]);

        $role->givePermissionTo([
            'users.update',
            'permissions.assign',
        ]);

        $admin = $this->createUser('limited_admin');
        $admin->assignRole($role);

        $target = $this->createUser('limited_target');

        $permission = Permission::findOrCreate(
            'tickets.delete',
            'web'
        );

        $this->actingAs($admin, 'web')
            ->putJson(
                "/api/users/{$target->id}/permissions",
                [
                    'permission_ids' => [
                        $permission->id,
                    ],
                ]
            )
            ->assertForbidden();

        $this->assertFalse(
            $target->fresh()->hasDirectPermission(
                $permission
            )
        );
    }

    /**
     * General user APIs cannot assign Super Admin.
     */
    public function test_super_admin_role_cannot_be_assigned(): void
    {
        $admin = $this->superAdmin();
        $target = $this->createUser('promotion_target');

        $protectedRole = Role::findByName(
            'Super Admin',
            'web'
        );

        $this->actingAs($admin, 'web')
            ->putJson(
                "/api/users/{$target->id}/roles",
                [
                    'role_ids' => [
                        $protectedRole->id,
                    ],
                ]
            )
            ->assertForbidden();

        $this->assertFalse(
            $target->fresh()->hasRole(
                'Super Admin',
                'web'
            )
        );
    }

    /**
     * Role-inherited profile permission cannot
     * bypass an account-level restriction.
     */
    public function test_disabled_profile_cannot_be_edited(): void
    {
        $role = Role::create([
            'name' => 'Security Profile Editors',
            'guard_name' => 'web',
        ]);

        $role->givePermissionTo('profile.update');

        $user = $this->createUser('restricted_profile');
        $user->assignRole($role);

        $user->profile_edit_enabled = false;
        $user->save();

        $this->actingAs($user, 'web')
            ->patchJson('/api/profile', [
                'name' => 'Unauthorized Change',
            ])
            ->assertForbidden();

        $this->assertSame(
            'restricted_profile',
            $user->fresh()->name
        );
    }

    /**
     * Only Super Admin can change another user's
     * account-level profile editing switch.
     */
    public function test_normal_admin_cannot_disable_profile(): void
    {
        $role = Role::create([
            'name' => 'Security User Editors',
            'guard_name' => 'web',
        ]);

        $role->givePermissionTo('users.update');

        $admin = $this->createUser('user_editor');
        $admin->assignRole($role);

        $target = $this->createUser('profile_target');

        $this->actingAs($admin, 'web')
            ->patchJson(
                "/api/users/{$target->id}/profile-edit",
                ['enabled' => false]
            )
            ->assertForbidden();

        $this->assertTrue(
            $target->fresh()->profile_edit_enabled
        );
    }

    /**
     * Super Admin can disable self-service editing.
     */
    public function test_super_admin_can_disable_profile(): void
    {
        $admin = $this->superAdmin();
        $target = $this->createUser('disable_target');

        $target->givePermissionTo('profile.update');

        $this->actingAs($admin, 'web')
            ->patchJson(
                "/api/users/{$target->id}/profile-edit",
                ['enabled' => false]
            )
            ->assertOk()
            ->assertJsonPath(
                'data.can_edit_profile',
                false
            );

        $this->assertFalse(
            $target->fresh()->canEditOwnProfile()
        );
    }

    /**
     * Username cannot be modified through the
     * personal profile endpoint.
     */
    public function test_username_is_permanent(): void
    {
        $user = $this->createUser('permanent_username');

        $user->givePermissionTo('profile.update');

        $this->actingAs($user, 'web')
            ->patchJson('/api/profile', [
                'username' => 'changed_username',
            ])
            ->assertUnprocessable();

        $this->assertSame(
            'permanent_username',
            $user->fresh()->username
        );
    }

    /**
     * Verify that user API response correctly
     * distinguishes inherited and direct access.
     */
    public function test_user_response_separates_permissions(): void
    {
        $admin = $this->superAdmin();
        $target = $this->createUser('access_check');

        $role = Role::create([
            'name' => 'Security Support Readers',
            'guard_name' => 'web',
        ]);

        $role->givePermissionTo('users.view');
        $target->assignRole($role);

        $target->givePermissionTo('roles.view');

        $this->actingAs($admin, 'web')
            ->getJson("/api/users/{$target->id}")
            ->assertOk()
            ->assertJsonPath(
                'data.roles.0.name',
                'Security Support Readers'
            )
            ->assertJsonPath(
                'data.roles.0.permissions.0.name',
                'users.view'
            )
            ->assertJsonPath(
                'data.direct_permissions.0',
                'roles.view'
            )
            ->assertJsonPath(
                'data.inherited_permissions.0',
                'users.view'
            );
    }
}
